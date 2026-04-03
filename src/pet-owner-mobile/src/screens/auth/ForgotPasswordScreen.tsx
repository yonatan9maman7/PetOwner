import { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useAuthStore } from "../../store/authStore";
import { useTranslation } from "../../i18n";
import { LanguageToggle } from "../../components/LanguageToggle";
import apiClient from "../../api/client";

export function ForgotPasswordScreen() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const navigation = useNavigation<any>();
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const { t, isHebrew, rtlText, rtlStyle, rtlRow, rtlInput, alignCls } =
    useTranslation();

  useEffect(() => {
    if (isLoggedIn) navigation.popToTop();
  }, [isLoggedIn, navigation]);

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      Alert.alert(t("errorTitle"), t("fillAllFields"));
      return;
    }

    setLoading(true);
    try {
      await apiClient.post("/auth/forgot-password", { email });
      Alert.alert(t("resetSentTitle"), t("resetSentMessage"), [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
    } catch (err: any) {
      const message = err.response?.data?.message ?? t("forgotError");
      Alert.alert(t("errorTitle"), message);
    } finally {
      setLoading(false);
    }
  };

  const labelCls = `text-xs font-bold text-[#506356] mb-2 px-1 ${alignCls} ${!isHebrew ? "uppercase tracking-widest" : ""}`;

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          className="flex-1"
          contentContainerStyle={{
            flexGrow: 1,
            paddingHorizontal: 28,
            paddingTop: 20,
            paddingBottom: 120,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Header ── */}
          <View className="flex-row items-center justify-between mb-6">
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

          {/* ── Hero ── */}
          <View className="items-center mb-8">
            <View className="w-14 h-14 rounded-2xl bg-[#001a5a] items-center justify-center mb-4">
              <Ionicons name="mail" size={24} color="#fff" />
            </View>
            <Text
              style={rtlStyle}
              className="text-2xl font-bold text-[#161d1f] text-center mb-2"
            >
              {t("forgotTitle")}
            </Text>
            <Text
              style={rtlStyle}
              className="text-sm text-[#74777f] text-center leading-5 px-2"
            >
              {t("forgotSubtitle")}
            </Text>
          </View>

          {/* ── Email ── */}
          <View className="mb-6">
            <Text style={rtlText} className={labelCls}>
              {t("forgotEmailLabel")}
            </Text>
            <View
              style={[
                rtlRow,
                {
                  alignItems: "center",
                  backgroundColor: "#dde4e6",
                  borderRadius: 12,
                  gap: 12,
                  paddingHorizontal: 20,
                  paddingVertical: 15,
                  minHeight: 55,
                },
              ]}
            >
              <Ionicons name="mail-outline" size={20} color="#74777f" />
              <TextInput
                style={[
                  rtlInput,
                  {
                    flex: 1,
                    fontSize: 16,
                    lineHeight: 20,
                    color: "#161d1f",
                    padding: 0,
                  },
                ]}
                placeholder={t("forgotEmailPlaceholder")}
                placeholderTextColor="#74777f99"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
              />
            </View>
          </View>

          {/* ── Send Reset Button ── */}
          <Pressable
            className="h-14 rounded-xl items-center justify-center bg-[#001a5a] active:opacity-90"
            onPress={handleForgotPassword}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-white text-base font-bold">
                {t("sendResetLink")}
              </Text>
            )}
          </Pressable>

          {/* ── Footer ── */}
          <View
            style={{ marginTop: "auto", paddingTop: 16, alignItems: "center" }}
          >
            <Pressable onPress={() => navigation.goBack()}>
              <Text
                style={rtlStyle}
                className="text-sm font-bold text-[#74777f]"
              >
                {t("backToLogin")}
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
