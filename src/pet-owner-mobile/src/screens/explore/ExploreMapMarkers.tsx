import React, { useMemo, memo } from "react";
import { Platform } from "react-native";
import { MarkerWrapper } from "../../components/MapViewWrapper";
import type { MapPinDto } from "../../types/api";
import type { ExploreMapMarkerItem } from "./mapCollision";

const MARKER_ANCHOR = { x: 0.5, y: 1 } as const;

/** iOS: avoid per-marker `zIndex` if possible; selection is distinguishable by image. Android: keep elevation hint. */
function markerZIndex(
  isSelectedOrActive: boolean,
): { zIndex?: number; style?: { elevation: number } } {
  if (Platform.OS === "ios") {
    return {};
  }
  return {
    zIndex: isSelectedOrActive ? 1000 : 1,
    style: { elevation: isSelectedOrActive ? 12 : 4 },
  };
}

/** Local assets — native `image` avoids View snapshotting / memory churn from custom marker children. */
const IMG_PROVIDER = require("../../../assets/map-marker-provider.png");
const IMG_PROVIDER_SELECTED = require("../../../assets/map-marker-provider-selected.png");
const IMG_CLUSTER = require("../../../assets/map-marker-cluster.png");

const noop = () => {};

function mapMarkerNativeIdentifier(raw: string): string {
  return raw.replace(/[^a-zA-Z0-9._-]/g, "_");
}

type SingleProps = {
  pin: MapPinDto;
  isSelected: boolean;
  onPress: () => void;
};

/**
 * One provider pin: stable coordinate ref + `image` only (no custom View tree inside Marker).
 */
const ExploreSingleMapMarker = memo(
  function ExploreSingleMapMarker({ pin, isSelected, onPress }: SingleProps) {
    const coordinate = useMemo(
      () => ({
        latitude: Number(pin.latitude),
        longitude: Number(pin.longitude),
      }),
      [pin.latitude, pin.longitude],
    );

    const image = isSelected ? IMG_PROVIDER_SELECTED : IMG_PROVIDER;

    return (
      <MarkerWrapper
        identifier={mapMarkerNativeIdentifier(String(pin.providerId))}
        coordinate={coordinate}
        image={image}
        anchor={MARKER_ANCHOR}
        tracksViewChanges={false}
        onPress={onPress}
        {...markerZIndex(isSelected)}
      />
    );
  },
  (prev, next) =>
    prev.pin.providerId === next.pin.providerId &&
    prev.pin.latitude === next.pin.latitude &&
    prev.pin.longitude === next.pin.longitude &&
    prev.isSelected === next.isSelected &&
    prev.onPress === next.onPress,
);

type ClusterProps = {
  item: Extract<ExploreMapMarkerItem, { kind: "cluster" }>;
  isActive: boolean;
  onPress: () => void;
};

const ExploreClusterMapMarker = memo(
  function ExploreClusterMapMarker({ item, isActive, onPress }: ClusterProps) {
    const coordinate = useMemo(
      () => ({
        latitude: item.latitude,
        longitude: item.longitude,
      }),
      [item.latitude, item.longitude],
    );

    const image = isActive ? IMG_PROVIDER_SELECTED : IMG_CLUSTER;

    return (
      <MarkerWrapper
        identifier={mapMarkerNativeIdentifier(`cluster-${item.key}`)}
        coordinate={coordinate}
        image={image}
        anchor={MARKER_ANCHOR}
        tracksViewChanges={false}
        onPress={onPress}
        {...markerZIndex(isActive)}
      />
    );
  },
  (prev, next) =>
    prev.item.key === next.item.key &&
    prev.item.latitude === next.item.latitude &&
    prev.item.longitude === next.item.longitude &&
    prev.item.pins === next.item.pins &&
    prev.isActive === next.isActive &&
    prev.onPress === next.onPress,
);

export type ExploreMapMarkersProps = {
  items: ExploreMapMarkerItem[];
  selectedProviderId: string | null | undefined;
  onPressProviderId: (providerId: string) => void;
  onPressClusterPins: (pins: MapPinDto[]) => void;
};

/**
 * Renders map markers with stable handlers and image-based markers to limit native churn during pan/zoom.
 * The marker list subtree is a single `useMemo` so React can reuse one element list ref when `items` & selection are stable.
 */
export const ExploreMapMarkers = memo(
  function ExploreMapMarkers({
    items,
    selectedProviderId,
    onPressProviderId,
    onPressClusterPins,
  }: ExploreMapMarkersProps) {
    const providerPressById = useMemo(() => {
      const m = new Map<string, () => void>();
      for (const it of items) {
        if (it.kind === "single") {
          const id = it.pin.providerId;
          m.set(id, () => onPressProviderId(id));
        }
      }
      return m;
    }, [items, onPressProviderId]);

    const clusterPressByKey = useMemo(() => {
      const m = new Map<string, () => void>();
      for (const it of items) {
        if (it.kind === "cluster") {
          m.set(it.key, () => onPressClusterPins(it.pins));
        }
      }
      return m;
    }, [items, onPressClusterPins]);

    const markerSubTree = useMemo(
      () => (
        <>
          {items.map((item) => {
            if (item.kind === "single") {
              const pin = item.pin;
              const isSel = selectedProviderId === pin.providerId;
              return (
                <ExploreSingleMapMarker
                  key={pin.providerId}
                  pin={pin}
                  isSelected={isSel}
                  onPress={providerPressById.get(pin.providerId) ?? noop}
                />
              );
            }
            const clusterActive =
              selectedProviderId != null &&
              item.pins.some((p) => p.providerId === selectedProviderId);
            return (
              <ExploreClusterMapMarker
                key={`cluster-${item.key}`}
                item={item}
                isActive={clusterActive}
                onPress={clusterPressByKey.get(item.key) ?? noop}
              />
            );
          })}
        </>
      ),
      [items, selectedProviderId, providerPressById, clusterPressByKey],
    );
    return markerSubTree;
  },
  (prev, next) =>
    prev.items === next.items &&
    prev.selectedProviderId === next.selectedProviderId &&
    prev.onPressProviderId === next.onPressProviderId &&
    prev.onPressClusterPins === next.onPressClusterPins,
);
