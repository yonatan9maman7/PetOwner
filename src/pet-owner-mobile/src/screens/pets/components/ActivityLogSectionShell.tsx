import type { ReactNode } from "react";
import { View, Text, Pressable, KeyboardAvoidingView, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "../../../i18n";
import { useTheme } from "../../../theme/ThemeContext";
import type { PetDto } from "../../../types/api";
import { getSpeciesEmoji } from "../MyPets/constants";

interface ActivityLogSectionShellProps {
  pet: PetDto | null;
  onBack: () => void;
  children: ReactNode;
}

/**
 * Same visual language as MyPets `SectionShell` (colored header + back), without PDF/share row.
 * Children receive the remaining viewport (use flex lists inside).
 */
export function ActivityLogSectionShell({ pet, onBack, children }: ActivityLogSectionShellProps) {
  const { t, isRTL } = useTranslation();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const headerColor = colors.primary;

  return (
    <SafeAreaView
      className="flex-1"
      style={{ backgroundColor: colors.background, marginTop: -8 }}
      edges={["top"]}
    >
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View
          style={{
            backgroundColor: headerColor,
            paddingBottom: 24,
            shadowColor: headerColor,
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.25,
            shadowRadius: 12,
            elevation: 8,
          }}
        >
          <View
            className="items-center px-5 pt-3"
            style={{ flexDirection: isRTL ? "row-reverse" : "row", gap: 12 }}
          >
            <Pressable
              onPress={onBack}
              hitSlop={12}
              className="h-9 w-9 items-center justify-center rounded-xl"
              style={{ backgroundColor: "rgba(255,255,255,0.2)" }}
            >
              <Ionicons name={isRTL ? "arrow-forward" : "arrow-back"} size={20} color="#fff" />
            </Pressable>
            <View className="flex-1" />
          </View>
          <View className="mt-2 items-center">
            <View
              className="mb-2.5 h-[52px] w-[52px] items-center justify-center rounded-2xl"
              style={{ backgroundColor: "rgba(255,255,255,0.2)" }}
            >
              <Ionicons name="footsteps" size={26} color="#fff" />
            </View>
            <Text className="text-center text-xl font-extrabold text-white">{t("activityLogTitle")}</Text>
            {pet ? (
              <View
                className="mt-1.5 flex-row items-center gap-1.5 rounded-[10px] px-3 py-1"
                style={{
                  flexDirection: isRTL ? "row-reverse" : "row",
                  backgroundColor: "rgba(255,255,255,0.2)",
                }}
              >
                <Text className="text-sm">{getSpeciesEmoji(pet.species)}</Text>
                <Text className="text-[13px] font-semibold" style={{ color: "rgba(255,255,255,0.9)" }}>
                  {pet.name}
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        <View className="flex-1" style={{ paddingBottom: Math.max(insets.bottom, 8) + 8 }}>
          {children}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
