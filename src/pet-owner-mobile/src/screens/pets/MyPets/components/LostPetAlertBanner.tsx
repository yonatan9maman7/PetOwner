import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation, rowDirectionForAppLayout } from "../../../../i18n";

type Props = {
  isRTL: boolean;
  onMarkFoundPress: () => void;
  loading?: boolean;
};

export function LostPetAlertBanner({
  isRTL,
  onMarkFoundPress,
  loading,
}: Props) {
  const { t, rtlStyle } = useTranslation();
  const row = rowDirectionForAppLayout(isRTL);

  return (
    <View style={styles.outer}>
      <View style={[styles.inner, { flexDirection: row }]}>
        <View style={styles.iconWrap}>
          <Ionicons name="warning" size={22} color="#c2410c" />
        </View>
        <View style={styles.textCol}>
          <Text style={[styles.title, rtlStyle]}>{t("lostLabel")}</Text>
          <Text style={[styles.body, rtlStyle]}>{t("petLostActiveBanner")}</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("markFoundBtn")}
          onPress={onMarkFoundPress}
          disabled={loading}
          android_ripple={{
            color: "rgba(255,255,255,0.28)",
            foreground: true,
          }}
          style={({ pressed }) => [
            styles.ctaPressable,
            pressed && !loading ? styles.ctaPressed : null,
            loading ? styles.ctaDisabled : null,
          ]}
        >
          <View style={[styles.cta, { flexDirection: row }]}>
            {loading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                <Text style={styles.ctaText}>{t("markFoundBtn")}</Text>
              </>
            )}
          </View>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#fdba74",
    backgroundColor: "#fff7ed",
    overflow: "hidden",
  },
  inner: {
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 14,
    gap: 12,
    flexWrap: "wrap",
  },
  iconWrap: {
    alignSelf: "flex-start",
    paddingTop: 2,
    width: 28,
    alignItems: "center",
  },
  textCol: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 15,
    fontWeight: "900",
    color: "#9a3412",
    marginBottom: 4,
  },
  body: {
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "600",
    color: "#c2410c",
  },
  ctaPressable: {
    borderRadius: 12,
    flexShrink: 0,
  },
  cta: {
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#22c55e",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    minHeight: 48,
    flexShrink: 0,
    ...Platform.select({
      android: { elevation: 3 },
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.18,
        shadowRadius: 3,
      },
      default: {},
    }),
  },
  ctaPressed: {
    opacity: 0.92,
  },
  ctaDisabled: {
    opacity: 0.7,
  },
  ctaText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "bold",
  },
});
