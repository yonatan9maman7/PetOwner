/**
 * Static marker pin Views used by the Explore map.
 *
 * These views are NEVER mounted as direct children of `<Marker>` at runtime.
 * They are rendered once off-screen by `MarkerBitmapPrerender`, captured to
 * PNG via `react-native-view-shot`, and the resulting bitmap URI is passed to
 * the native `<Marker image={...} />` prop.
 *
 * Keeping them in a dedicated module:
 *  • Avoids a circular import between `ExploreMapMarkers` and `markerBitmapCache`.
 *  • Lets the prerender stay decoupled from the consumer.
 */

import { View, StyleSheet, Text, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";

/* ── Sizing ─────────────────────────────────────────────────────────────── */

export const PIN_OUTER = 44;
const PIN_INNER = 36;
const PIN_ICON = 22;

export const SELECTED_OUTER = 54;
const SELECTED_INNER = 46;
const SELECTED_ICON = 26;

export const CLUSTER_OUTER = 52;
const CLUSTER_INNER = 40;
const CLUSTER_ICON = 20;

/* ── Colors ─────────────────────────────────────────────────────────────── */

const BRAND_PRIMARY = "#001a5a";
const PAW_COLOR = "#1a1a2e";
const PAW_COLOR_SELECTED = "#ffffff";

/* ── Styles ─────────────────────────────────────────────────────────────── */

const S = StyleSheet.create({
  pinOuter: {
    width: PIN_OUTER,
    height: PIN_OUTER,
    alignItems: "center",
    justifyContent: "center",
    ...Platform.select({ android: { elevation: 2 }, default: {} }),
  },
  pinInner: {
    width: PIN_INNER,
    height: PIN_INNER,
    borderRadius: PIN_INNER / 2,
    backgroundColor: "#ffffff",
    borderWidth: 2,
    borderColor: "#e2e2e2",
    alignItems: "center",
    justifyContent: "center",
    ...Platform.select({
      default: {
        shadowColor: "#000",
        shadowOpacity: 0.15,
        shadowRadius: 2,
        shadowOffset: { width: 0, height: 1 },
      },
    }),
  },
  selectedOuter: {
    width: SELECTED_OUTER,
    height: SELECTED_OUTER,
    alignItems: "center",
    justifyContent: "center",
    ...Platform.select({ android: { elevation: 6 }, default: {} }),
  },
  selectedInner: {
    width: SELECTED_INNER,
    height: SELECTED_INNER,
    borderRadius: SELECTED_INNER / 2,
    backgroundColor: BRAND_PRIMARY,
    borderWidth: 3,
    borderColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    ...Platform.select({
      default: {
        shadowColor: "#000",
        shadowOpacity: 0.25,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 2 },
      },
    }),
  },
  clusterOuter: {
    width: CLUSTER_OUTER,
    height: CLUSTER_OUTER,
    alignItems: "center",
    justifyContent: "center",
    ...Platform.select({ android: { elevation: 2 }, default: {} }),
  },
  clusterInner: {
    width: CLUSTER_INNER,
    height: CLUSTER_INNER,
    borderRadius: CLUSTER_INNER / 2,
    backgroundColor: "#ffffff",
    borderWidth: 2,
    borderColor: "#e2e2e2",
    alignItems: "center",
    justifyContent: "center",
    ...Platform.select({
      default: {
        shadowColor: "#000",
        shadowOpacity: 0.15,
        shadowRadius: 2,
        shadowOffset: { width: 0, height: 1 },
      },
    }),
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
});

/* ── Views ──────────────────────────────────────────────────────────────── */

export function ProviderPinView() {
  return (
    <View style={S.pinOuter} collapsable={false}>
      <View style={S.pinInner} collapsable={false}>
        <Ionicons name="paw" size={PIN_ICON} color={PAW_COLOR} />
      </View>
    </View>
  );
}

export function SelectedPinView() {
  return (
    <View style={S.selectedOuter} collapsable={false}>
      <View style={S.selectedInner} collapsable={false}>
        <Ionicons name="paw" size={SELECTED_ICON} color={PAW_COLOR_SELECTED} />
      </View>
    </View>
  );
}

export function ClusterPinView({ count }: { count: number }) {
  return (
    <View style={S.clusterOuter} collapsable={false}>
      <View style={S.clusterInner} collapsable={false}>
        <Ionicons name="paw" size={CLUSTER_ICON} color={PAW_COLOR} />
      </View>
      <View style={S.badge} collapsable={false}>
        <Text style={S.badgeText}>{count > 99 ? "99+" : count}</Text>
      </View>
    </View>
  );
}
