import { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  Pressable,
  Switch,
  Alert,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useTranslation } from "../../i18n";
import { useTheme } from "../../theme/ThemeContext";

interface NotifPref {
  key: string;
  labelKey: string;
  icon: string;
  iconColor: string;
  bgColor: string;
}

export function NotificationSettingsScreen() {
  const navigation = useNavigation<any>();
  const { t, isRTL, rtlText } = useTranslation();
  const { colors } = useTheme();

  const notificationPrefs: NotifPref[] = useMemo(
    () => [
      {
        key: "push",
        labelKey: "notifPush",
        icon: "notifications",
        iconColor: colors.text,
        bgColor: colors.primaryLight,
      },
      {
        key: "messages",
        labelKey: "notifMessages",
        icon: "chatbubble",
        iconColor: "#6366f1",
        bgColor: colors.iconIndigoBg,
      },
      {
        key: "bookings",
        labelKey: "notifBookings",
        icon: "calendar",
        iconColor: "#059669",
        bgColor: colors.iconGreenBg,
      },
      {
        key: "community",
        labelKey: "notifCommunity",
        icon: "people",
        iconColor: colors.warning,
        bgColor: colors.iconOrangeBg,
      },
      {
        key: "triage",
        labelKey: "notifTriage",
        icon: "heart",
        iconColor: colors.danger,
        bgColor: colors.dangerLight,
      },
      {
        key: "marketing",
        labelKey: "notifMarketing",
        icon: "megaphone",
        iconColor: "#8b5cf6",
        bgColor: colors.iconPurpleBg,
      },
    ],
    [colors],
  );

  const [prefs, setPrefs] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    const keys = ["push", "messages", "bookings", "community", "triage", "marketing"];
    for (const k of keys) init[k] = true;
    return init;
  });

  const toggle = useCallback((key: string) => {
    setPrefs((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const handleSave = () => {
    Alert.alert(t("notifSaved"));
  };

  return (
    <SafeAreaView className="flex-1" edges={["top"]} style={{ backgroundColor: colors.background, marginTop: -8 }}>
      <View
        style={{
          flexDirection: isRTL ? "row-reverse" : "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 20,
          paddingVertical: 14,
          backgroundColor: colors.surface,
          shadowColor: colors.shadow,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.06,
          shadowRadius: 8,
          elevation: 4,
        }}
      >
        <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
          <Ionicons
            name={isRTL ? "arrow-forward" : "arrow-back"}
            size={24}
            color={colors.text}
          />
        </Pressable>
        <Text style={{ fontSize: 17, fontWeight: "700", color: colors.text }}>
          {t("notifSettingsTitle")}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 24,
          paddingBottom: 140,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View
          className="rounded-2xl overflow-hidden"
          style={{
            backgroundColor: colors.surface,
            shadowColor: colors.shadow,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.04,
            shadowRadius: 8,
            elevation: 2,
          }}
        >
          {notificationPrefs.map((pref, idx) => (
            <View
              key={pref.key}
              style={{
                flexDirection: isRTL ? "row-reverse" : "row",
                alignItems: "center",
                paddingHorizontal: 20,
                paddingVertical: 16,
                gap: 14,
                borderTopWidth: idx > 0 ? 1 : 0,
                borderTopColor: colors.borderLight,
              }}
            >
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  backgroundColor: pref.bgColor,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons
                  name={pref.icon as any}
                  size={20}
                  color={pref.iconColor}
                />
              </View>
              <Text
                style={[rtlText, { flex: 1, color: colors.text }]}
                className="text-[15px] font-semibold"
              >
                {t(pref.labelKey as any)}
              </Text>
              <Switch
                value={prefs[pref.key]}
                onValueChange={() => toggle(pref.key)}
                trackColor={{ false: colors.border, true: colors.text }}
                thumbColor={colors.surface}
              />
            </View>
          ))}
        </View>
      </ScrollView>

      <SafeAreaView
        edges={["bottom"]}
        style={{
          backgroundColor: colors.surface,
          borderTopWidth: 1,
          borderTopColor: colors.borderLight,
        }}
      >
        <View className="px-6 py-4">
          <Pressable
            onPress={handleSave}
            className="py-4 rounded-full items-center active:opacity-90"
            style={{
              backgroundColor: colors.text,
              shadowColor: colors.text,
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.3,
              shadowRadius: 24,
              elevation: 12,
            }}
          >
            <Text className="font-extrabold text-lg" style={{ color: colors.textInverse }}>
              {t("save")}
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </SafeAreaView>
  );
}
