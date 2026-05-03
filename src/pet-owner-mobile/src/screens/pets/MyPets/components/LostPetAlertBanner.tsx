import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
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
          style={({ pressed }) => [
            styles.cta,
            { flexDirection: row },
            pressed && !loading ? styles.ctaPressed : null,
            loading ? styles.ctaDisabled : null,
          ]}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={20} color="#fff" />
              <Text style={styles.ctaText}>{t("markFoundBtn")}</Text>
            </>
          )}
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
  cta: {
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#22c55e",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    minHeight: 48,
    flexShrink: 0,
  },
  ctaPressed: {
    opacity: 0.92,
  },
  ctaDisabled: {
    opacity: 0.7,
  },
  ctaText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "800",
  },
});
