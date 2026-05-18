import React, { useCallback, useEffect, useRef, useState, memo, useMemo } from "react";
import { View, Image, StyleSheet, Text, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { MarkerWrapper } from "../../components/MapViewWrapper";
import type { MapPinDto } from "../../types/api";
import { mapDiag } from "./exploreMapDiag";

const PAW_PROVIDER_IMAGE = require("../../../assets/map-marker-provider.png");
const PAW_SELECTED_IMAGE = require("../../../assets/map-marker-provider-selected.png");

/* ── Constants ──────────────────────────────────────────────────────────── */

export const OFFSCREEN_COORDINATE = { latitude: -90, longitude: 0 } as const;

/** Pin tip at coordinate — matches MapKit native `image` anchoring on iOS. */
const ANCHOR_PIN_TIP = { x: 0.5, y: 1 } as const;
const MARKER_Z_INDEX = 1;
const SELECTED_MARKER_Z_INDEX = 1000;

/** Logical dp size — iOS native image scales similarly; Android needs explicit layout. */
const PAW_MARKER_SIZE = 48;

const CLUSTER_OUTER_SIZE = 70;
const CLUSTER_INNER_SIZE = 54;
const CLUSTER_ICON_SIZE = 24;
const TRACKS_TIMEOUT_MS = Platform.OS === "android" ? 2000 : 1000;

/* ── Styles ─────────────────────────────────────────────────────────────── */

const S = StyleSheet.create({
  androidPawRoot: {
    width: PAW_MARKER_SIZE,
    height: PAW_MARKER_SIZE,
    backgroundColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  androidPawImage: {
    width: PAW_MARKER_SIZE,
    height: PAW_MARKER_SIZE,
  },
  clusterOuter: {
    width: CLUSTER_OUTER_SIZE,
    height: CLUSTER_OUTER_SIZE,
    backgroundColor: "transparent",
    justifyContent: "center",
    alignItems: "center",
    overflow: "visible",
  },
  clusterBubbleInner: {
    width: CLUSTER_INNER_SIZE,
    height: CLUSTER_INNER_SIZE,
    borderRadius: CLUSTER_INNER_SIZE / 2,
    overflow: "hidden",
    backgroundColor: "#ffffff",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#e2e2e2",
    ...Platform.select({ android: { elevation: 0 } }),
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

/* ── Paw markers ────────────────────────────────────────────────────────── */

type PawMarkerProps = {
  identifier: string;
  coordinate: { latitude: number; longitude: number };
  source: number;
  tracksViewChanges: boolean;
  onPress?: () => void;
  zIndex?: number;
};

/** iOS: native bitmap (no snapshot). Android: fixed dp view — matches size + hit box. */
const PawMarker = memo(function PawMarker({
  identifier,
  coordinate,
  source,
  tracksViewChanges,
  onPress,
  zIndex,
}: PawMarkerProps) {
  if (Platform.OS === "ios") {
    return (
      <MarkerWrapper
        identifier={identifier}
        coordinate={coordinate}
        anchor={ANCHOR_PIN_TIP}
        image={source}
        tracksViewChanges={false}
        onPress={onPress}
        zIndex={zIndex}
      />
    );
  }

  return (
    <MarkerWrapper
      identifier={identifier}
      coordinate={coordinate}
      anchor={ANCHOR_PIN_TIP}
      tracksViewChanges={tracksViewChanges}
      onPress={onPress}
      zIndex={zIndex}
    >
      <View style={S.androidPawRoot} collapsable={false}>
        <Image
          source={source}
          style={S.androidPawImage}
          resizeMode="contain"
        />
      </View>
    </MarkerWrapper>
  );
});

/* ── Cluster bubble (custom view — dynamic count badge) ─────────────────── */

const ClusterBubble = memo(function ClusterBubble({
  count,
  onLayout,
}: {
  count: number;
  onLayout?: () => void;
}) {
  return (
    <View
      style={S.clusterOuter}
      collapsable={false}
      onLayout={onLayout}
      {...Platform.select({
        ios: { needsOffscreenAlphaCompositing: true },
        default: {},
      })}
    >
      <View style={S.clusterBubbleInner} collapsable={false}>
        <Ionicons name="paw" size={CLUSTER_ICON_SIZE} color="#1a1a2e" />
      </View>
      <View style={S.badge} collapsable={false}>
        <Text style={S.badgeText}>{count > 99 ? "99+" : count}</Text>
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

    const handleClusterLayout = useCallback(() => {
      setIsTracking(false);
    }, []);

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

    const markerId = `pool-${index}`;
    const androidTracksPaw = Platform.OS === "android" && isTracking;

    if (slot.kind === "cluster") {
      return (
        <MarkerWrapper
          identifier={markerId}
          coordinate={slot.coordinate}
          anchor={ANCHOR_PIN_TIP}
          tracksViewChanges={isTracking}
          onPress={handlePress}
          zIndex={MARKER_Z_INDEX}
        >
          <ClusterBubble
            count={slot.clusterCount}
            onLayout={handleClusterLayout}
          />
        </MarkerWrapper>
      );
    }

    if (slot.kind === "single") {
      return (
        <PawMarker
          identifier={markerId}
          coordinate={slot.coordinate}
          source={PAW_PROVIDER_IMAGE}
          tracksViewChanges={androidTracksPaw}
          onPress={handlePress}
          zIndex={MARKER_Z_INDEX}
        />
      );
    }

    return (
      <MarkerWrapper
        identifier={markerId}
        coordinate={slot.coordinate}
        anchor={ANCHOR_PIN_TIP}
        tracksViewChanges={false}
        onPress={handlePress}
        zIndex={MARKER_Z_INDEX}
      />
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
    }, [isActive, providerId]);

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

    const androidTracks = Platform.OS === "android" && isTracking;

    return (
      <PawMarker
        identifier="selected-overlay"
        coordinate={coordinate}
        source={PAW_SELECTED_IMAGE}
        tracksViewChanges={androidTracks}
        zIndex={SELECTED_MARKER_Z_INDEX}
      />
    );
  },
  (prev, next) =>
    prev.providerId === next.providerId &&
    prev.latitude === next.latitude &&
    prev.longitude === next.longitude,
);
