import { useEffect, useMemo, useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBottomSafeInset } from "../hooks/useBottomSafeInset";
import { getFocusedRouteNameFromRoute } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "../store/authStore";
import { useMyPetsUiStore } from "../store/myPetsUiStore";
import { useTranslation } from "../i18n";
import { useTheme } from "../theme/ThemeContext";
import { navigationRef } from "../navigation/navigationRef";
import { SosOptionsModal } from "./SosOptionsModal";

/** Sits just above the tab bar. */
const TAB_BAR_OFFSET = 72;

/** Pets stack screens where the global SOS FAB would duplicate the flow or cover inputs. */
const MY_PETS_STACK_HIDE_SOS = new Set<string>([
  "ReportLost",
  "ReportFound",
  "EmergencyVets",
  "AddPet",
  "Triage",
  "ActivityLog",
]);

function checkSosFabVisible(): boolean {
  if (!navigationRef.isReady()) return false;
  const state = navigationRef.getRootState();
  if (!state?.routes?.length) return false;
  const tabRoute = state.routes[state.index];
  if (tabRoute.name !== "MyPets") return false;

  const focused = getFocusedRouteNameFromRoute(tabRoute);
  if (focused != null) return focused === "MyPetsMain";

  const innerState = tabRoute.state;
  if (!innerState?.routes?.length) return true;
  const innerRoute = innerState.routes[innerState.index ?? 0];
  if (!innerRoute?.name) return true;
  if (MY_PETS_STACK_HIDE_SOS.has(innerRoute.name)) return false;
  return innerRoute.name === "MyPetsMain";
}

function useSosFabVisible(): boolean {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(checkSosFabVisible());
    return navigationRef.addListener("state", () => {
      setVisible(checkSosFabVisible());
    });
  }, []);

  return visible;
}

export function GlobalSosFab() {
  const insets = useSafeAreaInsets();
  const bottomInset = useBottomSafeInset();
  const { t, isRTL } = useTranslation();
  const { colors } = useTheme();
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const sectionDetailOpen = useMyPetsUiStore((s) => s.sectionDetailOpen);
  const navAllowsFab = useSosFabVisible();
  const visible = navAllowsFab && !sectionDetailOpen;
  const [menuOpen, setMenuOpen] = useState(false);

  const bottom = bottomInset + TAB_BAR_OFFSET;
  const edge = 20;
  const horizontalStyle = isRTL
    ? { left: Math.max(edge, insets.left) }
    : { right: Math.max(edge, insets.right) };

  const styles = useMemo(() => createStyles(colors), [colors]);

  if (!visible || !isLoggedIn) return null;

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t("sosFabHint")}
        onPress={() => setMenuOpen(true)}
        style={[styles.wrapper, { bottom }, horizontalStyle]}
      >
        <View style={styles.fab}>
          <Ionicons name="warning" size={26} color="#fff" />
          <Text style={styles.fabLabel}>SOS</Text>
        </View>
      </Pressable>

      <SosOptionsModal
        visible={menuOpen}
        onClose={() => setMenuOpen(false)}
      />
    </>
  );
}

function createStyles(colors: ReturnType<typeof useTheme>["colors"]) {
  return StyleSheet.create({
    wrapper: {
      position: "absolute",
      zIndex: 10000,
      elevation: 30,
    },
    fab: {
      width: 58,
      height: 58,
      borderRadius: 29,
      backgroundColor: colors.danger,
      alignItems: "center",
      justifyContent: "center",
      shadowColor: "#991b1b",
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.5,
      shadowRadius: 12,
      elevation: 14,
      borderWidth: 3,
      borderColor: "#fecaca",
    },
    fabLabel: {
      color: "#fff",
      fontSize: 9,
      fontWeight: "800",
      letterSpacing: 1,
      marginTop: -2,
    },
  });
}
