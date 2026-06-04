import { useCallback, useMemo } from "react";
import {
  DeviceEventEmitter,
  View,
  Text,
  Pressable,
  Modal,
  StyleSheet,
  useWindowDimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "../store/authStore";
import { usePetsStore } from "../store/petsStore";
import { useTranslation } from "../i18n";
import { useTheme } from "../theme/ThemeContext";
import { showGlobalAlertCompat } from "./global-modal";
import { rootNavigate } from "../navigation/rootNavigation";
import { EXPLORE_CLEAR_BEFORE_LOGIN_EVENT } from "../navigation/navigateToLoginClearingStack";

export type SosOptionsModalProps = {
  visible: boolean;
  onClose: () => void;
};

export function SosOptionsModal({ visible, onClose }: SosOptionsModalProps) {
  const { width } = useWindowDimensions();
  const { t, isRTL } = useTranslation();
  const { colors } = useTheme();
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const hasPets = usePetsStore((s) => s.pets.length > 0);

  const requireAuth = useCallback(
    (then: () => void) => {
      if (!isLoggedIn) {
        onClose();
        DeviceEventEmitter.emit(EXPLORE_CLEAR_BEFORE_LOGIN_EVENT);
        rootNavigate("Login", { screen: "LoginScreen" });
        return;
      }
      then();
    },
    [isLoggedIn, onClose],
  );

  const onReportLost = useCallback(() => {
    onClose();
    requireAuth(() => {
      if (!hasPets) {
        showGlobalAlertCompat(t("errorTitle"), t("reportFoundNoPetsForLost"));
        return;
      }
      rootNavigate("ReportLost");
    });
  }, [onClose, requireAuth, hasPets, t]);

  const onReportFound = useCallback(() => {
    onClose();
    requireAuth(() => {
      rootNavigate("ReportFound");
    });
  }, [onClose, requireAuth]);

  const onEmergencyVet = useCallback(() => {
    onClose();
    requireAuth(() => {
      rootNavigate("EmergencyVets");
    });
  }, [onClose, requireAuth]);

  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[styles.sheet, { width: Math.min(360, width - 32) }]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={styles.sheetHeader}>
            <View style={styles.headerIconBg}>
              <Ionicons name="warning" size={24} color={colors.danger} />
            </View>
            <Text style={styles.sheetTitle}>{t("sosModalTitle")}</Text>
          </View>

          {!isLoggedIn && (
            <Text
              style={[styles.sheetHint, isRTL && { textAlign: "right" }]}
            >
              {t("loginRequiredSos")}
            </Text>
          )}

          <Pressable
            onPress={onReportLost}
            style={({ pressed }) => [
              styles.optionBtn,
              styles.optionLostBorder,
              { backgroundColor: pressed ? "#fef3c7" : "#fffbeb" },
            ]}
          >
            <View style={[styles.optionRow, isRTL && styles.optionRowRTL]}>
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

          <Pressable
            onPress={onEmergencyVet}
            style={({ pressed }) => [
              styles.optionBtn,
              styles.optionEmergencyBorder,
              {
                backgroundColor: colors.dangerLight,
                opacity: pressed ? 0.85 : 1,
              },
            ]}
          >
            <View style={[styles.optionRow, isRTL && styles.optionRowRTL]}>
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

          <Pressable
            onPress={onReportFound}
            style={({ pressed }) => [
              styles.optionBtn,
              styles.optionFoundBorder,
              { backgroundColor: pressed ? "#d1fae5" : "#ecfdf5" },
            ]}
          >
            <View style={[styles.optionRow, isRTL && styles.optionRowRTL]}>
              <View
                style={[styles.optionIcon, { backgroundColor: "#10b981" }]}
              >
                <Ionicons name="search" size={24} color="#fff" />
              </View>
              <View style={styles.optionTextWrap}>
                <Text
                  style={[
                    styles.optionTitle,
                    { color: "#065f46", textAlign: isRTL ? "right" : "left" },
                  ]}
                >
                  {t("sosOptionFoundPet")}
                </Text>
                <Text
                  style={[
                    styles.optionDesc,
                    { color: "#047857", textAlign: isRTL ? "right" : "left" },
                  ]}
                  numberOfLines={2}
                >
                  {t("sosOptionFoundPetDesc")}
                </Text>
              </View>
              <Ionicons
                name={isRTL ? "chevron-back" : "chevron-forward"}
                size={20}
                color="#059669"
              />
            </View>
          </Pressable>

          <Pressable
            onPress={onClose}
            style={({ pressed }) => ({
              marginTop: 4,
              alignItems: "center",
              paddingVertical: 14,
              borderRadius: 12,
              backgroundColor: pressed
                ? colors.surfaceSecondary
                : "transparent",
            })}
          >
            <Text style={styles.cancelText}>{t("cancel")}</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function createStyles(colors: ReturnType<typeof useTheme>["colors"]) {
  return StyleSheet.create({
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
    optionFoundBorder: {
      borderColor: "#a7f3d0",
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
