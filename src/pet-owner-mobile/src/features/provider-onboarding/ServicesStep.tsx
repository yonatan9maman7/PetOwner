import { View, Text, TextInput, Pressable, ScrollView, Switch } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFormContext } from "react-hook-form";
import { useTranslation, rowDirectionForAppLayout } from "../../i18n";
import { useTheme } from "../../theme/ThemeContext";
import { servicesForProviderType } from "./constants";
import { FieldLabel } from "./FieldLabel";
import { DogSizeCapacityFields } from "./DogSizeCapacityFields";
import type { OnboardingFormValues } from "./schemas";

export function ServicesStep() {
  const { t, isRTL } = useTranslation();
  const { colors } = useTheme();
  const { watch, setValue } = useFormContext<OnboardingFormValues>();
  const services = watch("services");
  const providerType = watch("providerType");
  const serviceDefs = servicesForProviderType(providerType);

  const toggle = (key: string) => {
    const current = services[key];
    setValue(`services.${key}.enabled`, !current.enabled);
  };

  const setRate = (key: string, rate: string) => {
    setValue(`services.${key}.rate`, rate);
  };

  return (
    <ScrollView
      contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24, gap: 10 }}
      showsVerticalScrollIndicator={false}
    >
      <Text
        style={{
          fontSize: 22,
          fontWeight: "800",
          color: colors.text,
          marginBottom: 4,
          textAlign: isRTL ? "right" : "left",
        }}
      >
        {t("servicesAndPricing")}
        <Text style={{ color: colors.danger }}> *</Text>
      </Text>

      {serviceDefs.map((svc) => {
        const key = String(svc.serviceType);
        const state = services[key];
        if (!state) return null;

        return (
          <View
            key={key}
            style={{
              backgroundColor: colors.surface,
              borderRadius: 14,
              padding: 16,
              borderWidth: 1,
              borderColor: state.enabled ? colors.primary : colors.border,
            }}
          >
            <Pressable
              onPress={() => toggle(key)}
              style={{
                flexDirection: rowDirectionForAppLayout(isRTL),
                alignItems: "center",
                gap: 12,
              }}
            >
              <View
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 12,
                  backgroundColor: svc.bgColor,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons name={svc.icon as any} size={22} color={svc.iconColor} />
              </View>
              <Text style={{ flex: 1, fontSize: 15, fontWeight: "700", color: colors.text, textAlign: isRTL ? "right" : "left" }}>
                {t(svc.nameKey)}
              </Text>
              <Switch
                value={state.enabled}
                onValueChange={() => toggle(key)}
                trackColor={{ false: colors.borderLight, true: colors.primary }}
                thumbColor="#fff"
              />
            </Pressable>

            {state.enabled && (
              <View style={{ marginTop: 12 }}>
                <FieldLabel text={t("priceLabel")} isRTL={isRTL} required variant="small" />
                <View
                  style={{
                    flexDirection: rowDirectionForAppLayout(isRTL),
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                <Text style={{ fontSize: 13, fontWeight: "600", color: colors.text }}>₪</Text>
                <TextInput
                  value={state.rate}
                  onChangeText={(v) => setRate(key, v)}
                  placeholder="0"
                  keyboardType="numeric"
                  style={{
                    flex: 1,
                    backgroundColor: colors.surfaceTertiary,
                    borderRadius: 10,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    fontSize: 15,
                    color: colors.text,
                    borderWidth: 1,
                    borderColor: colors.border,
                    textAlign: isRTL ? "right" : "left",
                  }}
                  placeholderTextColor={colors.textMuted}
                />
                <Text style={{ fontSize: 12, color: colors.textSecondary }}>{t(svc.unitKey)}</Text>
              </View>
              </View>
            )}
          </View>
        );
      })}

      <DogSizeCapacityFields />
    </ScrollView>
  );
}
