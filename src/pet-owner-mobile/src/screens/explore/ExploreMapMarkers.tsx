import React, { useMemo, memo } from "react";
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
    // No shadow on iOS — MapKit already handles z-ordering; shadow props inside a
    // Marker child are snapshotted into a bitmap; skip them to reduce memory pressure.
    ...Platform.select({
      android: { elevation: 4 },
    }),
  },
  bubbleDefault: {
    backgroundColor: "#ffffff",
    borderColor: "#e2e2e2",
  },
  bubbleActive: {
    backgroundColor: "#1a1a2e",
    borderColor: "#ffffff",
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
  },
  arrowDefault: {
    borderTopColor: "#ffffff",
  },
  arrowActive: {
    borderTopColor: "#1a1a2e",
  },
  /* Cluster */
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
  },
  badgeDefault: { backgroundColor: "#ef4444" },
  badgeActive: { backgroundColor: "#6366f1" },
  badgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#ffffff",
  },
});

const ANCHOR_CENTER_BOTTOM = { x: 0.5, y: 1 } as const;

function mapMarkerNativeIdentifier(raw: string): string {
  return raw.replace(/[^a-zA-Z0-9._-]/g, "_");
}

const noop = () => {};

/* ─── Single provider marker ────────────────────────────────────────────── */

type SingleProps = { pin: MapPinDto; isSelected: boolean; onPress: () => void };

const PawBubble = memo(function PawBubble({ active }: { active: boolean }) {
  return (
    <View style={S.hitArea}>
      <View style={[S.bubble, active ? S.bubbleActive : S.bubbleDefault]}>
        <Ionicons
          name="paw"
          size={18}
          color={active ? "#ffffff" : "#1a1a2e"}
        />
      </View>
      <View style={[S.arrow, active ? S.arrowActive : S.arrowDefault]} />
    </View>
  );
});

const ExploreSingleMapMarker = memo(
  function ExploreSingleMapMarker({ pin, isSelected, onPress }: SingleProps) {
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
        zIndex={isSelected ? 1000 : 1}
        {...(Platform.OS === "android" ? { style: { elevation: isSelected ? 12 : 4 } } : {})}
      >
        <PawBubble active={isSelected} />
      </MarkerWrapper>
    );
  },
  (prev, next) =>
    prev.pin.providerId === next.pin.providerId &&
    prev.pin.latitude === next.pin.latitude &&
    prev.pin.longitude === next.pin.longitude &&
    prev.isSelected === next.isSelected &&
    prev.onPress === next.onPress,
);

/* ─── Cluster marker ─────────────────────────────────────────────────────── */

type ClusterProps = {
  item: Extract<ExploreMapMarkerItem, { kind: "cluster" }>;
  isActive: boolean;
  onPress: () => void;
};

const ClusterBubble = memo(function ClusterBubble({
  count,
  active,
}: {
  count: number;
  active: boolean;
}) {
  return (
    <View style={S.hitArea}>
      <View style={S.clusterWrap}>
        <View style={[S.bubble, active ? S.bubbleActive : S.bubbleDefault]}>
          <Ionicons name="paw" size={16} color={active ? "#ffffff" : "#1a1a2e"} />
        </View>
        <View style={[S.badge, active ? S.badgeActive : S.badgeDefault]}>
          <Text style={S.badgeText}>{count > 99 ? "99+" : count}</Text>
        </View>
      </View>
      <View style={[S.arrow, active ? S.arrowActive : S.arrowDefault]} />
    </View>
  );
});

const ExploreClusterMapMarker = memo(
  function ExploreClusterMapMarker({ item, isActive, onPress }: ClusterProps) {
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
        zIndex={isActive ? 1000 : 1}
        {...(Platform.OS === "android" ? { style: { elevation: isActive ? 12 : 4 } } : {})}
      >
        <ClusterBubble count={item.pins.length} active={isActive} />
      </MarkerWrapper>
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

/* ─── Container ──────────────────────────────────────────────────────────── */

export type ExploreMapMarkersProps = {
  items: ExploreMapMarkerItem[];
  selectedProviderId: string | null | undefined;
  onPressProviderId: (providerId: string) => void;
  onPressClusterPins: (pins: MapPinDto[]) => void;
};

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
                  isSelected={selectedProviderId === pin.providerId}
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
  },
  (prev, next) =>
    prev.items === next.items &&
    prev.selectedProviderId === next.selectedProviderId &&
    prev.onPressProviderId === next.onPressProviderId &&
    prev.onPressClusterPins === next.onPressClusterPins,
);
