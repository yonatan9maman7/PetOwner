import { useEffect, useRef, useState, useCallback } from "react";
import { View, Text, Pressable, Animated, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import {
  setToastCallback,
  useNotificationStore,
} from "../store/notificationStore";
import { useAuthStore } from "../store/authStore";
import { useTheme } from "../theme/ThemeContext";
import type { NotificationDto } from "../types/api";
import { resolveNotificationApiText } from "../i18n";

const TOAST_DURATION = 4500;

const TYPE_CONFIG: Record<string, { icon: string; bg: string; accent: string }> = {
  sos: { icon: "warning", bg: "#fef2f2", accent: "#dc2626" },
  sos_resolved: { icon: "checkmark-circle", bg: "#ecfdf5", accent: "#059669" },
  chat: { icon: "chatbubble", bg: "#e8ecf4", accent: "#001a5a" },
  booking: { icon: "calendar", bg: "#faf5ff", accent: "#7c3aed" },
  BookingCreated: { icon: "calendar", bg: "#faf5ff", accent: "#7c3aed" },
  BookingConfirmed: { icon: "checkmark-circle", bg: "#ecfdf5", accent: "#059669" },
  BookingCompleted: { icon: "checkmark-circle", bg: "#dbeafe", accent: "#1d4ed8" },
  NewRequest: { icon: "mail-unread", bg: "#faf5ff", accent: "#7c3aed" },
  ProviderApplication: { icon: "person-add", bg: "#e8ecf4", accent: "#001a5a" },
  review: { icon: "star", bg: "#fffbeb", accent: "#d97706" },
};
const DEFAULT_CONFIG = { icon: "notifications", bg: "#f8fafc", accent: "#6366f1" };

export function NotificationToast() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const language = useAuthStore((s) => s.language);
  const { colors } = useTheme();
  const [visible, setVisible] = useState(false);
  const [current, setCurrent] = useState<NotificationDto | null>(null);
  const slideY = useRef(new Animated.Value(-120)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const hideTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const show = useCallback(
    (n: NotificationDto) => {
      if (hideTimer.current) clearTimeout(hideTimer.current);

      setCurrent(n);
      setVisible(true);
      slideY.setValue(-120);
      opacity.setValue(0);

      Animated.parallel([
        Animated.spring(slideY, {
          toValue: 0,
          useNativeDriver: true,
          tension: 60,
          friction: 10,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();

      hideTimer.current = setTimeout(() => dismiss(), TOAST_DURATION);
    },
    [slideY, opacity],
  );

  const dismiss = useCallback(() => {
    Animated.parallel([
      Animated.timing(slideY, {
        toValue: -120,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setVisible(false);
      setCurrent(null);
    });
  }, [slideY, opacity]);

  useEffect(() => {
    setToastCallback(show);
    return () => setToastCallback(() => {});
  }, [show]);

  const handlePress = useCallback(() => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    dismiss();

    if (!current) return;
    useNotificationStore.getState().markRead(current.id);

    switch (current.type) {
      case "ProviderApplication":
        navigation.navigate("Profile", { screen: "AdminDashboard" });
        break;
      case "BookingCreated":
      case "NewRequest":
        navigation.navigate("Profile", { screen: "MyBookings", params: { tab: "incoming" } });
        break;
      case "BookingConfirmed":
      case "BookingCompleted":
      case "RequestCompleted":
      case "RequestCancelled":
      case "RequestAccepted":
        navigation.navigate("Profile", { screen: "MyBookings", params: { tab: "outgoing" } });
        break;
      default:
        navigation.navigate("Profile", { screen: "Notifications" });
        break;
    }
  }, [current, dismiss, navigation]);

  if (!isLoggedIn || !visible || !current) return null;

  const cfg = TYPE_CONFIG[current.type] ?? DEFAULT_CONFIG;
  const title = resolveNotificationApiText(current.title, language);
  const message = resolveNotificationApiText(current.message, language);

  return (
    <Animated.View
      pointerEvents="box-none"
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 99999,
        paddingTop: insets.top + (Platform.OS === "android" ? 8 : 4),
        paddingHorizontal: 12,
        transform: [{ translateY: slideY }],
        opacity,
      }}
    >
      <Pressable
        onPress={handlePress}
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          backgroundColor: cfg.bg,
          borderRadius: 16,
          paddingVertical: 14,
          paddingHorizontal: 16,
          borderWidth: 1,
          borderColor: cfg.accent + "30",
          shadowColor: colors.shadow,
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.15,
          shadowRadius: 16,
          elevation: 12,
        }}
      >
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            backgroundColor: cfg.accent,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons
            name={cfg.icon as any}
            size={20}
            color="#fff"
          />
        </View>

        <View style={{ flex: 1, gap: 2 }}>
          <Text
            style={{ fontSize: 14, fontWeight: "700", color: colors.text }}
            numberOfLines={1}
          >
            {title}
          </Text>
          <Text
            style={{ fontSize: 12, color: colors.textSecondary, lineHeight: 17 }}
            numberOfLines={2}
          >
            {message}
          </Text>
        </View>

        <Pressable onPress={dismiss} hitSlop={10}>
          <Ionicons name="close" size={18} color={colors.textMuted} />
        </Pressable>
      </Pressable>
    </Animated.View>
  );
}
