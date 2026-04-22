import React, { useMemo, useRef, memo } from "react";
import { View, StyleSheet, Text, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { MarkerWrapper } from "../../components/MapViewWrapper";
import type { MapPinDto } from "../../types/api";
import type { ExploreMapMarkerItem } from "./mapCollision";

/*
 * Module-level style constants — never allocate new objects inside render/memo callbacks.
 * This is the single most important factor for preventing MapKit annotation churn on iOS.
 */
const S = StyleSheet.create({
  hitArea: {
    padding: 10,
    alignItems: "center",
  },
  bubble: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    backgroundColor: "#ffffff",
    borderColor: "#e2e2e2",
    // No shadow on iOS — the whole marker becomes a native bitmap (tracksViewChanges=false);
    // shadow props bloat the snapshot without visible benefit after rasterization.
    ...Platform.select({
      android: { elevation: 4 },
    }),
  },
  arrow: {
    width: 0,
    height: 0,
    marginTop: -1,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 8,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: "#ffffff",
  },
  clusterWrap: {
    position: "relative",
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    position: "absolute",
    top: 0,
    right: 0,
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
});

const ANCHOR_CENTER_BOTTOM = { x: 0.5, y: 1 } as const;
/**
 * Constant z-index on iOS: changing this per-marker when selection flips is one of the
 * top reasons MapKit crashes during gesture recognition. Keep it constant; the bottom
 * card is the real selection affordance.
 */
const ANDROID_ELEVATION_STYLE = { elevation: 4 } as const;
const MARKER_Z_INDEX = 1;

function mapMarkerNativeIdentifier(raw: string): string {
  return raw.replace(/[^a-zA-Z0-9._-]/g, "_");
}

const noop = () => {};

/* ─── Single provider marker ────────────────────────────────────────────── */

type SingleProps = { pin: MapPinDto; onPress: () => void };

const PawBubble = memo(function PawBubble() {
  return (
    <View style={S.hitArea}>
      <View style={S.bubble}>
        <Ionicons name="paw" size={18} color="#1a1a2e" />
      </View>
      <View style={S.arrow} />
    </View>
  );
});

const ExploreSingleMapMarker = memo(
  function ExploreSingleMapMarker({ pin, onPress }: SingleProps) {
    const coordinate = useMemo(
      () => ({ latitude: Number(pin.latitude), longitude: Number(pin.longitude) }),
      [pin.latitude, pin.longitude],
    );
    return (
      <MarkerWrapper
        identifier={mapMarkerNativeIdentifier(String(pin.providerId))}
        coordinate={coordinate}
        anchor={ANCHOR_CENTER_BOTTOM}
        tracksViewChanges={false}
        onPress={onPress}
        zIndex={MARKER_Z_INDEX}
        {...(Platform.OS === "android" ? { style: ANDROID_ELEVATION_STYLE } : {})}
      >
        <PawBubble />
      </MarkerWrapper>
    );
  },
  (prev, next) =>
    prev.pin.providerId === next.pin.providerId &&
    prev.pin.latitude === next.pin.latitude &&
    prev.pin.longitude === next.pin.longitude &&
    prev.onPress === next.onPress,
);

/* ─── Cluster marker ─────────────────────────────────────────────────────── */

type ClusterProps = {
  item: Extract<ExploreMapMarkerItem, { kind: "cluster" }>;
  onPress: () => void;
};

const ClusterBubble = memo(function ClusterBubble({ count }: { count: number }) {
  return (
    <View style={S.hitArea}>
      <View style={S.clusterWrap}>
        <View style={S.bubble}>
          <Ionicons name="paw" size={16} color="#1a1a2e" />
        </View>
        <View style={S.badge}>
          <Text style={S.badgeText}>{count > 99 ? "99+" : count}</Text>
        </View>
      </View>
      <View style={S.arrow} />
    </View>
  );
});

const ExploreClusterMapMarker = memo(
  function ExploreClusterMapMarker({ item, onPress }: ClusterProps) {
    const coordinate = useMemo(
      () => ({ latitude: item.latitude, longitude: item.longitude }),
      [item.latitude, item.longitude],
    );
    return (
      <MarkerWrapper
        identifier={mapMarkerNativeIdentifier(`cluster-${item.key}`)}
        coordinate={coordinate}
        anchor={ANCHOR_CENTER_BOTTOM}
        tracksViewChanges={false}
        onPress={onPress}
        zIndex={MARKER_Z_INDEX}
        {...(Platform.OS === "android" ? { style: ANDROID_ELEVATION_STYLE } : {})}
      >
        <ClusterBubble count={item.pins.length} />
      </MarkerWrapper>
    );
  },
  (prev, next) =>
    prev.item.key === next.item.key &&
    prev.item.latitude === next.item.latitude &&
    prev.item.longitude === next.item.longitude &&
    prev.item.pins === next.item.pins &&
    prev.onPress === next.onPress,
);

/* ─── Container ──────────────────────────────────────────────────────────── */

export type ExploreMapMarkersProps = {
  items: ExploreMapMarkerItem[];
  onPressProviderId: (providerId: string) => void;
  onPressClusterPins: (pins: MapPinDto[]) => void;
};

export const ExploreMapMarkers = memo(
  function ExploreMapMarkers({
    items,
    onPressProviderId,
    onPressClusterPins,
  }: ExploreMapMarkersProps) {
    /**
     * Persistent closure caches across renders so the `onPress` prop passed to each
     * <Marker> is referentially stable even when the `items` list churns. Without
     * this, every pan-triggered refetch rebuilt every marker's onPress closure,
     * which broke the `memo` equality and caused MapKit to rewrite annotations.
     */
    const providerPressCacheRef = useRef(new Map<string, () => void>());
    const clusterPressCacheRef = useRef(new Map<string, () => void>());
    const onPressProviderIdRef = useRef(onPressProviderId);
    const onPressClusterPinsRef = useRef(onPressClusterPins);
    onPressProviderIdRef.current = onPressProviderId;
    onPressClusterPinsRef.current = onPressClusterPins;

    const { providerPressById, clusterPressByKey } = useMemo(() => {
      const providerCache = providerPressCacheRef.current;
      const clusterCache = clusterPressCacheRef.current;
      const seenProviderIds = new Set<string>();
      const seenClusterKeys = new Set<string>();

      for (const it of items) {
        if (it.kind === "single") {
          const id = it.pin.providerId;
          seenProviderIds.add(id);
          if (!providerCache.has(id)) {
            providerCache.set(id, () => onPressProviderIdRef.current(id));
          }
        } else {
          const key = it.key;
          seenClusterKeys.add(key);
          if (!clusterCache.has(key)) {
            // Capture the latest pins[] snapshot at tap time, not at cache-creation time.
            clusterCache.set(key, () => {
              const fresh = items.find(
                (x) => x.kind === "cluster" && x.key === key,
              );
              if (fresh && fresh.kind === "cluster") {
                onPressClusterPinsRef.current(fresh.pins);
              }
            });
          }
        }
      }

      // Drop stale entries — prevents unbounded growth across long sessions.
      for (const k of providerCache.keys()) {
        if (!seenProviderIds.has(k)) providerCache.delete(k);
      }
      for (const k of clusterCache.keys()) {
        if (!seenClusterKeys.has(k)) clusterCache.delete(k);
      }

      return { providerPressById: providerCache, clusterPressByKey: clusterCache };
    }, [items]);

    return useMemo(
      () => (
        <>
          {items.map((item) => {
            if (item.kind === "single") {
              const pin = item.pin;
              return (
                <ExploreSingleMapMarker
                  key={pin.providerId}
                  pin={pin}
                  onPress={providerPressById.get(pin.providerId) ?? noop}
                />
              );
            }
            return (
              <ExploreClusterMapMarker
                key={`cluster-${item.key}`}
                item={item}
                onPress={clusterPressByKey.get(item.key) ?? noop}
              />
            );
          })}
        </>
      ),
      [items, providerPressById, clusterPressByKey],
    );
  },
  (prev, next) =>
    prev.items === next.items &&
    prev.onPressProviderId === next.onPressProviderId &&
    prev.onPressClusterPins === next.onPressClusterPins,
);
