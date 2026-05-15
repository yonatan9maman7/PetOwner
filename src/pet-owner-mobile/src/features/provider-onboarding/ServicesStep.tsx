import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  Switch,
  Alert,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFormContext } from "react-hook-form";
import { useTranslation, rowDirectionForAppLayout, type TranslationKey } from "../../i18n";
import { useTheme } from "../../theme/ThemeContext";
import { servicesForProviderType } from "./constants";
import { FieldLabel } from "./FieldLabel";
import { DogSizeCapacityFields } from "./DogSizeCapacityFields";
import type { OnboardingFormValues } from "./schemas";
import { grossFromProviderNet } from "../../utils/pricingDisplay";
import { ServiceType } from "../../types/api";

const MAX_PROVIDER_NET_RATE = 2000;
const MAX_PROVIDER_NET_RATE_DIGITS = 4;

function serviceInfoDescriptionKey(serviceTypeName: ServiceType): TranslationKey {
  switch (serviceTypeName) {
    case ServiceType.DogWalking:
      return "serviceInfoDogWalking";
    case ServiceType.PetSitting:
      return "serviceInfoPetSitting";
    case ServiceType.Boarding:
      return "serviceInfoBoarding";
    case ServiceType.DropInVisit:
      return "serviceInfoDropInVisit";
    case ServiceType.Training:
      return "serviceInfoTraining";
    case ServiceType.Insurance:
      return "serviceInfoInsurance";
    case ServiceType.PetStore:
      return "serviceInfoPetStore";
    case ServiceType.HouseSitting:
      return "serviceInfoHouseSitting";
    case ServiceType.DoggyDayCare:
      return "serviceInfoDoggyDayCare";
    default: {
      const _exhaustive: never = serviceTypeName;
      return _exhaustive;
    }
  }
}

function normalizeProviderNetRateInput(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 0) return "";
  let n = parseInt(digits, 10);
  if (!Number.isFinite(n)) return "";
  if (n > MAX_PROVIDER_NET_RATE) n = MAX_PROVIDER_NET_RATE;
  return String(n);
}

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

        const infoKey = serviceInfoDescriptionKey(svc.serviceTypeName);

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
            <View
              style={{
                flexDirection: rowDirectionForAppLayout(isRTL),
                alignItems: "center",
                gap: 12,
              }}
            >
              <Pressable
                onPress={() => toggle(key)}
                style={{
                  flex: 1,
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
                <Text
                  style={{
                    flex: 1,
                    fontSize: 15,
                    fontWeight: "700",
                    color: colors.text,
                    textAlign: isRTL ? "right" : "left",
                  }}
                >
                  {t(svc.nameKey)}
                </Text>
              </Pressable>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={t(svc.nameKey)}
                accessibilityHint={t(infoKey)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                onPress={() => Alert.alert(t(svc.nameKey), t(infoKey))}
              >
                <Ionicons name="information-circle-outline" size={22} color={colors.textMuted} />
              </TouchableOpacity>
              <Switch
                value={state.enabled}
                onValueChange={() => toggle(key)}
                trackColor={{ false: colors.borderLight, true: colors.primary }}
                thumbColor="#fff"
              />
            </View>

            {state.enabled && (
              <View style={{ marginTop: 12 }}>
                <FieldLabel text={t("providerNetEarningsLabel")} isRTL={isRTL} required variant="small" />
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
                    onChangeText={(v) => setRate(key, normalizeProviderNetRateInput(v))}
                    placeholder="0"
                    keyboardType="number-pad"
                    maxLength={MAX_PROVIDER_NET_RATE_DIGITS}
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
                {(() => {
                  const raw = String(state.rate ?? "").replace(",", ".").trim();
                  const net = parseInt(raw, 10);
                  if (!Number.isFinite(net) || net <= 0) return null;
                  const gross = grossFromProviderNet(net);
                  const hint = t("providerPriceEarningsHint")
                    .replace("{{net}}", net.toFixed(2))
                    .replace("{{gross}}", gross.toFixed(2));
                  return (
                    <Text
                      style={{
                        marginTop: 8,
                        fontSize: 12,
                        lineHeight: 17,
                        color: colors.textSecondary,
                        textAlign: isRTL ? "right" : "left",
                      }}
                    >
                      {hint}
                    </Text>
                  );
                })()}
              </View>
            )}
          </View>
        );
      })}

      <DogSizeCapacityFields />
    </ScrollView>
  );
}
