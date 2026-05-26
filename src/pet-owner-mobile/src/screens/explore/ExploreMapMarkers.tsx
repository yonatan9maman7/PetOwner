/**
 * Explore map markers — production-grade bitmap-based rendering.
 *
 * Architecture (used by Wolt / Uber / Mapbox-style production map apps):
 *
 *  1. The React marker visuals (paw + circle + selection / cluster badge)
 *     live in `markerPinViews.tsx`. They are NEVER mounted as `<Marker>`
 *     children at runtime.
 *
 *  2. `MarkerBitmapPrerender` (mounted in `App.tsx`) renders these views once
 *     off-screen, captures each to a PNG via `react-native-view-shot`, and
 *     exposes the resulting file URIs through React context.
 *
 *  3. `<Marker image={{ uri }} />` draws those bitmaps directly via
 *     MKAnnotationView (iOS) / BitmapDescriptor (Android). There is no
 *     React-view snapshot at runtime, so:
 *      • No pink default-pin fallback on iOS when slots transition.
 *      • No empty-bitmap snapshots on Android during zoom.
 *      • `tracksViewChanges` can stay `false` permanently — perfect perf.
 *
 *  4. Pool invariant kept: slots are mounted for the lifetime of the pool;
 *     offscreen slots park at `OFFSCREEN_COORDINATE`. The only thing changing
 *     between zoom levels is the `image` URI handed to a slot — a cheap
 *     native bitmap swap.
 *
 * Cluster bitmaps are cached per count value (each count = different badge).
 * If a brand-new count appears before its bitmap is ready, the marker briefly
 * uses the provider bitmap as a fallback — still no pink pin.
 */

import React, { memo, useCallback } from "react";
import { MarkerWrapper } from "../../components/MapViewWrapper";
import type { MapPinDto } from "../../types/api";
import { useMarkerBitmapUris } from "./markerBitmapCache";

/* ── Constants ──────────────────────────────────────────────────────────── */

export const OFFSCREEN_COORDINATE = { latitude: -90, longitude: 0 } as const;

const ANCHOR_CENTER = { x: 0.5, y: 0.5 } as const;

const MARKER_Z = 1;
const SELECTED_Z = 1000;

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

/* ── PooledMarker ───────────────────────────────────────────────────────── */

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
  const { providerUri, getClusterUri } = useMarkerBitmapUris();

  const handlePress = useCallback(() => {
    if (slot.kind === "single" && slot.providerId) {
      onPressProviderId(slot.providerId);
    } else if (slot.kind === "cluster" && slot.clusterPins) {
      onPressClusterPins(slot.clusterPins, slot.coordinate);
    }
  }, [slot, onPressProviderId, onPressClusterPins]);

  // ── Cluster ─────────────────────────────────────────────────────────────
  if (slot.kind === "cluster") {
    const clusterUri = getClusterUri(slot.clusterCount);
    const imageUri = clusterUri ?? providerUri;
    if (!imageUri) return null;
    return (
      <MarkerWrapper
        identifier={`pool-${index}`}
        coordinate={slot.coordinate}
        anchor={ANCHOR_CENTER}
        tracksViewChanges={false}
        onPress={handlePress}
        zIndex={MARKER_Z}
        image={{ uri: imageUri }}
      />
    );
  }

  // ── Single / offscreen ─────────────────────────────────────────────────
  const isVisible = slot.kind === "single";
  const coordinate = isVisible ? slot.coordinate : OFFSCREEN_COORDINATE;

  if (!providerUri) return null;

  return (
    <MarkerWrapper
      identifier={`pool-${index}`}
      coordinate={coordinate}
      anchor={ANCHOR_CENTER}
      tracksViewChanges={false}
      onPress={isVisible ? handlePress : undefined}
      zIndex={MARKER_Z}
      image={{ uri: providerUri }}
    />
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
    const { selectedUri } = useMarkerBitmapUris();

    const isActive =
      providerId != null && latitude != null && longitude != null;

    const coordinate = isActive
      ? { latitude: Number(latitude), longitude: Number(longitude) }
      : OFFSCREEN_COORDINATE;

    if (!selectedUri) return null;

    return (
      <MarkerWrapper
        identifier="selected-overlay"
        coordinate={coordinate}
        anchor={ANCHOR_CENTER}
        tracksViewChanges={false}
        zIndex={SELECTED_Z}
        image={{ uri: selectedUri }}
      />
    );
  },
);
