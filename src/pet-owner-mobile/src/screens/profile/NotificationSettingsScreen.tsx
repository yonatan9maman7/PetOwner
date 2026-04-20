import { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  Pressable,
  Switch,
  Alert,
  ScrollView,
  Linking,
  ActivityIndicator,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import * as Notifications from "expo-notifications";
import { useTranslation } from "../../i18n";
import { useTheme } from "../../theme/ThemeContext";
import {
  useNotificationPrefsStore,
  type NotifPrefKey,
} from "../../store/notificationPrefsStore";
import { notificationsApi } from "../../api/client";
import {
  registerForPushNotifications,
  getStoredToken,
  clearStoredToken,
} from "../../services/pushService";

interface NotifPref {
  key: NotifPrefKey;
  labelKey: string;
  icon: string;
  iconColor: string;
  bgColor: string;
}

export function NotificationSettingsScreen() {
  const navigation = useNavigation<any>();
  const { t, isRTL, rtlText } = useTranslation();
  const { colors } = useTheme();

  const store = useNotificationPrefsStore();
  const { prefs, loading } = store;

  const [permDenied, setPermDenied] = useState(false);

  // Fetch prefs from backend on mount and check OS permission status.
  useEffect(() => {
    store.fetch();

    if (Platform.OS !== "web") {
      Notifications.getPermissionsAsync().then(({ status }) => {
        setPermDenied(status === Notifications.PermissionStatus.DENIED);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const notificationPrefs: NotifPref[] = [
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
  ];

  const handleToggle = useCallback(
    async (key: NotifPrefKey) => {
      const newVal = !prefs[key];
      store.setPref(key, newVal);

      if (key === "push" && Platform.OS !== "web") {
        if (newVal) {
          // Master toggle turned ON → re-register push token.
          try {
            const token = await registerForPushNotifications();
            if (token) {
              await notificationsApi
                .registerPushToken(token, Platform.OS as "ios" | "android")
                .catch(() => {});
            }
            // Re-check permission status after attempting registration.
            const { status } = await Notifications.getPermissionsAsync();
            setPermDenied(status === Notifications.PermissionStatus.DENIED);
          } catch {
            // Non-fatal — banner already guides user to Settings if denied.
          }
        } else {
          // Master toggle turned OFF → remove push token from backend.
          try {
            const storedToken = await getStoredToken();
            if (storedToken) {
              await notificationsApi.removePushToken(storedToken).catch(() => {});
            }
            await clearStoredToken();
          } catch {
            // Non-fatal.
          }
        }
      }
    },
    [prefs, store],
  );

    const handleSave = async () => {
    try {
      await store.save();
      Alert.alert(t("notifSaved"));
    } catch {
      Alert.alert("Error", "Could not save settings. Please try again.");
    }
  };

  const showPermissionBanner = permDenied && prefs.push && Platform.OS !== "web";

  return (
    <SafeAreaView
      className="flex-1"
      edges={["top"]}
      style={{ backgroundColor: colors.background, marginTop: -8 }}
    >
      {/* Header */}
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
        {/* Permission-denied banner — shown when OS permission is blocked and push is toggled on */}
        {showPermissionBanner && (
          <View
            style={{
              backgroundColor: "#fef3c7",
              borderRadius: 12,
              padding: 16,
              marginBottom: 16,
              flexDirection: isRTL ? "row-reverse" : "row",
              alignItems: "flex-start",
              gap: 12,
            }}
          >
            <Ionicons name="warning" size={20} color="#d97706" />
            <View style={{ flex: 1 }}>
              <Text
                style={[
                  rtlText,
                  { color: "#92400e", fontSize: 13, marginBottom: 8 },
                ]}
              >
                {t("notifPermissionDenied")}
              </Text>
              <Pressable onPress={() => Linking.openSettings()}>
                <Text
                  style={[
                    rtlText,
                    {
                      color: "#d97706",
                      fontSize: 13,
                      fontWeight: "700",
                      textDecorationLine: "underline",
                    },
                  ]}
                >
                  {t("notifOpenSettings")}
                </Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* Toggles card */}
        <View
          className="rounded-2xl overflow-hidden"
          style={{
            backgroundColor: colors.surface,
            shadowColor: colors.shadow,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.04,
            shadowRadius: 8,
            elevation: 2,
            opacity: loading ? 0.6 : 1,
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
                onValueChange={() => handleToggle(pref.key)}
                trackColor={{ false: colors.border, true: colors.text }}
                thumbColor={colors.surface}
                disabled={loading}
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
            disabled={loading}
            className="py-4 rounded-full items-center active:opacity-90"
            style={{
              backgroundColor: colors.text,
              shadowColor: colors.text,
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.3,
              shadowRadius: 24,
              elevation: 12,
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? (
              <ActivityIndicator color={colors.textInverse} />
            ) : (
              <Text
                className="font-extrabold text-lg"
                style={{ color: colors.textInverse }}
              >
                {t("save")}
              </Text>
            )}
          </Pressable>
        </View>
      </SafeAreaView>
    </SafeAreaView>
  );
}
