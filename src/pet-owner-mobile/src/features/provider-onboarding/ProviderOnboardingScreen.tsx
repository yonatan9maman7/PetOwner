import { useMemo, useState } from "react";
import { View, Text, Pressable, Alert, ActivityIndicator, KeyboardAvoidingView, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation, rowDirectionForAppLayout } from "../../i18n";
import { useTheme } from "../../theme/ThemeContext";
import { providerApi } from "../../api/client";
import { useAuthStore, getUserInfoFromAccessToken } from "../../store/authStore";
import { INDIVIDUAL_STEPS, BUSINESS_STEPS } from "./constants";
import {
  createOnboardingFormSchema,
  buildDefaultValues,
  validateStep1,
  validateStep2,
  validateStep3,
  validateStep4,
  type OnboardingFormValues,
} from "./schemas";
import { formToPayload } from "./helpers";
import { ProgressBar } from "./ProgressBar";
import { IdentityStep } from "./IdentityStep";
import { ServicesStep } from "./ServicesStep";
import { PackagesStep } from "./PackagesStep";
import { AvailabilityReviewStep } from "./AvailabilityReviewStep";

const STEP_VALIDATORS: Record<number, (v: OnboardingFormValues) => string | null> = {
  0: validateStep1,
  1: validateStep2,
  2: validateStep3,
  3: validateStep4,
};

const STEP_COMPONENTS: Record<number, React.ComponentType> = {
  0: IdentityStep,
  1: ServicesStep,
  2: PackagesStep,
  3: AvailabilityReviewStep,
};

export function ProviderOnboardingScreen() {
  const navigation = useNavigation<any>();
  const { t, isRTL, language } = useTranslation();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const [stepIndex, setStepIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const onboardingFormSchema = useMemo(
    () =>
      createOnboardingFormSchema({
        validationPhoneRequired: t("validationPhoneRequired"),
        validationPhoneInvalid: t("validationPhoneInvalid"),
        validationPhoneInvalidBusiness: t("validationPhoneInvalidBusiness"),
      }),
    [language],
  );

  const methods = useForm<OnboardingFormValues>({
    resolver: zodResolver(onboardingFormSchema),
    defaultValues: buildDefaultValues(),
    mode: "onSubmit",
  });

  const providerType = methods.watch("providerType");
  const steps = providerType === 1 ? BUSINESS_STEPS : INDIVIDUAL_STEPS;
  const totalSteps = steps.length;
  const currentStepId = steps[Math.min(stepIndex, totalSteps - 1)];
  const isLast = stepIndex >= totalSteps - 1;

  const goNext = () => {
    methods.clearErrors("referenceContact");
    const values = methods.getValues();
    const validator = STEP_VALIDATORS[currentStepId];
    const errorKey = validator?.(values);
    if (errorKey) {
      if (errorKey === "referenceContactOwnNumber") {
        methods.setError("referenceContact", { type: "validate", message: t(errorKey as any) });
      }
      Alert.alert(t("errorTitle"), t(errorKey as any));
      return;
    }
    if (!isLast) setStepIndex(stepIndex + 1);
  };

  const goBack = () => {
    if (stepIndex > 0) setStepIndex(stepIndex - 1);
    else navigation.goBack();
  };

  const handleSubmit = async () => {
    methods.clearErrors("referenceContact");
    const values = methods.getValues();

    for (let i = 0; i < totalSteps; i++) {
      if (steps[i] === 0) {
        const phoneOk = await methods.trigger("phoneNumber");
        if (!phoneOk) {
          setStepIndex(i);
          return;
        }
      }
      const validator = STEP_VALIDATORS[steps[i]];
      const errorKey = validator?.(values);
      if (errorKey) {
        setStepIndex(i);
        if (errorKey === "referenceContactOwnNumber") {
          methods.setError("referenceContact", { type: "validate", message: t(errorKey as any) });
        }
        Alert.alert(t("errorTitle"), t(errorKey as any));
        return;
      }
    }

    const payload = formToPayload(values);
    setSubmitting(true);
    try {
      const res = await providerApi.apply(payload);
      if (res.newAccessToken) {
        const fromToken = getUserInfoFromAccessToken(res.newAccessToken);
        const stableUserId =
          fromToken?.id ||
          useAuthStore.getState().user?.id ||
          useAuthStore.getState().userId ||
          "";
        await useAuthStore.getState().setAuth(res.newAccessToken, stableUserId);
      }
      Alert.alert("", t("applicationSubmitted"), [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || t("genericError");
      Alert.alert(t("errorTitle"), msg);
    } finally {
      setSubmitting(false);
    }
  };

  const StepComponent = STEP_COMPONENTS[currentStepId];

  return (
    <FormProvider {...methods}>
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        {/* Header */}
        <View
          style={{
            paddingTop: Math.max((insets.top || 12) - 8, 0),
            backgroundColor: colors.surface,
            shadowColor: colors.shadow,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.06,
            shadowRadius: 8,
            elevation: 4,
          }}
        >
          <View
            style={{
              flexDirection: rowDirectionForAppLayout(isRTL),
              alignItems: "center",
              paddingHorizontal: 16,
              paddingVertical: 12,
            }}
          >
            <Pressable onPress={goBack} hitSlop={12} style={{ padding: 4 }}>
              <Ionicons name={isRTL ? "arrow-forward" : "arrow-back"} size={22} color={colors.text} />
            </Pressable>
            <Text style={{ flex: 1, fontSize: 18, fontWeight: "800", color: colors.text, textAlign: "center" }}>
              {t("onbTitle")}
            </Text>
            <View style={{ width: 36 }} />
          </View>
          <ProgressBar currentIndex={stepIndex} steps={steps} />
        </View>

        {/* Step Content */}
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={0}
        >
          <View style={{ flex: 1, paddingTop: 12 }}>
            <StepComponent />
          </View>
        </KeyboardAvoidingView>

        {/* Bottom Navigation */}
        <View
          style={{
            flexDirection: rowDirectionForAppLayout(isRTL),
            gap: 12,
            paddingHorizontal: 20,
            paddingVertical: 14,
            paddingBottom: Math.max(insets.bottom, 14),
            backgroundColor: colors.surface,
            borderTopWidth: 1,
            borderTopColor: colors.border,
          }}
        >
          {stepIndex > 0 && (
            <Pressable
              onPress={goBack}
              style={{
                flex: 1,
                paddingVertical: 15,
                borderRadius: 14,
                alignItems: "center",
                borderWidth: 1,
                borderColor: colors.borderLight,
                backgroundColor: colors.surface,
              }}
            >
              <Text style={{ fontSize: 15, fontWeight: "700", color: colors.text }}>{t("backStep")}</Text>
            </Pressable>
          )}

          <Pressable
            onPress={isLast ? handleSubmit : goNext}
            disabled={submitting}
            style={{
              flex: stepIndex > 0 ? 1.5 : 1,
              paddingVertical: 15,
              borderRadius: 14,
              alignItems: "center",
              backgroundColor: colors.primary,
              opacity: submitting ? 0.6 : 1,
            }}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={{ fontSize: 15, fontWeight: "700", color: "#fff" }}>
                {isLast ? t("submitApplication") : t("continueStep")}
              </Text>
            )}
          </Pressable>
        </View>
      </View>
    </FormProvider>
  );
}
