import { View, Text, Image, Pressable, Alert, ScrollView, useWindowDimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { useTranslation, rowDirectionForAppLayout, type TranslationKey } from "../../../../i18n";
import { useTheme } from "../../../../theme/ThemeContext";
import { usePetsStore } from "../../../../store/petsStore";
import type { PetDto } from "../../../../types/api";
import { getSpeciesEmoji } from "../constants";
import { ALLERGY_LABEL_I18N } from "../../addPetHelpers";

interface PetPassportCardProps {
  pet: PetDto;
  onShare: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onExportPdf: () => void;
}

function formatAllergySegment(raw: string, t: (k: TranslationKey) => string): string {
  const s = raw.trim();
  if (!s) return s;
  const key = ALLERGY_LABEL_I18N[s] ?? ALLERGY_LABEL_I18N[s.replace(/\s+/g, " ")];
  if (key) return t(key);
  for (const [label, k] of Object.entries(ALLERGY_LABEL_I18N)) {
    if (label.toLowerCase() === s.toLowerCase()) return t(k);
  }
  return s;
}

export function PetPassportCard({
  pet,
  onShare,
  onEdit,
  onDelete,
  onExportPdf,
}: PetPassportCardProps) {
  const { t, isRTL } = useTranslation();
  const { colors } = useTheme();
  const { width: screenWidth } = useWindowDimensions();

  const CARD_W = screenWidth - 40;

  const handleMore = () => {
    const options: string[] = [t("exportHealthPassport")];
    if (pet.isLost) options.push(t("markFoundBtn"));
    options.push(t("deletePet"));
    options.push(t("softDeleteCancel"));

    Alert.alert(
      pet.name,
      undefined,
      [
        { text: t("exportHealthPassport"), onPress: onExportPdf },
        ...(pet.isLost
          ? [
              {
                text: t("markFoundBtn"),
                onPress: async () => {
                  try {
                    await usePetsStore.getState().markFound(pet.id);
                  } catch {
                    Alert.alert(t("errorTitle"));
                  }
                },
              },
            ]
          : []),
        {
          text: t("deletePet"),
          style: "destructive" as const,
          onPress: onDelete,
        },
        { text: t("softDeleteCancel"), style: "cancel" as const },
      ],
    );
  };

  const chipRow = [
    ...(pet.allergies
      ? pet.allergies.split(",").map((a) => ({ label: `⚠ ${formatAllergySegment(a, t)}`, type: "allergy" as const }))
      : []),
    ...(pet.medicalConditions
      ? pet.medicalConditions.split(",").map((c) => ({ label: c.trim(), type: "condition" as const }))
      : []),
  ];

  const microchipLabel = pet.microchipNumber
    ? `···· ${pet.microchipNumber.slice(-4)}`
    : null;

  const metaLine = [
    pet.breed,
    pet.age != null ? `${pet.age}y` : null,
    pet.weight ? `${pet.weight}kg` : null,
    pet.isNeutered ? "✂" : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <View
      style={{
        width: CARD_W,
        alignSelf: "center",
        borderRadius: 28,
        overflow: "hidden",
        shadowColor: colors.brand,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.25,
        shadowRadius: 24,
        elevation: 12,
        borderWidth: pet.isLost ? 2 : 0,
        borderColor: pet.isLost ? "#ef4444" : "transparent",
      }}
    >
      <LinearGradient
        colors={["#001a5a", "#0d2d7a", "#1a3d9a"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ borderRadius: 28 }}
      >
        {/* Top bar — passport label + microchip */}
        <View
          style={{
            flexDirection: rowDirectionForAppLayout(isRTL),
            justifyContent: "space-between",
            alignItems: "center",
            paddingHorizontal: 20,
            paddingTop: 18,
            paddingBottom: 10,
          }}
        >
          <Text
            style={{
              fontSize: 10,
              fontWeight: "800",
              letterSpacing: 3,
              color: "rgba(255,255,255,0.45)",
              textTransform: "uppercase",
            }}
          >
            {t("passportLabel")}
          </Text>
          {microchipLabel ? (
            <Text
              style={{
                fontSize: 11,
                fontWeight: "600",
                color: "rgba(255,255,255,0.35)",
                fontVariant: ["tabular-nums"],
              }}
            >
              {microchipLabel}
            </Text>
          ) : null}
        </View>

        {/* Main identity row */}
        <View
          style={{
            flexDirection: rowDirectionForAppLayout(isRTL),
            alignItems: "center",
            paddingHorizontal: 20,
            gap: 16,
            paddingBottom: 18,
          }}
        >
          {/* Avatar */}
          <View
            style={{
              width: 80,
              height: 80,
              borderRadius: 40,
              overflow: "hidden",
              borderWidth: 2.5,
              borderColor: "rgba(255,255,255,0.35)",
              backgroundColor: "rgba(255,255,255,0.12)",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {pet.imageUrl ? (
              <Image source={{ uri: pet.imageUrl }} style={{ width: 80, height: 80 }} resizeMode="cover" />
            ) : (
              <Text style={{ fontSize: 40 }}>{getSpeciesEmoji(pet.species)}</Text>
            )}
          </View>

          {/* Name + metadata */}
          <View style={{ flex: 1, minWidth: 0 }}>
            {pet.isLost && (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 4,
                  backgroundColor: "#ef4444",
                  paddingHorizontal: 8,
                  paddingVertical: 3,
                  borderRadius: 8,
                  alignSelf: "flex-start",
                  marginBottom: 5,
                }}
              >
                <Ionicons name="alert-circle" size={12} color="#fff" />
                <Text style={{ fontSize: 10, fontWeight: "700", color: "#fff" }}>{t("lostLabel")}</Text>
              </View>
            )}
            <Text
              style={{
                fontSize: 26,
                fontWeight: "800",
                color: "#fff",
                textAlign: isRTL ? "right" : "left",
                letterSpacing: -0.3,
              }}
              numberOfLines={1}
            >
              {pet.name}
            </Text>
            <Text
              style={{
                fontSize: 13,
                color: "rgba(255,255,255,0.65)",
                textAlign: isRTL ? "right" : "left",
                marginTop: 2,
              }}
              numberOfLines={1}
            >
              {metaLine}
            </Text>
          </View>
        </View>

        {/* Allergy / condition chips */}
        {chipRow.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{
              flexDirection: rowDirectionForAppLayout(isRTL),
              gap: 6,
              paddingHorizontal: 20,
              paddingBottom: 14,
            }}
          >
            {chipRow.map((chip, i) => (
              <View
                key={i}
                style={{
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  borderRadius: 8,
                  backgroundColor:
                    chip.type === "allergy" ? "rgba(239,68,68,0.22)" : "rgba(245,158,11,0.2)",
                  borderWidth: 1,
                  borderColor:
                    chip.type === "allergy" ? "rgba(239,68,68,0.35)" : "rgba(245,158,11,0.3)",
                }}
              >
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: "600",
                    color:
                      chip.type === "allergy" ? "#fca5a5" : "#fcd34d",
                  }}
                >
                  {chip.label}
                </Text>
              </View>
            ))}
          </ScrollView>
        )}

        {/* Glassmorphic bottom action strip */}
        <BlurView
          intensity={35}
          tint="dark"
          style={{ overflow: "hidden" }}
        >
          <View
            style={{
              flexDirection: rowDirectionForAppLayout(isRTL),
              alignItems: "center",
              paddingHorizontal: 16,
              paddingVertical: 12,
              gap: 10,
              borderTopWidth: 1,
              borderTopColor: "rgba(255,255,255,0.1)",
              backgroundColor: "rgba(0,10,40,0.35)",
            }}
          >
            {/* Share passport CTA */}
            <Pressable
              onPress={onShare}
              style={{
                flex: 1,
                flexDirection: rowDirectionForAppLayout(isRTL),
                alignItems: "center",
                justifyContent: "center",
                gap: 7,
                backgroundColor: "rgba(255,255,255,0.15)",
                paddingVertical: 10,
                paddingHorizontal: 14,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.2)",
              }}
              android_ripple={{ color: "rgba(255,255,255,0.15)" }}
            >
              <Ionicons name="qr-code" size={16} color="#fff" />
              <Text style={{ fontSize: 13, fontWeight: "700", color: "#fff" }}>
                {t("shareHealthPassport")}
              </Text>
            </Pressable>

            {/* Edit button */}
            <Pressable
              onPress={onEdit}
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                backgroundColor: "rgba(255,255,255,0.12)",
                alignItems: "center",
                justifyContent: "center",
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.18)",
              }}
              android_ripple={{ color: "rgba(255,255,255,0.15)" }}
            >
              <Ionicons name="create-outline" size={18} color="#fff" />
            </Pressable>

            {/* More menu */}
            <Pressable
              onPress={handleMore}
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                backgroundColor: "rgba(255,255,255,0.12)",
                alignItems: "center",
                justifyContent: "center",
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.18)",
              }}
              android_ripple={{ color: "rgba(255,255,255,0.15)" }}
            >
              <Ionicons name="ellipsis-horizontal" size={18} color="#fff" />
            </Pressable>
          </View>
        </BlurView>
      </LinearGradient>
    </View>
  );
}
