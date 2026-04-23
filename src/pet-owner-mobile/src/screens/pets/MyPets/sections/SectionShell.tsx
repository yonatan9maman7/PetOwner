import type { ReactNode } from "react";
import { View, Text, Pressable, ScrollView, KeyboardAvoidingView, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation, type TranslationKey, rowDirectionForAppLayout } from "../../../../i18n";
import { useTheme } from "../../../../theme/ThemeContext";
import type { PetDto } from "../../../../types/api";
import { getSpeciesEmoji, TILE_CONFIG, SECTION_SCROLL_TAB_BAR_CLEARANCE } from "../constants";
import type { Section } from "../types";

type NonNullSection = Exclude<Section, null>;

interface SectionShellProps {
  section: NonNullSection;
  pet: PetDto;
  onBack: () => void;
  onExportPdf: () => void;
  onShare: () => void;
  children: ReactNode;
}

export function SectionShell({
  section,
  pet,
  onBack,
  onExportPdf,
  onShare,
  children,
}: SectionShellProps) {
  const { t, isRTL } = useTranslation();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const sectionMeta: {
    icon: keyof typeof Ionicons.glyphMap;
    labelKey: TranslationKey;
    color: string;
    bg: string;
  } =
    section === "triage"
      ? { icon: "pulse", labelKey: "triageHistory", color: "#6366f1", bg: "#eef2ff" }
      : TILE_CONFIG.find((x) => x.key === section)!;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background, marginTop: -8 }} edges={["top"]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View
          style={{
            backgroundColor: sectionMeta.color,
            paddingBottom: 24,
            shadowColor: sectionMeta.color,
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.25,
            shadowRadius: 12,
            elevation: 8,
          }}
        >
          <View
            style={{
              flexDirection: rowDirectionForAppLayout(isRTL),
              alignItems: "center",
              paddingHorizontal: 20,
              paddingTop: 12,
              gap: 12,
            }}
          >
            <Pressable
              onPress={onBack}
              hitSlop={12}
              style={{
                width: 36,
                height: 36,
                borderRadius: 12,
                backgroundColor: "rgba(255,255,255,0.2)",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons name={isRTL ? "arrow-forward" : "arrow-back"} size={20} color="#fff" />
            </Pressable>
            <View style={{ flex: 1 }} />
          </View>
          <View style={{ alignItems: "center", marginTop: 8 }}>
            <View
              style={{
                width: 52,
                height: 52,
                borderRadius: 16,
                backgroundColor: "rgba(255,255,255,0.2)",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 10,
              }}
            >
              <Ionicons name={sectionMeta.icon} size={26} color="#fff" />
            </View>
            <Text
              style={{
                fontSize: 20,
                fontWeight: "800",
                color: "#fff",
                textAlign: "center",
              }}
            >
              {t(sectionMeta.labelKey)}
            </Text>
            <View
              style={{
                flexDirection: rowDirectionForAppLayout(isRTL),
                alignItems: "center",
                gap: 6,
                marginTop: 6,
                backgroundColor: "rgba(255,255,255,0.2)",
                paddingHorizontal: 12,
                paddingVertical: 4,
                borderRadius: 10,
              }}
            >
              <Text style={{ fontSize: 14 }}>{getSpeciesEmoji(pet.species)}</Text>
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: "600",
                  color: "rgba(255,255,255,0.9)",
                }}
              >
                {pet.name}
              </Text>
            </View>
          </View>
        </View>

        <View
          style={{
            flexDirection: rowDirectionForAppLayout(isRTL),
            justifyContent: "flex-end",
            paddingHorizontal: 16,
            paddingVertical: 8,
            gap: 8,
          }}
        >
          <Pressable
            onPress={onExportPdf}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 4,
              backgroundColor: colors.surfaceSecondary,
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderRadius: 10,
            }}
          >
            <Ionicons name="document-text-outline" size={16} color={colors.primary} />
            <Text style={{ fontSize: 12, fontWeight: "600", color: colors.primary }}>
              {t("exportHealthPassport")}
            </Text>
          </Pressable>
          <Pressable
            onPress={onShare}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 4,
              backgroundColor: colors.surfaceSecondary,
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderRadius: 10,
            }}
          >
            <Ionicons name="qr-code-outline" size={16} color={colors.primary} />
            <Text style={{ fontSize: 12, fontWeight: "600", color: colors.primary }}>{t("shareWithVet")}</Text>
          </Pressable>
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingBottom: insets.bottom + SECTION_SCROLL_TAB_BAR_CLEARANCE,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
