/**
 * Pre-rendered marker bitmaps for the Explore map.
 *
 * Production pattern used by Wolt / Uber / Mapbox: render the marker visuals
 * once at app launch to PNG bitmaps via `react-native-view-shot`, then pass the
 * resulting file URIs to `<Marker image={...} />`.
 *
 * The native `image` prop on `<Marker>` draws the bitmap directly via
 * MKAnnotationView (iOS) / BitmapDescriptor (Android) — no React view snapshot
 * is needed at runtime, eliminating the pink-pin fallback flash on iOS and
 * empty-snapshot artifacts on Android.
 *
 * The hidden `<MarkerBitmapPrerender>` component must be mounted somewhere in
 * the React tree (typically once in `App.tsx`). It renders the marker
 * prototypes inside an off-screen View, captures each to a tmpfile PNG, and
 * stores the resulting URI in module-level state.
 *
 * Consumers read URIs via `useMarkerBitmapUris()` (re-renders when bitmaps
 * become available) or `getProviderBitmapUri()` / `getSelectedBitmapUri()`
 * (synchronous read; may return `null` for the brief moment before first
 * capture completes).
 *
 * Cluster bitmaps are cached per count value because the count text is baked
 * into the bitmap. Counts are requested lazily; until the bitmap is ready, the
 * marker renders a fallback View.
 */

import React, {
  createContext,
  memo,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { View, Platform } from "react-native";
import { captureRef } from "react-native-view-shot";
import {
  ProviderPinView,
  SelectedPinView,
  ClusterPinView,
  PIN_OUTER,
  SELECTED_OUTER,
  CLUSTER_OUTER,
} from "./markerPinViews";

type BitmapUris = {
  providerUri: string | null;
  selectedUri: string | null;
  /** Get cluster URI for `count`. Triggers lazy capture if not yet cached. */
  getClusterUri: (count: number) => string | null;
};

const MarkerBitmapContext = createContext<BitmapUris>({
  providerUri: null,
  selectedUri: null,
  getClusterUri: () => null,
});

export function useMarkerBitmapUris(): BitmapUris {
  return useContext(MarkerBitmapContext);
}

/**
 * Captures a child view via `captureRef`. Returns a file URI suitable for
 * `<Image source={{ uri }} />` or `<Marker image={{ uri }} />`.
 *
 * `result: "tmpfile"` writes a PNG to the OS temp directory — survives across
 * map rerenders without re-encoding.
 */
async function captureView(ref: React.RefObject<View | null>): Promise<string | null> {
  if (!ref.current) return null;
  try {
    const uri = await captureRef(ref as React.RefObject<View>, {
      format: "png",
      quality: 1,
      result: "tmpfile",
    });
    return uri;
  } catch {
    return null;
  }
}

type PrerenderProps = {
  children?: ReactNode;
};

/**
 * Mount once at the app root. Renders the marker prototypes in an off-screen
 * hidden container, captures each to a PNG, and provides the URIs via context.
 */
export const MarkerBitmapPrerender = memo(function MarkerBitmapPrerender({
  children,
}: PrerenderProps) {
  const providerRef = useRef<View>(null);
  const selectedRef = useRef<View>(null);
  /** Hidden cluster wrapper refs keyed by count. */
  const clusterRefs = useRef<Map<number, View | null>>(new Map());

  const [providerUri, setProviderUri] = useState<string | null>(null);
  const [selectedUri, setSelectedUri] = useState<string | null>(null);
  const [clusterUris, setClusterUris] = useState<Map<number, string>>(
    () => new Map(),
  );
  const [requestedCounts, setRequestedCounts] = useState<Set<number>>(
    () => new Set(),
  );

  // Capture the two static markers (provider + selected) after first layout.
  // Retries with a longer delay if the first attempt fails (e.g. Ionicons font
  // not yet loaded on a cold-start), so the bitmap always renders correctly.
  useEffect(() => {
    let cancelled = false;

    const tryCapture = async (delayMs: number) => {
      if (delayMs > 0) {
        await new Promise((r) => setTimeout(r, delayMs));
      } else {
        await new Promise((r) => requestAnimationFrame(() => r(null)));
        await new Promise((r) => requestAnimationFrame(() => r(null)));
      }
      if (cancelled) return;
      const [p, s] = await Promise.all([
        captureView(providerRef),
        captureView(selectedRef),
      ]);
      if (cancelled) return;
      if (p) setProviderUri(p);
      if (s) setSelectedUri(s);
      return Boolean(p && s);
    };

    const run = async () => {
      const ok = await tryCapture(0);
      if (cancelled || ok) return;
      // Cold-start retry — give the font / native layout an extra moment.
      const ok2 = await tryCapture(250);
      if (cancelled || ok2) return;
      await tryCapture(750);
    };
    run();

    return () => {
      cancelled = true;
    };
  }, []);

  // Capture any new cluster counts requested by consumers.
  useEffect(() => {
    let cancelled = false;
    const pendingCounts = [...requestedCounts].filter(
      (n) => !clusterUris.has(n),
    );
    if (pendingCounts.length === 0) return;

    const run = async () => {
      await new Promise((r) => requestAnimationFrame(() => r(null)));
      await new Promise((r) => requestAnimationFrame(() => r(null)));
      const captured = await Promise.all(
        pendingCounts.map(async (n) => {
          const ref = { current: clusterRefs.current.get(n) ?? null };
          const uri = await captureView(ref as React.RefObject<View | null>);
          return [n, uri] as const;
        }),
      );
      if (cancelled) return;
      setClusterUris((prev) => {
        const next = new Map(prev);
        for (const [n, uri] of captured) {
          if (uri) next.set(n, uri);
        }
        return next;
      });
    };
    run();

    return () => {
      cancelled = true;
    };
  }, [requestedCounts, clusterUris]);

  const getClusterUri = useCallback(
    (count: number) => {
      const cached = clusterUris.get(count);
      if (cached) return cached;
      // Lazily request a capture for this count.
      if (!requestedCounts.has(count)) {
        // Defer state update out of render path.
        setTimeout(() => {
          setRequestedCounts((prev) => {
            if (prev.has(count)) return prev;
            const next = new Set(prev);
            next.add(count);
            return next;
          });
        }, 0);
      }
      return null;
    },
    [clusterUris, requestedCounts],
  );

  const contextValue = React.useMemo(
    () => ({ providerUri, selectedUri, getClusterUri }),
    [providerUri, selectedUri, getClusterUri],
  );

  return (
    <MarkerBitmapContext.Provider value={contextValue}>
      {children}
      {/*
       * Off-screen hidden container — laid out far above the screen so it is
       * never visible / interactive. Sized so child marker views can lay out
       * normally and be captured.
       *
       * pointerEvents="none" prevents any accidental touches.
       * collapsable={false} keeps the native view alive on Android.
       */}
      <View
        pointerEvents="none"
        collapsable={false}
        style={{
          position: "absolute",
          top: -10000,
          left: -10000,
          width: 200,
          height: 600,
          opacity: 0,
        }}
      >
        <ViewShotHost ref={providerRef} size={PIN_OUTER}>
          <ProviderPinView />
        </ViewShotHost>
        <ViewShotHost ref={selectedRef} size={SELECTED_OUTER}>
          <SelectedPinView />
        </ViewShotHost>
        {[...requestedCounts].map((count) => (
          <ViewShotHost
            key={`cluster-${count}`}
            ref={(node) => {
              clusterRefs.current.set(count, node);
            }}
            size={CLUSTER_OUTER}
          >
            <ClusterPinView count={count} />
          </ViewShotHost>
        ))}
      </View>
    </MarkerBitmapContext.Provider>
  );
});

type ViewShotHostProps = {
  size: number;
  children: ReactNode;
};

/**
 * Transparent host View around a marker prototype. `captureRef` snapshots
 * this exact view's bounds, so it must match the visible marker dimensions.
 *
 * On Android, `collapsable={false}` prevents the view from being flattened
 * away (which would invalidate the ref captureRef needs).
 */
const ViewShotHost = React.forwardRef<View, ViewShotHostProps>(
  function ViewShotHost({ size, children }, ref) {
    return (
      <View
        ref={ref}
        collapsable={false}
        style={{
          width: size,
          height: size,
          // Transparent background so PNG export keeps anti-aliased edges clean.
          backgroundColor: "transparent",
          ...(Platform.OS === "android" ? { elevation: 0 } : null),
        }}
      >
        {children}
      </View>
    );
  },
);
