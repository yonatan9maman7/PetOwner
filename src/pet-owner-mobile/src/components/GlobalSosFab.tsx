import { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  Pressable,
  Modal,
  StyleSheet,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  useNavigation,
  useNavigationState,
} from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "../store/authStore";
import { useMyPetsUiStore } from "../store/myPetsUiStore";
import { usePetsStore } from "../store/petsStore";
import { useTranslation } from "../i18n";
import { useTheme } from "../theme/ThemeContext";

/** Sits just above the tab bar. */
const TAB_BAR_OFFSET = 72;

function getFocusedRouteName(state: any): string | undefined {
  if (!state?.routes?.length) return undefined;
  const route = state.routes[state.index];
  if (route.state?.routes?.length) {
    const inner = route.state.routes[route.state.index];
    return inner?.name;
  }
  return route.name;
}

function useSosFabVisible(): boolean {
  return useNavigationState((state) => {
    if (!state?.routes?.length) return false;
    const tabRoute = state.routes[state.index];
    if (tabRoute.name !== "MyPets") return false;

    const innerState = tabRoute.state;
    if (!innerState?.routes?.length) return true;
    const innerRoute = innerState.routes[innerState.index!];
    return innerRoute?.name === "MyPetsMain";
  });
}

export function GlobalSosFab() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { t, isRTL } = useTranslation();
  const { colors } = useTheme();
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const hasPets = usePetsStore((s) => s.pets.length > 0);
  const sectionDetailOpen = useMyPetsUiStore((s) => s.sectionDetailOpen);
  const navAllowsFab = useSosFabVisible();
  const visible = navAllowsFab && !sectionDetailOpen;
  const [menuOpen, setMenuOpen] = useState(false);

  const bottom = insets.bottom + TAB_BAR_OFFSET;
  const edge = 20;
  const horizontalStyle = isRTL
    ? { left: Math.max(edge, insets.left) }
    : { right: Math.max(edge, insets.right) };

  const requireAuth = useCallback(
    (then: () => void) => {
      if (!isLoggedIn) {
        setMenuOpen(false);
        navigation.navigate("Login");
        return;
      }
      then();
    },
    [isLoggedIn, navigation],
  );

  const onReportLost = useCallback(() => {
    setMenuOpen(false);
    requireAuth(() => {
      navigation.navigate("MyPets", { screen: "ReportLost" });
    });
  }, [navigation, requireAuth]);

  const onEmergencyVet = useCallback(() => {
    setMenuOpen(false);
    requireAuth(() => {
      navigation.navigate("MyPets", { screen: "EmergencyVets" });
    });
  }, [navigation, requireAuth]);

  const styles = useMemo(() => createStyles(colors), [colors]);

  if (!visible || !isLoggedIn || !hasPets) return null;

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t("sosFabHint")}
        onPress={() => setMenuOpen(true)}
        style={[
          styles.wrapper,
          { bottom },
          horizontalStyle,
        ]}
      >
        <View style={styles.fab}>
          <Ionicons name="warning" size={26} color="#fff" />
          <Text style={styles.fabLabel}>SOS</Text>
        </View>
      </Pressable>

      <Modal
        visible={menuOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuOpen(false)}
      >
        <Pressable
          style={styles.backdrop}
          onPress={() => setMenuOpen(false)}
        >
          <Pressable
            style={[
              styles.sheet,
              { width: Math.min(360, width - 32) },
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <View style={styles.sheetHeader}>
              <View style={styles.headerIconBg}>
                <Ionicons name="warning" size={24} color={colors.danger} />
              </View>
              <Text style={styles.sheetTitle}>
                {t("sosModalTitle")}
              </Text>
            </View>

            {!isLoggedIn && (
              <Text
                style={[
                  styles.sheetHint,
                  isRTL && { textAlign: "right" },
                ]}
              >
                {t("loginRequiredSos")}
              </Text>
            )}

            {/* Report Lost */}
            <Pressable
              onPress={onReportLost}
              style={({ pressed }) => [
                styles.optionBtn,
                styles.optionLostBorder,
                { backgroundColor: pressed ? "#fef3c7" : "#fffbeb" },
              ]}
            >
              <View
                style={[
                  styles.optionRow,
                  isRTL && styles.optionRowRTL,
                ]}
              >
                <View
                  style={[styles.optionIcon, { backgroundColor: "#f59e0b" }]}
                >
                  <Ionicons name="paw" size={24} color="#fff" />
                </View>
                <View style={styles.optionTextWrap}>
                  <Text
                    style={[
                      styles.optionTitle,
                      { color: "#92400e", textAlign: isRTL ? "right" : "left" },
                    ]}
                  >
                    {t("sosOptionReportLost")}
                  </Text>
                  <Text
                    style={[
                      styles.optionDesc,
                      { color: "#a16207", textAlign: isRTL ? "right" : "left" },
                    ]}
                    numberOfLines={2}
                  >
                    {t("sosOptionReportLostDesc")}
                  </Text>
                </View>
                <Ionicons
                  name={isRTL ? "chevron-back" : "chevron-forward"}
                  size={20}
                  color="#d97706"
                />
              </View>
            </Pressable>

            {/* Emergency Vet */}
            <Pressable
              onPress={onEmergencyVet}
              style={({ pressed }) => [
                styles.optionBtn,
                styles.optionEmergencyBorder,
                { backgroundColor: colors.dangerLight, opacity: pressed ? 0.85 : 1 },
              ]}
            >
              <View
                style={[
                  styles.optionRow,
                  isRTL && styles.optionRowRTL,
                ]}
              >
                <View
                  style={[styles.optionIcon, { backgroundColor: colors.danger }]}
                >
                  <Ionicons name="medkit" size={24} color="#fff" />
                </View>
                <View style={styles.optionTextWrap}>
                  <Text
                    style={[
                      styles.optionTitle,
                      { color: "#991b1b", textAlign: isRTL ? "right" : "left" },
                    ]}
                  >
                    {t("sosOptionEmergencyVet")}
                  </Text>
                  <Text
                    style={[
                      styles.optionDesc,
                      { color: "#b91c1c", textAlign: isRTL ? "right" : "left" },
                    ]}
                    numberOfLines={2}
                  >
                    {t("sosOptionEmergencyVetDesc")}
                  </Text>
                </View>
                <Ionicons
                  name={isRTL ? "chevron-back" : "chevron-forward"}
                  size={20}
                  color={colors.danger}
                />
              </View>
            </Pressable>

            {/* Cancel */}
            <Pressable
              onPress={() => setMenuOpen(false)}
              style={({ pressed }) => ({
                marginTop: 4,
                alignItems: "center",
                paddingVertical: 14,
                borderRadius: 12,
                backgroundColor: pressed ? colors.surfaceSecondary : "transparent",
              })}
            >
              <Text style={styles.cancelText}>{t("cancel")}</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
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
    fabPressed: {
      opacity: 0.88,
    },
    fabLabel: {
      color: "#fff",
      fontSize: 9,
      fontWeight: "800",
      letterSpacing: 1,
      marginTop: -2,
    },
    backdrop: {
      flex: 1,
      backgroundColor: colors.overlay,
      justifyContent: "center",
      alignItems: "center",
    },
    sheet: {
      backgroundColor: colors.surface,
      borderRadius: 24,
      padding: 24,
      gap: 12,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.25,
      shadowRadius: 32,
      elevation: 24,
    },
    sheetHeader: {
      alignItems: "center",
      gap: 10,
      marginBottom: 4,
    },
    headerIconBg: {
      width: 52,
      height: 52,
      borderRadius: 26,
      backgroundColor: colors.dangerLight,
      alignItems: "center",
      justifyContent: "center",
    },
    sheetTitle: {
      fontSize: 20,
      fontWeight: "800",
      color: colors.text,
      textAlign: "center",
    },
    sheetHint: {
      fontSize: 13,
      color: colors.textSecondary,
      textAlign: "center",
      marginBottom: 4,
    },
    optionBtn: {
      borderRadius: 16,
      borderWidth: 1.5,
      paddingVertical: 14,
      paddingHorizontal: 16,
    },
    optionLostBorder: {
      borderColor: "#fde68a",
    },
    optionEmergencyBorder: {
      borderColor: "#fecaca",
    },
    optionRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 14,
    },
    optionRowRTL: {
      flexDirection: "row-reverse",
    },
    optionIcon: {
      width: 48,
      height: 48,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
    },
    optionTextWrap: {
      flex: 1,
    },
    optionTitle: {
      fontSize: 16,
      fontWeight: "700",
      marginBottom: 3,
    },
    optionDesc: {
      fontSize: 12,
      fontWeight: "500",
      lineHeight: 17,
    },
    cancelText: {
      fontSize: 15,
      fontWeight: "600",
      color: colors.textSecondary,
    },
  });
}
