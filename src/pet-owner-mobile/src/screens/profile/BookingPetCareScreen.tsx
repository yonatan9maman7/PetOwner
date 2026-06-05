import { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Linking,
  ActivityIndicator,
} from "react-native";
import { Image } from "expo-image";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useTranslation, rowDirectionForAppLayout } from "../../i18n";
import { useTheme } from "../../theme/ThemeContext";
import { bookingsApi } from "../../api/client";
import type { PetCareCardDto } from "../../types/api";
import { getSpeciesEmoji } from "../pets/MyPets/constants";
import { ALLERGY_LABEL_I18N, formatPetGenderForDisplay } from "../pets/addPetHelpers";
import type { TranslationKey } from "../../i18n";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatAllergyLabel(raw: string, t: (k: TranslationKey) => string): string {
  const s = raw.trim();
  if (!s) return s;
  const key = ALLERGY_LABEL_I18N[s] ?? ALLERGY_LABEL_I18N[s.replace(/\s+/g, " ")];
  if (key) return t(key);
  for (const [label, k] of Object.entries(ALLERGY_LABEL_I18N)) {
    if (label.toLowerCase() === s.toLowerCase()) return t(k);
  }
  return s;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionHeader({ icon, label, color }: { icon: keyof typeof Ionicons.glyphMap; label: string; color: string }) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        marginBottom: 12,
        paddingBottom: 8,
        borderBottomWidth: 1,
        borderBottomColor: colors.borderLight,
      }}
    >
      <View
        style={{
          width: 30,
          height: 30,
          borderRadius: 8,
          backgroundColor: color + "1a",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Ionicons name={icon} size={16} color={color} />
      </View>
      <Text style={{ fontSize: 13, fontWeight: "700", color, textTransform: "uppercase", letterSpacing: 0.6 }}>
        {label}
      </Text>
    </View>
  );
}

function InfoRow({
  icon,
  value,
  isRTL,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  value: string;
  isRTL: boolean;
}) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        flexDirection: rowDirectionForAppLayout(isRTL),
        alignItems: "flex-start",
        gap: 10,
        marginBottom: 6,
      }}
    >
      <Ionicons name={icon} size={16} color={colors.textMuted} style={{ marginTop: 2 }} />
      <Text style={{ flex: 1, fontSize: 14, color: colors.textSecondary, lineHeight: 20, textAlign: isRTL ? "right" : "left" }}>
        {value}
      </Text>
    </View>
  );
}

function PetCard({ pet, isRTL, t }: { pet: PetCareCardDto; isRTL: boolean; t: (k: TranslationKey) => string }) {
  const { colors } = useTheme();

  const allergies = pet.allergies?.split(",").filter(Boolean) ?? [];
  const conditions = pet.medicalConditions?.split(",").filter(Boolean) ?? [];
  const hasAllergyData = allergies.length > 0 || conditions.length > 0;

  const metaParts = [
    pet.breed ?? null,
    formatPetGenderForDisplay(pet.gender, t),
    pet.age != null ? `${pet.age}${t("careCardYearsShort")}` : null,
    pet.weight != null ? `${pet.weight} kg` : null,
    pet.isNeutered ? t("neutered") : null,
  ].filter(Boolean);

  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderRadius: 20,
        marginBottom: 20,
        overflow: "hidden",
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 16,
        elevation: 4,
      }}
    >
      {/* ── Hero header ── */}
      <View
        style={{
          backgroundColor: "#001a5a",
          paddingHorizontal: 20,
          paddingTop: 20,
          paddingBottom: 24,
          flexDirection: rowDirectionForAppLayout(isRTL),
          alignItems: "center",
          gap: 16,
        }}
      >
        {/* Avatar */}
        <View
          style={{
            width: 72,
            height: 72,
            borderRadius: 36,
            overflow: "hidden",
            backgroundColor: "#0d2d7a",
            alignItems: "center",
            justifyContent: "center",
            borderWidth: 3,
            borderColor: "rgba(255,255,255,0.25)",
          }}
        >
          {pet.imageUrl ? (
            <Image
              source={{ uri: pet.imageUrl }}
              style={{ width: 72, height: 72 }}
              contentFit="cover"
            />
          ) : (
            <Text style={{ fontSize: 36 }}>{getSpeciesEmoji(pet.species)}</Text>
          )}
        </View>

        {/* Name + meta */}
        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontSize: 22,
              fontWeight: "800",
              color: "#ffffff",
              textAlign: isRTL ? "right" : "left",
            }}
            numberOfLines={1}
          >
            {pet.name}
          </Text>
          {metaParts.length > 0 && (
            <Text
              style={{
                fontSize: 13,
                color: "rgba(255,255,255,0.7)",
                marginTop: 4,
                textAlign: isRTL ? "right" : "left",
              }}
            >
              {metaParts.join(" · ")}
            </Text>
          )}
          {pet.microchipNumber && (
            <View
              style={{
                flexDirection: rowDirectionForAppLayout(isRTL),
                alignItems: "center",
                gap: 5,
                marginTop: 6,
              }}
            >
              <Ionicons name="hardware-chip-outline" size={12} color="rgba(255,255,255,0.5)" />
              <Text style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", fontVariant: ["tabular-nums"] }}>
                ···· {pet.microchipNumber.slice(-4)}
              </Text>
            </View>
          )}
        </View>
      </View>

      <View style={{ padding: 20, gap: 24 }}>

        {/* ── Allergies & Conditions ── */}
        <View>
          <SectionHeader icon="warning" label={t("careCardAllergiesSection")} color="#dc2626" />
          {hasAllergyData ? (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
              {allergies.map((a, i) => (
                <View
                  key={`a${i}`}
                  style={{
                    backgroundColor: "#fef2f2",
                    borderWidth: 1,
                    borderColor: "#fca5a5",
                    paddingHorizontal: 10,
                    paddingVertical: 5,
                    borderRadius: 8,
                  }}
                >
                  <Text style={{ fontSize: 12, fontWeight: "700", color: "#dc2626" }}>
                    ⚠ {formatAllergyLabel(a, t)}
                  </Text>
                </View>
              ))}
              {conditions.map((c, i) => (
                <View
                  key={`c${i}`}
                  style={{
                    backgroundColor: "#fef9c3",
                    borderWidth: 1,
                    borderColor: "#fde68a",
                    paddingHorizontal: 10,
                    paddingVertical: 5,
                    borderRadius: 8,
                  }}
                >
                  <Text style={{ fontSize: 12, fontWeight: "700", color: "#854d0e" }}>
                    {c.trim()}
                  </Text>
                </View>
              ))}
            </View>
          ) : (
            <View
              style={{
                flexDirection: rowDirectionForAppLayout(isRTL),
                alignItems: "center",
                gap: 8,
                backgroundColor: "#f0fdf4",
                padding: 12,
                borderRadius: 10,
              }}
            >
              <Ionicons name="checkmark-circle" size={18} color="#16a34a" />
              <Text style={{ fontSize: 13, color: "#15803d", fontWeight: "600" }}>
                {t("careCardNoAllergies")}
              </Text>
            </View>
          )}
        </View>

        {/* ── Medical Notes & Feeding ── */}
        {(pet.medicalNotes || pet.feedingSchedule) && (
          <View>
            <SectionHeader icon="document-text" label={t("careCardMedicalSection")} color="#0d9488" />
            {pet.medicalNotes && (
              <InfoRow icon="medkit-outline" value={pet.medicalNotes} isRTL={isRTL} />
            )}
            {pet.feedingSchedule && (
              <InfoRow icon="restaurant-outline" value={pet.feedingSchedule} isRTL={isRTL} />
            )}
          </View>
        )}

        {/* ── Emergency Vet Contact ── */}
        {pet.vetName && (
          <View
            style={{
              backgroundColor: "#fff7ed",
              borderWidth: 1,
              borderColor: "#fed7aa",
              borderRadius: 14,
              padding: 16,
            }}
          >
            <SectionHeader icon="call" label={t("careCardVetSection")} color="#ea580c" />
            <View
              style={{
                flexDirection: rowDirectionForAppLayout(isRTL),
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
              }}
            >
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: "700",
                    color: "#c2410c",
                    textAlign: isRTL ? "right" : "left",
                  }}
                  numberOfLines={1}
                >
                  {pet.vetName}
                </Text>
                {pet.vetPhone && (
                  <Text
                    style={{
                      fontSize: 13,
                      color: "#ea580c",
                      marginTop: 3,
                      textAlign: isRTL ? "right" : "left",
                    }}
                  >
                    {pet.vetPhone}
                  </Text>
                )}
              </View>
              {pet.vetPhone && (
                <Pressable
                  onPress={() => void Linking.openURL(`tel:${pet.vetPhone}`)}
                  accessibilityRole="button"
                  accessibilityLabel={t("careCardCallVet")}
                  style={{
                    backgroundColor: "#ea580c",
                    paddingHorizontal: 16,
                    paddingVertical: 10,
                    borderRadius: 12,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <Ionicons name="call" size={16} color="#ffffff" />
                  <Text style={{ fontSize: 13, fontWeight: "700", color: "#ffffff" }}>
                    {t("careCardCallVet")}
                  </Text>
                </Pressable>
              )}
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export function BookingPetCareScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { colors } = useTheme();
  const { t, isRTL, rtlText } = useTranslation();

  const bookingId: string = route.params?.bookingId;

  const [cards, setCards] = useState<PetCareCardDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await bookingsApi.getCareCards(bookingId);
        if (!cancelled) setCards(data);
      } catch {
        if (!cancelled) setError(t("genericErrorDesc"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [bookingId, t]);

  return (
    <SafeAreaView
      className="flex-1"
      edges={["top"]}
      style={{ marginTop: -8, backgroundColor: colors.background }}
    >
      {/* Header */}
      <View
        style={{
          flexDirection: rowDirectionForAppLayout(isRTL),
          alignItems: "center",
          paddingHorizontal: 16,
          paddingVertical: 12,
          backgroundColor: colors.surface,
          shadowColor: colors.shadow,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.06,
          shadowRadius: 8,
          elevation: 4,
        }}
      >
        <Pressable onPress={() => navigation.goBack()} hitSlop={12} accessibilityRole="button">
          <Ionicons name={isRTL ? "arrow-forward" : "arrow-back"} size={24} color={colors.text} />
        </Pressable>
        <View
          style={{
            flex: 1,
            flexDirection: rowDirectionForAppLayout(isRTL),
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
          }}
        >
          <Ionicons name="heart-circle" size={22} color="#dc2626" />
          <Text
            style={[{ fontSize: 17, fontWeight: "700", color: colors.text }, rtlText]}
            numberOfLines={1}
          >
            {t("careCardScreenTitle")}
          </Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={{ marginTop: 12, color: colors.textMuted, fontSize: 14 }}>
            {t("careCardLoading")}
          </Text>
        </View>
      ) : error ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 }}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.danger} />
          <Text
            style={[{ marginTop: 12, fontSize: 15, fontWeight: "600", color: colors.danger, textAlign: "center" }, rtlText]}
          >
            {error}
          </Text>
          <Pressable
            onPress={() => {
              setError(null);
              setLoading(true);
              bookingsApi
                .getCareCards(bookingId)
                .then(setCards)
                .catch(() => setError(t("genericErrorDesc")))
                .finally(() => setLoading(false));
            }}
            style={{
              marginTop: 16,
              paddingHorizontal: 24,
              paddingVertical: 10,
              borderRadius: 12,
              backgroundColor: colors.primary,
            }}
          >
            <Text style={{ fontSize: 14, fontWeight: "600", color: colors.primaryText }}>
              {t("retry")}
            </Text>
          </Pressable>
        </View>
      ) : cards.length === 0 ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 }}>
          <Ionicons name="paw-outline" size={56} color={colors.textMuted} />
          <Text
            style={[{ marginTop: 12, fontSize: 16, fontWeight: "600", color: colors.textMuted, textAlign: "center" }, rtlText]}
          >
            {t("careCardEmpty")}
          </Text>
        </View>
      ) : (
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 48 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Read-only disclaimer */}
          <View
            style={{
              flexDirection: rowDirectionForAppLayout(isRTL),
              alignItems: "center",
              gap: 8,
              backgroundColor: colors.surfaceSecondary,
              borderRadius: 10,
              paddingHorizontal: 14,
              paddingVertical: 10,
              marginBottom: 20,
            }}
          >
            <Ionicons name="lock-closed-outline" size={14} color={colors.textMuted} />
            <Text style={[{ fontSize: 12, color: colors.textMuted, flex: 1 }, rtlText]}>
              {t("careCardReadOnlyNotice")}
            </Text>
          </View>

          {cards.map((card) => (
            <PetCard key={card.id} pet={card} isRTL={isRTL} t={t} />
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
