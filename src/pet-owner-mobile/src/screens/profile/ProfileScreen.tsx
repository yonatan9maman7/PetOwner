import { useState, useCallback } from "react";
import { View, Text, ScrollView, ActivityIndicator, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { useAuthStore } from "../../store/authStore";
import { useNotificationStore } from "../../store/notificationStore";
import { providerApi, bookingsApi } from "../../api/client";
import { useTranslation } from "../../i18n";
import { useTheme } from "../../theme/ThemeContext";
import { BrandedAppHeader } from "../../components/BrandedAppHeader";
import type { ProviderStatus } from "../../types/api";

interface SettingsRowProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress?: () => void;
  trailing?: React.ReactNode;
  isFirst?: boolean;
  badge?: number;
}

function SettingsRow({
  icon,
  label,
  onPress,
  trailing,
  isFirst,
  badge,
}: SettingsRowProps) {
  const { isRTL } = useTranslation();
  const { colors } = useTheme();
  const chevron = isRTL ? "chevron-back" : "chevron-forward";

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      className="flex-row items-center justify-between p-5"
      style={
        !isFirst
          ? { borderTopWidth: 1, borderTopColor: colors.borderLight }
          : undefined
      }
    >
      <View className="flex-row items-center gap-4">
        <View style={{ position: "relative" }}>
          <View
            className="w-10 h-10 rounded-full items-center justify-center"
            style={{ backgroundColor: colors.cardHighlight }}
          >
            <Ionicons name={icon} size={22} color={colors.text} />
          </View>
          {!!badge && badge > 0 && (
            <View
              style={{
                position: "absolute",
                top: -4,
                right: -4,
                backgroundColor: colors.danger,
                borderRadius: 10,
                minWidth: 20,
                height: 20,
                alignItems: "center",
                justifyContent: "center",
                paddingHorizontal: 4,
                borderWidth: 2,
                borderColor: colors.surface,
              }}
            >
              <Text style={{ color: colors.textInverse, fontSize: 11, fontWeight: "700" }}>
                {badge > 99 ? "99+" : badge}
              </Text>
            </View>
          )}
        </View>
        <View>
          <Text className="font-semibold" style={{ color: colors.text }}>{label}</Text>
          {trailing}
        </View>
      </View>
      <Ionicons name={chevron} size={20} color={colors.textMuted} />
    </TouchableOpacity>
  );
}

function NavyButton({
  label,
  icon,
  onPress,
  isRTL,
  disabled,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  isRTL: boolean;
  disabled?: boolean;
}) {
  const { colors } = useTheme();

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      className="py-5 px-8 rounded-xl mb-4 flex-row items-center justify-between"
      style={{
        backgroundColor: disabled ? colors.textMuted : colors.text,
        shadowColor: colors.text,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: disabled ? 0.1 : 0.25,
        shadowRadius: 16,
        elevation: disabled ? 2 : 10,
        opacity: disabled ? 0.7 : 1,
      }}
      onPress={onPress}
      disabled={disabled}
      accessibilityState={{ disabled }}
      accessibilityLabel={label}
    >
      <View className="flex-row items-center gap-3">
        <Ionicons name={icon} size={24} color={colors.textInverse} />
        <Text className="font-bold text-base" style={{ color: colors.textInverse }}>{label}</Text>
      </View>
      {!disabled && (
        <Ionicons
          name={isRTL ? "arrow-back" : "arrow-forward"}
          size={22}
          color={colors.textInverse}
        />
      )}
    </TouchableOpacity>
  );
}

type ProviderCTAState = "none" | "pending" | "approved" | "loading";

export function ProfileScreen() {
  const navigation = useNavigation<any>();
  const user = useAuthStore((s) => s.user);
  const { t, isRTL, rtlStyle } = useTranslation();
  const { colors } = useTheme();

  const unreadCount = useNotificationStore((s) => s.unreadCount);
  const role = user?.role ?? "Owner";
  const isProvider = role === "Provider";
  const isAdmin = role === "Admin";
  const userId = user?.id;

  const [pendingIncomingBookings, setPendingIncomingBookings] = useState(0);

  const [providerCTA, setProviderCTA] = useState<ProviderCTAState>(
    isProvider ? "approved" : "loading",
  );

  useFocusEffect(
    useCallback(() => {
      if (isProvider) {
        setProviderCTA("approved");
        return;
      }

      let cancelled = false;
      setProviderCTA("loading");
      providerApi
        .getMe()
        .then((profile) => {
          if (cancelled) return;
          if (profile.status === "Pending") setProviderCTA("pending");
          else if (profile.status === "Approved") setProviderCTA("approved");
          else setProviderCTA("none");
        })
        .catch(() => {
          if (!cancelled) setProviderCTA("none");
        });
      return () => {
        cancelled = true;
      };
    }, [isProvider]),
  );

  useFocusEffect(
    useCallback(() => {
      if (!userId || (!isProvider && !isAdmin)) {
        setPendingIncomingBookings(0);
        return;
      }
      let cancelled = false;
      bookingsApi
        .getMine()
        .then((list) => {
          if (cancelled) return;
          const n = list.filter(
            (b) => b.providerProfileId === userId && b.status === "Pending",
          ).length;
          setPendingIncomingBookings(n);
        })
        .catch(() => {
          if (!cancelled) setPendingIncomingBookings(0);
        });
      return () => {
        cancelled = true;
      };
    }, [userId, isProvider, isAdmin]),
  );

  return (
    <SafeAreaView className="flex-1" edges={["top"]} style={{ backgroundColor: colors.background, marginTop: -8 }}>
      <BrandedAppHeader />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 32, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="items-center mb-10">
          <Text
            style={[rtlStyle, { color: colors.text }]}
            className="text-3xl font-extrabold tracking-tight mb-4 text-center"
          >
            {t("profileTitle")}
          </Text>

          <View className="relative mb-4">
            <View
              className="w-32 h-32 rounded-xl items-center justify-center border-[3px] overflow-hidden"
              style={{
                backgroundColor: colors.primaryLight,
                borderColor: colors.surface,
                shadowColor: colors.shadow,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.12,
                shadowRadius: 16,
                elevation: 8,
              }}
            >
              <Ionicons name="person" size={56} color={colors.primary} />
            </View>
            <View
              className="absolute -bottom-2 -right-2 p-1.5 rounded-full border-2"
              style={{ backgroundColor: "#506356", borderColor: colors.surface }}
            >
              <Ionicons name="checkmark-circle" size={16} color={colors.textInverse} />
            </View>
          </View>

          <Text className="text-2xl font-bold mb-1" style={{ color: colors.text }}>
            {user?.name ?? ""}
          </Text>

          <View className="px-3 py-1 rounded-full mb-4" style={{ backgroundColor: colors.cardHighlight }}>
            <Text className="text-xs font-bold uppercase tracking-wide" style={{ color: colors.primary }}>
              {role}
            </Text>
          </View>

          <View className="flex-row items-center gap-4">
            <Text className="font-medium" style={{ color: colors.textSecondary }}>
              <Text className="font-bold" style={{ color: colors.text }}>0</Text>{" "}
              {t("tripsCount")}
            </Text>
            <View className="w-1 h-1 rounded-full" style={{ backgroundColor: colors.textMuted }} />
            <View className="flex-row items-center gap-1">
              <Text className="font-medium" style={{ color: colors.textSecondary }}>
                <Text className="font-bold" style={{ color: colors.text }}>0</Text>{" "}
                {t("starsLabel")}
              </Text>
              <Ionicons name="star" size={14} color="#f59e0b" />
            </View>
          </View>
        </View>

        {providerCTA === "loading" && (
          <View style={{ alignItems: "center", marginBottom: 16 }}>
            <ActivityIndicator color={colors.text} />
          </View>
        )}

        {providerCTA === "approved" && (
          <NavyButton
            label={t("switchToProvider")}
            icon="paw"
            onPress={() => navigation.navigate("ProviderDashboard")}
            isRTL={isRTL}
          />
        )}

        {providerCTA === "pending" && (
          <NavyButton
            label={t("onbPendingCta")}
            icon="time-outline"
            onPress={() => {}}
            isRTL={isRTL}
            disabled
          />
        )}

        {providerCTA === "none" && (
          <NavyButton
            label={t("becomeProvider")}
            icon="paw"
            onPress={() => navigation.navigate("ProviderOnboarding")}
            isRTL={isRTL}
          />
        )}

        {isAdmin && (
          <NavyButton
            label={t("adminDashboard")}
            icon="shield-checkmark-outline"
            onPress={() => navigation.navigate("AdminDashboard")}
            isRTL={isRTL}
          />
        )}

        <View className="mb-6" />

        <View
          className="rounded-xl overflow-hidden mb-4"
          style={{
            backgroundColor: colors.surface,
            shadowColor: colors.shadow,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.04,
            shadowRadius: 8,
            elevation: 2,
          }}
        >
          <SettingsRow
            icon="calendar-outline"
            label={t("myBookings")}
            onPress={() => navigation.navigate("MyBookings")}
            isFirst
            badge={pendingIncomingBookings > 0 ? pendingIncomingBookings : undefined}
          />
          <SettingsRow
            icon="heart-outline"
            label={t("favorites")}
            onPress={() => navigation.navigate("Favorites")}
          />
          <SettingsRow
            icon="settings-outline"
            label={t("accountSettings")}
            onPress={() => navigation.navigate("AccountSettings")}
          />
          <SettingsRow
            icon="notifications-outline"
            label={t("notificationsLabel")}
            onPress={() => navigation.navigate("Notifications")}
            badge={unreadCount}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
