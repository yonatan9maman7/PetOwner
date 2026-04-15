import { View, Text, TextInput, Pressable, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFormContext } from "react-hook-form";
import { useTranslation } from "../../i18n";
import { useTheme } from "../../theme/ThemeContext";
import { SERVICES } from "./constants";
import type { OnboardingFormValues } from "./schemas";

let _pkgId = 0;
function nextId() {
  return `pkg_${Date.now()}_${++_pkgId}`;
}

export function PackagesStep() {
  const { t, isRTL } = useTranslation();
  const { colors } = useTheme();
  const { watch, setValue } = useFormContext<OnboardingFormValues>();
  const services = watch("services");

  const enabledDefs = SERVICES.filter((svc) => services[String(svc.serviceType)]?.enabled);

  if (enabledDefs.length === 0) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 40 }}>
        <Ionicons name="bag-handle-outline" size={48} color={colors.textMuted} />
        <Text style={{ fontSize: 15, color: colors.textSecondary, marginTop: 12, textAlign: "center" }}>
          {t("onbNoServicesSelected")}
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24, gap: 16 }}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      showsVerticalScrollIndicator={false}
    >
      <Text style={{ fontSize: 22, fontWeight: "800", color: colors.text, textAlign: isRTL ? "right" : "left" }}>
        {t("packages")}
      </Text>
      <Text style={{ fontSize: 13, color: colors.textSecondary, textAlign: isRTL ? "right" : "left", marginTop: -8 }}>
        {t("onbPackagesHint")}
      </Text>

      {enabledDefs.map((svc) => {
        const key = String(svc.serviceType);
        const state = services[key];

        return (
          <View
            key={key}
            style={{
              backgroundColor: colors.surface,
              borderRadius: 14,
              padding: 16,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <View style={{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  backgroundColor: svc.bgColor,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons name={svc.icon as any} size={18} color={svc.iconColor} />
              </View>
              <Text style={{ fontSize: 15, fontWeight: "700", color: colors.text, flex: 1, textAlign: isRTL ? "right" : "left" }}>
                {t(svc.nameKey)}
              </Text>
            </View>

            {state.packages.map((pkg, idx) => (
              <View
                key={pkg.id}
                style={{
                  backgroundColor: colors.surfaceTertiary,
                  borderRadius: 12,
                  padding: 12,
                  marginBottom: 8,
                  borderWidth: 1,
                  borderColor: colors.borderLight,
                }}
              >
                <View style={{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", marginBottom: 8 }}>
                  <Text style={{ flex: 1, fontSize: 13, fontWeight: "600", color: colors.text, textAlign: isRTL ? "right" : "left" }}>
                    #{idx + 1}
                  </Text>
                  <Pressable
                    onPress={() => {
                      const updated = state.packages.filter((p) => p.id !== pkg.id);
                      setValue(`services.${key}.packages`, updated);
                    }}
                    hitSlop={8}
                  >
                    <Ionicons name="trash-outline" size={18} color={colors.danger} />
                  </Pressable>
                </View>

                <PackageInput
                  label={t("packageTitle")}
                  placeholder={t("packageTitlePlaceholder")}
                  value={pkg.title}
                  onChangeText={(v) => {
                    const updated = [...state.packages];
                    updated[idx] = { ...updated[idx], title: v };
                    setValue(`services.${key}.packages`, updated);
                  }}
                  isRTL={isRTL}
                />

                <View style={{ flexDirection: "row", gap: 10, marginTop: 8 }}>
                  <View style={{ flex: 1 }}>
                    <PackageInput
                      label={t("packagePrice")}
                      placeholder="0"
                      value={pkg.price}
                      onChangeText={(v) => {
                        const updated = [...state.packages];
                        updated[idx] = { ...updated[idx], price: v };
                        setValue(`services.${key}.packages`, updated);
                      }}
                      isRTL={isRTL}
                      keyboardType="numeric"
                    />
                  </View>
                </View>

                <View style={{ marginTop: 8 }}>
                  <PackageInput
                    label={t("packageDescription")}
                    placeholder={t("packageDescPlaceholder")}
                    value={pkg.description}
                    onChangeText={(v) => {
                      const updated = [...state.packages];
                      updated[idx] = { ...updated[idx], description: v };
                      setValue(`services.${key}.packages`, updated);
                    }}
                    isRTL={isRTL}
                  />
                </View>
              </View>
            ))}

            <Pressable
              onPress={() => {
                const updated = [...state.packages, { id: nextId(), title: "", price: "", description: "" }];
                setValue(`services.${key}.packages`, updated);
              }}
              style={{
                flexDirection: isRTL ? "row-reverse" : "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                paddingVertical: 10,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: colors.borderLight,
                borderStyle: "dashed",
              }}
            >
              <Ionicons name="add-circle-outline" size={18} color={colors.text} />
              <Text style={{ fontSize: 13, fontWeight: "600", color: colors.text }}>{t("addPackage")}</Text>
            </Pressable>
          </View>
        );
      })}
    </ScrollView>
  );
}

function PackageInput({
  label,
  placeholder,
  value,
  onChangeText,
  isRTL,
  keyboardType,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChangeText: (v: string) => void;
  isRTL: boolean;
  keyboardType?: "default" | "numeric";
}) {
  const { colors } = useTheme();
  return (
    <View>
      <Text style={{ fontSize: 11, fontWeight: "600", color: colors.textSecondary, marginBottom: 3, textAlign: isRTL ? "right" : "left" }}>
        {label}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        keyboardType={keyboardType}
        placeholderTextColor={colors.textMuted}
        style={{
          backgroundColor: colors.surface,
          borderRadius: 8,
          paddingHorizontal: 10,
          paddingVertical: 8,
          fontSize: 14,
          color: colors.text,
          borderWidth: 1,
          borderColor: colors.border,
          textAlign: isRTL ? "right" : "left",
        }}
      />
    </View>
  );
}
