import React, {
  useEffect,
  useRef,
  useImperativeHandle,
  useState,
  useCallback,
} from "react";
import { View } from "react-native";

const TILE_URL = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
const TILE_ATTR =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

function regionToLatLng(r: any) {
  return { lat: r.latitude, lng: r.longitude };
}

function latLngToRegion(lat: number, lng: number, zoom: number) {
  const delta = 360 / Math.pow(2, zoom) / 4;
  return {
    latitude: lat,
    longitude: lng,
    latitudeDelta: delta,
    longitudeDelta: delta,
  };
}

function deltaToZoom(latDelta: number): number {
  return Math.round(Math.log2(360 / (latDelta || 0.035)) + 1);
}

let leafletLoaded: Promise<void> | null = null;
function ensureLeaflet(): Promise<void> {
  if (leafletLoaded) return leafletLoaded;
  leafletLoaded = new Promise((resolve) => {
    if ((window as any).L) {
      resolve();
      return;
    }
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    document.head.appendChild(link);

    const script = document.createElement("script");
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.onload = () => resolve();
    document.head.appendChild(script);
  });
  return leafletLoaded;
}

export const MapViewWrapper = React.forwardRef<any, any>(
  (
    {
      style,
      initialRegion,
      region,
      onRegionChangeComplete,
      onPress,
      children,
      showsUserLocation,
      ...rest
    },
    ref,
  ) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<any>(null);
    const markersLayerRef = useRef<any>(null);
    const [ready, setReady] = useState(false);
    const suppressMoveEnd = useRef(false);

    const startRegion = region || initialRegion;

    useImperativeHandle(ref, () => ({
      animateToRegion: (r: any, _duration?: number) => {
        const m = mapInstanceRef.current;
        if (!m) return;
        suppressMoveEnd.current = true;
        m.flyTo([r.latitude, r.longitude], deltaToZoom(r.latitudeDelta), {
          duration: 0.6,
        });
        setTimeout(() => {
          suppressMoveEnd.current = false;
        }, 700);
      },
    }));

    useEffect(() => {
      let cancelled = false;
      ensureLeaflet().then(() => {
        if (cancelled || !containerRef.current) return;
        const L = (window as any).L;
        if (mapInstanceRef.current) return;

        const zoom = startRegion
          ? deltaToZoom(startRegion.latitudeDelta)
          : 14;
        const center = startRegion
          ? [startRegion.latitude, startRegion.longitude]
          : [32.0853, 34.7818];

        const map = L.map(containerRef.current, {
          center,
          zoom,
          zoomControl: false,
        });

        L.tileLayer(TILE_URL, { attribution: TILE_ATTR, maxZoom: 19 }).addTo(
          map,
        );
        L.control.zoom({ position: "bottomright" }).addTo(map);

        markersLayerRef.current = L.layerGroup().addTo(map);

        map.on("click", (e: any) => {
          onPress?.({
            nativeEvent: {
              coordinate: { latitude: e.latlng.lat, longitude: e.latlng.lng },
            },
          });
        });

        map.on("moveend", () => {
          if (suppressMoveEnd.current) return;
          const c = map.getCenter();
          const z = map.getZoom();
          onRegionChangeComplete?.(latLngToRegion(c.lat, c.lng, z));
        });

        if (showsUserLocation && navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              const { latitude, longitude } = pos.coords;
              L.circleMarker([latitude, longitude], {
                radius: 8,
                fillColor: "#4285F4",
                fillOpacity: 1,
                color: "#fff",
                weight: 2,
              }).addTo(map);
            },
            () => {},
          );
        }

        mapInstanceRef.current = map;
        setReady(true);
      });

      return () => {
        cancelled = true;
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
      if (!ready || !region) return;
      const map = mapInstanceRef.current;
      if (!map) return;
      const center = map.getCenter();
      const dist =
        Math.abs(center.lat - region.latitude) +
        Math.abs(center.lng - region.longitude);
      if (dist > 0.0001) {
        suppressMoveEnd.current = true;
        map.setView(
          [region.latitude, region.longitude],
          deltaToZoom(region.latitudeDelta),
          { animate: false },
        );
        setTimeout(() => {
          suppressMoveEnd.current = false;
        }, 100);
      }
    }, [ready, region]);

    const syncMarkers = useCallback(() => {
      if (!ready) return;
      const L = (window as any).L;
      const layer = markersLayerRef.current;
      if (!layer || !L) return;
      layer.clearLayers();

      React.Children.forEach(children, (child: any) => {
        if (!child?.props?.coordinate) return;
        const { latitude, longitude } = child.props.coordinate;
        const color = child.props.pinColor || "#dc2626";

        const icon = L.divIcon({
          className: "",
          html: `<div style="
            width:28px;height:28px;border-radius:50%;
            background:${color};border:3px solid #fff;
            box-shadow:0 2px 6px rgba(0,0,0,0.3);
            display:flex;align-items:center;justify-content:center;
            cursor:pointer;
          "></div>`,
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        });

        const hasChildren =
          child.props.children &&
          React.Children.count(child.props.children) > 0;
        let markerIcon = icon;

        if (hasChildren) {
          const wrapper = document.createElement("div");
          wrapper.style.cssText =
            "position:relative;cursor:pointer;pointer-events:auto;";
          const inner = child.props.children;
          const label =
            inner?.props?.price != null ? `₪${inner.props.price}` : "";
          const active = inner?.props?.active;
          wrapper.innerHTML = `<div style="
            background:${active ? "#001a5a" : "#fff"};
            color:${active ? "#fff" : "#001a5a"};
            font-weight:800;font-size:12px;
            padding:4px 10px;border-radius:20px;
            box-shadow:0 2px 8px rgba(0,0,0,0.25);
            white-space:nowrap;border:2px solid ${active ? "#fff" : "#001a5a"};
          ">${label}</div>`;
          markerIcon = L.divIcon({
            className: "",
            html: wrapper.outerHTML,
            iconSize: [60, 30],
            iconAnchor: [30, 15],
          });
        }

        const marker = L.marker([latitude, longitude], {
          icon: markerIcon,
        }).addTo(layer);

        if (child.props.onPress) {
          marker.on("click", () => child.props.onPress());
        }
      });
    }, [ready, children]);

    useEffect(() => {
      syncMarkers();
    }, [syncMarkers]);

    return (
      <View style={[{ flex: 1, position: "relative" }, style]}>
        <div
          ref={containerRef}
          style={{
            width: "100%",
            height: "100%",
            position: "absolute",
            top: 0,
            left: 0,
          }}
        />
      </View>
    );
  },
);

export function MarkerWrapper(_props: any) {
  return null;
}
