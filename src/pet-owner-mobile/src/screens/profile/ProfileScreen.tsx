import { View, Text, Pressable, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useAuthStore } from "../../store/authStore";
import { useTranslation } from "../../i18n";
import { LanguageToggle } from "../../components/LanguageToggle";


const NAVY = "#001a5a";

const MOCK_USER = { name: "יונתן", nameEn: "Jonathan", trips: 12, stars: 5 };

interface SettingsRowProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress?: () => void;
  trailing?: React.ReactNode;
  isFirst?: boolean;
}

function SettingsRow({
  icon,
  label,
  onPress,
  trailing,
  isFirst,
}: SettingsRowProps) {
  const { isRTL } = useTranslation();
  const chevron = isRTL ? "chevron-back" : "chevron-forward";

  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center justify-between p-5 active:bg-[#eef5f7]"
      style={
        !isFirst
          ? { borderTopWidth: 1, borderTopColor: "rgba(221,228,230,0.3)" }
          : undefined
      }
    >
      <View className="flex-row items-center gap-4">
        <View className="w-10 h-10 rounded-full bg-[#eff6ff] items-center justify-center">
          <Ionicons name={icon} size={22} color={NAVY} />
        </View>
        <View>
          <Text className="font-semibold text-[#161d1f]">{label}</Text>
          {trailing}
        </View>
      </View>
      <Ionicons name={chevron} size={20} color="#c4c6cf" />
    </Pressable>
  );
}

export function ProfileScreen() {
  const navigation = useNavigation<any>();
  const logout = useAuthStore((s) => s.logout);
  const { t, isRTL, rtlStyle, rtlText } = useTranslation();
  const displayName = isRTL ? MOCK_USER.name : MOCK_USER.nameEn;

  return (
    <SafeAreaView className="flex-1 bg-[#f4fafd]" edges={["top"]}>
      {/* Header Bar — matches Explore & Login */}
      <View
        className="h-16 flex-row items-center justify-between px-6"
        style={{
          backgroundColor: "#ffffff",
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.08,
          shadowRadius: 8,
          elevation: 4,
        }}
      >
        <View className="flex-row items-center gap-3">
          <View className="w-10 h-10 rounded-xl items-center justify-center bg-[#001a5a]">
            <Ionicons name="paw" size={22} color="#fff" />
          </View>
          <Text className="text-2xl font-extrabold text-[#001a5a]">
            PetOwner
          </Text>
        </View>
        <LanguageToggle />
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 32, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Header */}
        <View className="items-center mb-10">
          <Text
            style={rtlStyle}
            className="text-3xl font-extrabold tracking-tight text-[#001a5a] mb-4 text-center"
          >
            {t("profileTitle")}
          </Text>

          {/* Avatar */}
          <View className="relative mb-4">
            <View
              className="w-32 h-32 rounded-xl bg-[#dce1ff] items-center justify-center border-[3px] border-white overflow-hidden"
              style={{
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.12,
                shadowRadius: 16,
                elevation: 8,
              }}
            >
              <Ionicons name="person" size={56} color="#264191" />
            </View>
            <View className="absolute -bottom-2 -right-2 bg-[#506356] p-1.5 rounded-full border-2 border-white">
              <Ionicons name="checkmark-circle" size={16} color="#fff" />
            </View>
          </View>

          {/* Name */}
          <Text className="text-2xl font-bold text-[#001a5a] mb-2">
            {displayName}
          </Text>

          {/* Stats */}
          <View className="flex-row items-center gap-4">
            <Text className="text-[#43474e] font-medium">
              <Text className="text-[#001a5a] font-bold">
                {MOCK_USER.trips}
              </Text>{" "}
              {t("tripsCount")}
            </Text>
            <View className="w-1 h-1 rounded-full bg-[#c4c6cf]" />
            <View className="flex-row items-center gap-1">
              <Text className="text-[#43474e] font-medium">
                <Text className="text-[#001a5a] font-bold">
                  {MOCK_USER.stars}
                </Text>{" "}
                {t("starsLabel")}
              </Text>
              <Ionicons name="star" size={14} color="#f59e0b" />
            </View>
          </View>
        </View>

        {/* Become a Provider CTA */}
        <Pressable
          className="py-5 px-8 rounded-xl mb-10 flex-row items-center justify-between active:opacity-90"
          style={{
            backgroundColor: NAVY,
            shadowColor: NAVY,
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.25,
            shadowRadius: 16,
            elevation: 10,
          }}
          onPress={() => navigation.navigate("ProviderEdit")}
        >
          <View className="flex-row items-center gap-3">
            <Ionicons name="paw" size={24} color="#fff" />
            <Text className="text-white font-bold text-base">
              {t("becomeProvider")}
            </Text>
          </View>
          <Ionicons
            name={isRTL ? "arrow-back" : "arrow-forward"}
            size={22}
            color="#fff"
          />
        </Pressable>

        {/* Settings List */}
        <View
          className="rounded-xl overflow-hidden mb-4"
          style={{
            backgroundColor: "#fff",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.04,
            shadowRadius: 8,
            elevation: 2,
          }}
        >
          <SettingsRow
            icon="person-outline"
            label={t("accountSettings")}
            isFirst
          />
          <SettingsRow
            icon="notifications-outline"
            label={t("notificationsLabel")}
          />
          <SettingsRow icon="time-outline" label={t("careHistory")} />
        </View>

        {/* Logout */}
        <Pressable
          className="flex-row items-center gap-4 p-5 rounded-xl mt-4 active:bg-[#ffdad6]/10"
          onPress={logout}
        >
          <View
            className="w-10 h-10 rounded-full items-center justify-center"
            style={{ backgroundColor: "rgba(186,26,26,0.08)" }}
          >
            <Ionicons name="log-out-outline" size={22} color="#ba1a1a" />
          </View>
          <Text className="font-bold text-[#ba1a1a]">
            {t("logoutButton")}
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
