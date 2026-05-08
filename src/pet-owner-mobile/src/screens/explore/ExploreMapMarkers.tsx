import React, { useCallback, useEffect, useRef, useState, memo, useMemo } from "react";
import { View, StyleSheet, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { MarkerWrapper } from "../../components/MapViewWrapper";
import type { MapPinDto } from "../../types/api";
import { mapDiag } from "./exploreMapDiag";

/* ── Constants ──────────────────────────────────────────────────────────── */

export const OFFSCREEN_COORDINATE = { latitude: -90, longitude: 0 } as const;

const ANCHOR_CENTER = { x: 0.5, y: 0.5 } as const;
const MARKER_Z_INDEX = 1;
const SELECTED_MARKER_Z_INDEX = 1000;

/** Outer snapshot box larger than inner circle — avoids Android squircle clipping. */
const MARKER_OUTER_SIZE = 50;
const PAW_INNER_SIZE = 38;
const PAW_INNER_RADIUS = PAW_INNER_SIZE / 2;
const ICON_SIZE = 18;

const CLUSTER_OUTER_SIZE = 60;
const CLUSTER_INNER_SIZE = 44;
const CLUSTER_INNER_RADIUS = CLUSTER_INNER_SIZE / 2;
const CLUSTER_ICON_SIZE = 20;
const TRACKS_TIMEOUT_MS = 1000;

/* ── Styles ─────────────────────────────────────────────────────────────── */

const S = StyleSheet.create({
  /** Transparent bounds only — no borderRadius/bg on outer (Android map snapshot). */
  markerOuter: {
    width: MARKER_OUTER_SIZE,
    height: MARKER_OUTER_SIZE,
    backgroundColor: "transparent",
    justifyContent: "center",
    alignItems: "center",
  },
  bubbleInner: {
    width: PAW_INNER_SIZE,
    height: PAW_INNER_SIZE,
    borderRadius: PAW_INNER_RADIUS,
    overflow: "hidden",
    backgroundColor: "#ffffff",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#e2e2e2",
  },
  bubbleInnerSelected: {
    width: PAW_INNER_SIZE,
    height: PAW_INNER_SIZE,
    borderRadius: PAW_INNER_RADIUS,
    overflow: "hidden",
    backgroundColor: "#1a1a2e",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#1a1a2e",
  },
  clusterOuter: {
    width: CLUSTER_OUTER_SIZE,
    height: CLUSTER_OUTER_SIZE,
    backgroundColor: "transparent",
    justifyContent: "center",
    alignItems: "center",
  },
  clusterBubbleInner: {
    width: CLUSTER_INNER_SIZE,
    height: CLUSTER_INNER_SIZE,
    borderRadius: CLUSTER_INNER_RADIUS,
    overflow: "hidden",
    backgroundColor: "#ffffff",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#e2e2e2",
  },
  badge: {
    position: "absolute",
    top: 5,
    right: 5,
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
  icon: {
    width: ICON_SIZE,
    height: ICON_SIZE,
  },
  clusterIcon: {
    width: CLUSTER_ICON_SIZE,
    height: CLUSTER_ICON_SIZE,
  },
});

/* ── Pool slot type ─────────────────────────────────────────────────────── */

export type MarkerPoolSlot = {
  kind: "single" | "cluster" | "offscreen";
  coordinate: { latitude: number; longitude: number };
  providerId: string | null;
  clusterKey: string | null;
  clusterCount: number;
  clusterPins: MapPinDto[] | null;
};

/* ── Visual bubbles (static, memo'd) ────────────────────────────────────── */

const PawBubble = memo(function PawBubble() {
  return (
    <View style={S.markerOuter} collapsable={false}>
      <View style={S.bubbleInner} collapsable={false}>
        <Ionicons name="paw" size={ICON_SIZE} color="#1a1a2e" style={S.icon} />
      </View>
    </View>
  );
});

const ClusterBubble = memo(function ClusterBubble({ count }: { count: number }) {
  return (
    <View style={S.clusterOuter} collapsable={false}>
      <View style={S.clusterBubbleInner} collapsable={false}>
        <Ionicons name="paw" size={CLUSTER_ICON_SIZE} color="#1a1a2e" style={S.clusterIcon} />
      </View>
      <View style={S.badge}>
        <Text style={S.badgeText}>{count > 99 ? "99+" : count}</Text>
      </View>
    </View>
  );
});

const SelectedPawBubble = memo(function SelectedPawBubble() {
  return (
    <View style={S.markerOuter} collapsable={false}>
      <View style={S.bubbleInnerSelected} collapsable={false}>
        <Ionicons name="paw" size={ICON_SIZE} color="#ffffff" style={S.icon} />
      </View>
    </View>
  );
});

/* ── Pooled marker (never unmounts — RecyclerView pattern) ──────────────── */

type PooledMarkerProps = {
  slot: MarkerPoolSlot;
  index: number;
  onPressProviderId: (id: string) => void;
  onPressClusterPins: (pins: MapPinDto[], coordinate: { latitude: number; longitude: number }) => void;
};

const PooledMarker = memo(
  function PooledMarker({
    slot,
    index,
    onPressProviderId,
    onPressClusterPins,
  }: PooledMarkerProps) {
    const visualKey = slot.kind === "cluster" ? `c${slot.clusterCount}` : "paw";
    const prevVisualKeyRef = useRef(visualKey);
    const [isTracking, setIsTracking] = useState(true);

    useEffect(() => {
      if (visualKey !== prevVisualKeyRef.current) {
        prevVisualKeyRef.current = visualKey;
        setIsTracking(true);
      }
    }, [visualKey]);

    useEffect(() => {
      if (!isTracking) return;
      const t = setTimeout(() => setIsTracking(false), TRACKS_TIMEOUT_MS);
      return () => clearTimeout(t);
    }, [isTracking]);

    const slotRef = useRef(slot);
    slotRef.current = slot;

    const handlePress = useCallback(() => {
      const s = slotRef.current;
      if (s.kind === "single" && s.providerId) {
        onPressProviderId(s.providerId);
      } else if (s.kind === "cluster" && s.clusterPins) {
        onPressClusterPins(s.clusterPins, s.coordinate);
      }
    }, [onPressProviderId, onPressClusterPins]);

    return (
      <MarkerWrapper
        identifier={`pool-${index}`}
        coordinate={slot.coordinate}
        anchor={ANCHOR_CENTER}
        tracksViewChanges={isTracking}
        onPress={handlePress}
        zIndex={MARKER_Z_INDEX}
      >
        {slot.kind === "cluster" ? (
          <ClusterBubble count={slot.clusterCount} />
        ) : (
          <PawBubble />
        )}
      </MarkerWrapper>
    );
  },
  (prev, next) => {
    if (prev.slot.kind !== next.slot.kind) return false;
    if (prev.slot.kind === "offscreen" && next.slot.kind === "offscreen") return true;
    if (prev.slot.providerId !== next.slot.providerId) return false;
    if (prev.slot.clusterKey !== next.slot.clusterKey) return false;
    if (prev.slot.clusterCount !== next.slot.clusterCount) return false;
    const dLat = Math.abs(
      prev.slot.coordinate.latitude - next.slot.coordinate.latitude,
    );
    const dLng = Math.abs(
      prev.slot.coordinate.longitude - next.slot.coordinate.longitude,
    );
    if (dLat >= 1e-5 || dLng >= 1e-5) return false;
    if (prev.onPressProviderId !== next.onPressProviderId) return false;
    if (prev.onPressClusterPins !== next.onPressClusterPins) return false;
    return true;
  },
);

/* ── Container ──────────────────────────────────────────────────────────── */

export type ExploreMapMarkersProps = {
  pool: MarkerPoolSlot[];
  onPressProviderId: (providerId: string) => void;
  onPressClusterPins: (pins: MapPinDto[], coordinate: { latitude: number; longitude: number }) => void;
};

export const ExploreMapMarkers = memo(
  function ExploreMapMarkers({
    pool,
    onPressProviderId,
    onPressClusterPins,
  }: ExploreMapMarkersProps) {
    let active = 0;
    for (const s of pool) if (s.kind !== "offscreen") active++;
    mapDiag("markers.render", { poolSize: pool.length, active });

    return (
      <>
        {pool.map((slot, index) => (
          <PooledMarker
            key={index}
            slot={slot}
            index={index}
            onPressProviderId={onPressProviderId}
            onPressClusterPins={onPressClusterPins}
          />
        ))}
      </>
    );
  },
  (prev, next) =>
    prev.pool === next.pool &&
    prev.onPressProviderId === next.onPressProviderId &&
    prev.onPressClusterPins === next.onPressClusterPins,
);

/* ── Selected-marker overlay (always mounted, coordinate-hidden) ─────── */

export type ExploreSelectedMarkerOverlayProps = {
  providerId: string | null;
  latitude: number | null;
  longitude: number | null;
};

export const ExploreSelectedMarkerOverlay = memo(
  function ExploreSelectedMarkerOverlay({
    providerId,
    latitude,
    longitude,
  }: ExploreSelectedMarkerOverlayProps) {
    const isActive = providerId != null && latitude != null && longitude != null;

    const coordinate = useMemo(
      () =>
        isActive
          ? { latitude: Number(latitude), longitude: Number(longitude) }
          : OFFSCREEN_COORDINATE,
      [isActive, latitude, longitude],
    );

    const [isTracking, setIsTracking] = useState(true);

    useEffect(() => {
      if (isActive) setIsTracking(true);
    }, [isActive]);

    useEffect(() => {
      if (!isTracking) return;
      const t = setTimeout(() => setIsTracking(false), TRACKS_TIMEOUT_MS);
      return () => clearTimeout(t);
    }, [isTracking]);

    useEffect(() => {
      if (isActive) {
        mapDiag("overlay.activate", { providerId });
      } else {
        mapDiag("overlay.deactivate");
      }
    }, [isActive, providerId]);

    return (
      <MarkerWrapper
        identifier="selected-overlay"
        coordinate={coordinate}
        anchor={ANCHOR_CENTER}
        tracksViewChanges={isTracking}
        zIndex={SELECTED_MARKER_Z_INDEX}
      >
        <SelectedPawBubble />
      </MarkerWrapper>
    );
  },
  (prev, next) =>
    prev.providerId === next.providerId &&
    prev.latitude === next.latitude &&
    prev.longitude === next.longitude,
);
