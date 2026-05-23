import React, { memo, useCallback, useState, type ReactNode } from "react";
import { View, Image, StyleSheet, Text, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { MarkerWrapper } from "../../components/MapViewWrapper";
import type { MapPinDto } from "../../types/api";

/** Toggle to preview cluster-style Ionicons paws instead of PNG assets. */
const PREVIEW_IONICON_PAW_MARKERS = false;

const PAW_PROVIDER_IMAGE = require("../../../assets/map-marker-provider.png");
const PAW_SELECTED_IMAGE = require("../../../assets/map-marker-provider-selected.png");

const IS_ANDROID = Platform.OS === "android";

const BRAND_PRIMARY = "#001a5a";
const PAW_ICON_COLOR = "#1a1a2e";

/* ── Constants ──────────────────────────────────────────────────────────── */

export const OFFSCREEN_COORDINATE = { latitude: -90, longitude: 0 } as const;

const ANCHOR_PIN_TIP = { x: 0.5, y: 1 } as const;
const ANCHOR_CENTER = { x: 0.5, y: 0.5 } as const;

const PAW_SIZE = 45;
const PAW_SELECTED_SIZE = 45;

const MARKER_Z = 1;
const SELECTED_Z = 1000;

const CLUSTER_OUTER = 52;
const CLUSTER_INNER = 40;
const CLUSTER_ICON = 20;

const IONICON_PAW_OUTER = PAW_SIZE;
const IONICON_PAW_INNER = 36;
const IONICON_PAW_ICON = 22;
const IONICON_SELECTED_OUTER = PAW_SELECTED_SIZE;
const IONICON_SELECTED_INNER = 38;
const IONICON_SELECTED_ICON = 24;

/* ── Image preload (iOS red-pin avoidance) ──────────────────────────────────
 *
 * iOS: After the first paw onLoad, later markers start with imageLoaded=true
 * so tracksViewChanges stays false (avoids MapKit red-balloon flash).
 *
 * Android: Each marker still waits for its own onLoad before freezing the
 * snapshot (tracksViewChanges=false); empty snapshot if frozen too early.
 *
 * ────────────────────────────────────────────────────────────────────────── */

let pawPreloaded = false;
let selectedPreloaded = false;

/* ── Types ──────────────────────────────────────────────────────────────── */

export type MarkerPoolSlot = {
  kind: "single" | "cluster" | "offscreen";
  coordinate: { latitude: number; longitude: number };
  providerId: string | null;
  clusterKey: string | null;
  clusterCount: number;
  clusterPins: MapPinDto[] | null;
};

export type ExploreMapMarkersProps = {
  pool: MarkerPoolSlot[];
  onPressProviderId: (providerId: string) => void;
  onPressClusterPins: (
    pins: MapPinDto[],
    coordinate: { latitude: number; longitude: number },
  ) => void;
};

export type ExploreSelectedMarkerOverlayProps = {
  providerId: string | null;
  latitude: number | null;
  longitude: number | null;
};

/* ── Styles ─────────────────────────────────────────────────────────────── */

const S = StyleSheet.create({
  markerRoot: {
    width: PAW_SIZE,
    height: PAW_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  markerImage: {
    width: PAW_SIZE,
    height: PAW_SIZE,
  },
  selectedRoot: {
    width: PAW_SELECTED_SIZE,
    height: PAW_SELECTED_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  selectedImage: {
    width: PAW_SELECTED_SIZE,
    height: PAW_SELECTED_SIZE,
  },
  clusterOuter: {
    width: CLUSTER_OUTER,
    height: CLUSTER_OUTER,
    justifyContent: "center",
    alignItems: "center",
  },
  clusterInner: {
    width: CLUSTER_INNER,
    height: CLUSTER_INNER,
    borderRadius: CLUSTER_INNER / 2,
    backgroundColor: "#ffffff",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#e2e2e2",
    ...Platform.select({ android: { elevation: 0 }, default: {} }),
  },
  badge: {
    position: "absolute",
    top: 2,
    right: 2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#ffffff",
    backgroundColor: "#ef4444",
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#ffffff",
  },
  ioniconPawOuter: {
    alignItems: "center",
    justifyContent: "center",
  },
  ioniconPawInner: {
    backgroundColor: "#ffffff",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#e2e2e2",
    ...Platform.select({ android: { elevation: 2 }, default: {} }),
  },
  ioniconPawInnerSelected: {
    backgroundColor: "#ffffff",
    borderColor: BRAND_PRIMARY,
    borderWidth: 3,
    ...Platform.select({ android: { elevation: 4 }, default: {} }),
  },
  ioniconPawRing: {
    position: "absolute",
    borderColor: BRAND_PRIMARY,
    borderWidth: 2,
    backgroundColor: "transparent",
  },
});

function IoniconPawMarkerContent({
  selected,
  size,
}: {
  selected: boolean;
  size: number;
}) {
  const outer = selected ? IONICON_SELECTED_OUTER : IONICON_PAW_OUTER;
  const inner = selected ? IONICON_SELECTED_INNER : IONICON_PAW_INNER;
  const icon = selected ? IONICON_SELECTED_ICON : IONICON_PAW_ICON;

  return (
    <View
      style={[S.ioniconPawOuter, { width: outer, height: outer }]}
      collapsable={false}
    >
      {selected ? (
        <View
          style={[
            S.ioniconPawRing,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
            },
          ]}
          collapsable={false}
        />
      ) : null}
      <View
        style={[
          S.ioniconPawInner,
          selected && S.ioniconPawInnerSelected,
          {
            width: inner,
            height: inner,
            borderRadius: inner / 2,
          },
        ]}
        collapsable={false}
      >
        <Ionicons
          name="paw"
          size={icon}
          color={selected ? BRAND_PRIMARY : PAW_ICON_COLOR}
        />
      </View>
    </View>
  );
}

function PawMarkerBody({
  selected,
  imageLoaded,
  onImageLoad,
}: {
  selected: boolean;
  imageLoaded: boolean;
  onImageLoad: () => void;
}): ReactNode {
  if (PREVIEW_IONICON_PAW_MARKERS) {
    return (
      <IoniconPawMarkerContent
        selected={selected}
        size={selected ? IONICON_SELECTED_OUTER : IONICON_PAW_OUTER}
      />
    );
  }

  const rootStyle = selected ? S.selectedRoot : S.markerRoot;
  const imageStyle = selected ? S.selectedImage : S.markerImage;
  const source = selected ? PAW_SELECTED_IMAGE : PAW_PROVIDER_IMAGE;

  return (
    <View style={rootStyle} collapsable={false}>
      <Image
        source={source}
        style={imageStyle}
        resizeMode="contain"
        onLoad={onImageLoad}
      />
    </View>
  );
}

/* ── PooledMarker ───────────────────────────────────────────────────────────
 *
 * POOL INVARIANT: This component must never unmount. Returning null for
 * offscreen slots causes native Marker nodes to be added/removed from the
 * MapView, which triggers crashes in Google Maps (Android) when many markers
 * change state simultaneously during a zoom. Every slot stays mounted;
 * only its coordinate and content change.
 *
 * RED-PIN FIX: The paw Image is rendered in BOTH "single" AND "offscreen"
 * states. While a slot is offscreen the image pre-warms (onLoad fires,
 * pawPreloaded=true). When the slot becomes "single" the image is already
 * in the system image cache, so tracksViewChanges is false immediately and
 * iOS MapKit never falls back to its default red-balloon pin.
 *
 * ────────────────────────────────────────────────────────────────────────── */

type PooledMarkerProps = {
  slot: MarkerPoolSlot;
  index: number;
  onPressProviderId: (id: string) => void;
  onPressClusterPins: (
    pins: MapPinDto[],
    coordinate: { latitude: number; longitude: number },
  ) => void;
};

const PooledMarker = memo(function PooledMarker({
  slot,
  index,
  onPressProviderId,
  onPressClusterPins,
}: PooledMarkerProps) {
  // Android: never trust the preload flag — each marker must wait for its own onLoad.
  const [imageLoaded, setImageLoaded] = useState(IS_ANDROID ? false : pawPreloaded);

  const handleImageLoad = useCallback(() => {
    if (!IS_ANDROID) pawPreloaded = true;
    setImageLoaded(true);
  }, []);

  const handlePress = useCallback(() => {
    if (slot.kind === "single" && slot.providerId) {
      onPressProviderId(slot.providerId);
    } else if (slot.kind === "cluster" && slot.clusterPins) {
      onPressClusterPins(slot.clusterPins, slot.coordinate);
    }
  }, [slot, onPressProviderId, onPressClusterPins]);

  // ── Cluster ────────────────────────────────────────────────────────────
  if (slot.kind === "cluster") {
    return (
      <MarkerWrapper
        identifier={`pool-${index}`}
        coordinate={slot.coordinate}
        anchor={ANCHOR_CENTER}
        tracksViewChanges={false}
        onPress={handlePress}
        zIndex={MARKER_Z}
      >
        <View style={S.clusterOuter} collapsable={false}>
          <View style={S.clusterInner} collapsable={false}>
            <Ionicons name="paw" size={CLUSTER_ICON} color="#1a1a2e" />
          </View>
          <View style={S.badge} collapsable={false}>
            <Text style={S.badgeText}>
              {slot.clusterCount > 99 ? "99+" : slot.clusterCount}
            </Text>
          </View>
        </View>
      </MarkerWrapper>
    );
  }

  // ── Single or offscreen ──────────────────────────────────────────────
  const isVisible = slot.kind === "single";
  const coordinate = isVisible ? slot.coordinate : OFFSCREEN_COORDINATE;

  const tracksViewChanges = PREVIEW_IONICON_PAW_MARKERS
    ? false
    : !imageLoaded;

  return (
    <MarkerWrapper
      identifier={`pool-${index}`}
      coordinate={coordinate}
      anchor={PREVIEW_IONICON_PAW_MARKERS ? ANCHOR_CENTER : ANCHOR_PIN_TIP}
      tracksViewChanges={tracksViewChanges}
      onPress={isVisible ? handlePress : undefined}
      zIndex={MARKER_Z}
    >
      <PawMarkerBody
        selected={false}
        imageLoaded={imageLoaded}
        onImageLoad={handleImageLoad}
      />
    </MarkerWrapper>
  );
});

/* ── ExploreMapMarkers ──────────────────────────────────────────────────── */

export const ExploreMapMarkers = memo(function ExploreMapMarkers({
  pool,
  onPressProviderId,
  onPressClusterPins,
}: ExploreMapMarkersProps) {
  return (
    <>
      {pool.map((slot, i) => (
        <PooledMarker
          key={i}
          slot={slot}
          index={i}
          onPressProviderId={onPressProviderId}
          onPressClusterPins={onPressClusterPins}
        />
      ))}
    </>
  );
});

/* ── ExploreSelectedMarkerOverlay ───────────────────────────────────────── */

export const ExploreSelectedMarkerOverlay = memo(
  function ExploreSelectedMarkerOverlay({
    providerId,
    latitude,
    longitude,
  }: ExploreSelectedMarkerOverlayProps) {
    const [imageLoaded, setImageLoaded] = useState(IS_ANDROID ? false : selectedPreloaded);

    const handleImageLoad = useCallback(() => {
      if (!IS_ANDROID) selectedPreloaded = true;
      setImageLoaded(true);
    }, []);

    const isActive =
      providerId != null && latitude != null && longitude != null;

    const coordinate = isActive
      ? { latitude: Number(latitude), longitude: Number(longitude) }
      : OFFSCREEN_COORDINATE;

    const tracksViewChanges = PREVIEW_IONICON_PAW_MARKERS
      ? false
      : !imageLoaded;

    return (
      <MarkerWrapper
        identifier="selected-overlay"
        coordinate={coordinate}
        anchor={PREVIEW_IONICON_PAW_MARKERS ? ANCHOR_CENTER : ANCHOR_PIN_TIP}
        tracksViewChanges={tracksViewChanges}
        zIndex={SELECTED_Z}
      >
        <PawMarkerBody
          selected
          imageLoaded={imageLoaded}
          onImageLoad={handleImageLoad}
        />
      </MarkerWrapper>
    );
  },
);
