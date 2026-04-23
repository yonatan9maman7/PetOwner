import React, { useCallback, useEffect, useRef, useState, memo, useMemo } from "react";
import { View, StyleSheet, Text, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { MarkerWrapper } from "../../components/MapViewWrapper";
import type { MapPinDto } from "../../types/api";
import { mapDiag } from "./exploreMapDiag";

/* ── Constants ──────────────────────────────────────────────────────────── */

/**
 * Coordinate used for recycled (inactive) pool slots. The marker is always
 * mounted in the native map but parked at the South Pole where no user will
 * ever scroll. This avoids `removeAnnotation` entirely.
 */
export const OFFSCREEN_COORDINATE = { latitude: -90, longitude: 0 } as const;

const ANCHOR_CENTER_BOTTOM = { x: 0.5, y: 1 } as const;
const MARKER_Z_INDEX = 1;
const SELECTED_MARKER_Z_INDEX = 1000;

/* ── Styles ─────────────────────────────────────────────────────────────── */

const S = StyleSheet.create({
  markerRoot: {
    width: 64,
    minHeight: 70,
    alignItems: "center",
    backgroundColor: "transparent",
    overflow: "visible",
    paddingTop: 6,
    paddingBottom: 4,
  },
  bubble: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    backgroundColor: "#ffffff",
    borderColor: "#e2e2e2",
    ...Platform.select({
      android: { elevation: 4 },
    }),
  },
  bubbleSelected: {
    backgroundColor: "#1a1a2e",
    borderColor: "#1a1a2e",
    ...Platform.select({
      android: { elevation: 8 },
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
  arrowSelected: {
    borderTopColor: "#1a1a2e",
  },
  markerRootCluster: {
    width: 68,
    minHeight: 74,
    alignItems: "center",
    backgroundColor: "transparent",
    overflow: "visible",
    paddingTop: 6,
    paddingBottom: 4,
  },
  clusterWrap: {
    position: "relative",
    width: 44,
    height: 44,
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
    <View
      style={S.markerRoot}
      {...(Platform.OS === "android" ? { collapsable: false } : {})}
    >
      <View style={S.bubble}>
        <Ionicons name="paw" size={18} color="#1a1a2e" />
      </View>
      <View style={S.arrow} />
    </View>
  );
});

const ClusterBubble = memo(function ClusterBubble({ count }: { count: number }) {
  return (
    <View
      style={S.markerRootCluster}
      {...(Platform.OS === "android" ? { collapsable: false } : {})}
    >
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

const SelectedPawBubble = memo(function SelectedPawBubble() {
  return (
    <View
      style={S.markerRoot}
      {...(Platform.OS === "android" ? { collapsable: false } : {})}
    >
      <View style={[S.bubble, S.bubbleSelected]}>
        <Ionicons name="paw" size={18} color="#ffffff" />
      </View>
      <View style={[S.arrow, S.arrowSelected]} />
    </View>
  );
});

/* ── Pooled marker (never unmounts — RecyclerView pattern) ──────────────── */

type PooledMarkerProps = {
  slot: MarkerPoolSlot;
  index: number;
  onPressProviderId: (id: string) => void;
  onPressClusterPins: (pins: MapPinDto[]) => void;
};

/**
 * A single recycled marker slot. Keyed by array index so React never
 * unmounts it — only prop updates flow to the native Marker. When the slot
 * is inactive the coordinate is OFFSCREEN_COORDINATE (-90, 0).
 *
 * Both "single" and "offscreen" slots render <PawBubble /> so that the
 * bitmap snapshot is valid for the common offscreen→single transition
 * without needing a re-snapshot. Only cluster visuals differ.
 */
const PooledMarker = memo(
  function PooledMarker({
    slot,
    index,
    onPressProviderId,
    onPressClusterPins,
  }: PooledMarkerProps) {
    /*
     * tracksViewChanges gates when MapKit re-snapshots the CALayer bitmap.
     * Mount:  true  → captures the Ionicons paw glyph after async font load.
     * +300ms: false → freezes the bitmap, zero per-frame overhead.
     *
     * Visual key tracks the current visual state. When it changes (e.g.
     * single↔cluster or cluster count change), we re-enable briefly.
     * offscreen↔single does NOT need a re-snapshot: both render PawBubble.
     */
    const visualKey = slot.kind === "cluster" ? `c${slot.clusterCount}` : "paw";
    const prevVisualKeyRef = useRef(visualKey);
    const [tracksViewChanges, setTracksViewChanges] = useState(true);

    useEffect(() => {
      if (visualKey !== prevVisualKeyRef.current) {
        prevVisualKeyRef.current = visualKey;
        setTracksViewChanges(true);
      }
    }, [visualKey]);

    useEffect(() => {
      if (!tracksViewChanges) return;
      const t = setTimeout(() => setTracksViewChanges(false), 300);
      return () => clearTimeout(t);
    }, [tracksViewChanges]);

    /* Stable onPress — reads current slot data from ref at tap time. */
    const slotRef = useRef(slot);
    slotRef.current = slot;

    const handlePress = useCallback(() => {
      const s = slotRef.current;
      if (s.kind === "single" && s.providerId) {
        onPressProviderId(s.providerId);
      } else if (s.kind === "cluster" && s.clusterPins) {
        onPressClusterPins(s.clusterPins);
      }
    }, [onPressProviderId, onPressClusterPins]);

    return (
      <MarkerWrapper
        identifier={`pool-${index}`}
        coordinate={slot.coordinate}
        anchor={ANCHOR_CENTER_BOTTOM}
        tracksViewChanges={tracksViewChanges}
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
  onPressClusterPins: (pins: MapPinDto[]) => void;
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

/**
 * Persistent overlay marker for the selected pin's dark-paw visual.
 * Always mounted — never calls addAnnotation/removeAnnotation. When no
 * pin is selected the marker parks at OFFSCREEN_COORDINATE. When a pin
 * is selected it moves to the pin's coordinate via a native prop update.
 */
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

    const [tracksViewChanges, setTracksViewChanges] = useState(true);

    useEffect(() => {
      if (isActive) setTracksViewChanges(true);
    }, [isActive]);

    useEffect(() => {
      if (!tracksViewChanges) return;
      const t = setTimeout(() => setTracksViewChanges(false), 200);
      return () => clearTimeout(t);
    }, [tracksViewChanges]);

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
        anchor={ANCHOR_CENTER_BOTTOM}
        tracksViewChanges={tracksViewChanges}
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
