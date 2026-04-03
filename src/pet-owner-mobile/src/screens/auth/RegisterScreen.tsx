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

export function RegisterScreen() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [secureEntry, setSecureEntry] = useState(true);

  const navigation = useNavigation<any>();
  const setAuth = useAuthStore((s) => s.setAuth);
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const { t, isHebrew, rtlText, rtlStyle, rtlRow, rtlInput, alignCls } =
    useTranslation();

  useEffect(() => {
    if (isLoggedIn) navigation.popToTop();
  }, [isLoggedIn, navigation]);

  const handleRegister = async () => {
    if (
      !fullName.trim() ||
      !email.trim() ||
      !phone.trim() ||
      !password.trim()
    ) {
      Alert.alert(t("errorTitle"), t("fillAllFields"));
      return;
    }
    if (!termsAccepted) {
      Alert.alert(t("errorTitle"), t("acceptTermsError"));
      return;
    }

    setLoading(true);
    try {
      const { data } = await apiClient.post("/auth/register", {
        Name: fullName,
        Email: email,
        Phone: phone,
        Password: password,
      });
      await setAuth(data.token, data.userId ?? data.id);
      navigation.navigate("Explore");
    } catch (err: any) {
      const message = err.response?.data?.message ?? t("registerError");
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
            paddingHorizontal: 32,
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
          <View className="items-center mb-7">
            <View className="w-14 h-14 rounded-2xl bg-[#001a5a] items-center justify-center mb-4">
              <Ionicons name="heart" size={24} color="#fff" />
            </View>
            <Text
              style={rtlStyle}
              className="text-2xl font-bold text-[#161d1f] text-center mb-2"
            >
              {t("registerTitle")}
            </Text>
            <Text
              style={rtlStyle}
              className="text-sm text-[#74777f] text-center"
            >
              {t("registerSubtitle")}
            </Text>
          </View>

          {/* ── Full Name ── */}
          <View className="mb-4">
            <Text style={rtlText} className={labelCls}>
              {t("fullNameLabel")}
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
              <Ionicons name="person-outline" size={20} color="#74777f" />
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
                placeholder={t("fullNamePlaceholder")}
                placeholderTextColor="#74777f99"
                value={fullName}
                onChangeText={setFullName}
                autoCapitalize="words"
                autoComplete="name"
              />
            </View>
          </View>

          {/* ── Email ── */}
          <View className="mb-4">
            <Text style={rtlText} className={labelCls}>
              {t("emailLabel")}
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
                placeholder={t("emailPlaceholder")}
                placeholderTextColor="#74777f99"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
              />
            </View>
          </View>

          {/* ── Phone ── */}
          <View className="mb-4">
            <Text style={rtlText} className={labelCls}>
              {t("phoneLabel")}
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
              <Ionicons name="call-outline" size={20} color="#74777f" />
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
                placeholder={t("phonePlaceholder")}
                placeholderTextColor="#74777f99"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                autoComplete="tel"
              />
            </View>
          </View>

          {/* ── Password ── */}
          <View className="mb-5">
            <Text style={rtlText} className={labelCls}>
              {t("passwordLabel")}
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
              <Ionicons
                name="lock-closed-outline"
                size={20}
                color="#74777f"
              />
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
                placeholder={t("passwordPlaceholder")}
                placeholderTextColor="#74777f99"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={secureEntry}
              />
              <Pressable
                onPress={() => setSecureEntry((v) => !v)}
                hitSlop={8}
              >
                <Ionicons
                  name={secureEntry ? "eye-off-outline" : "eye-outline"}
                  size={20}
                  color="#74777f"
                />
              </Pressable>
            </View>
          </View>

          {/* ── Terms ── */}
          <Pressable
            style={rtlRow}
            className="items-center gap-3 mb-6"
            onPress={() => setTermsAccepted((v) => !v)}
          >
            <View
              className={`w-5 h-5 rounded border-2 items-center justify-center ${termsAccepted ? "bg-[#001a5a] border-[#001a5a]" : "border-[#74777f]"}`}
            >
              {termsAccepted && (
                <Ionicons name="checkmark" size={14} color="#fff" />
              )}
            </View>
            <Text style={rtlText} className="text-sm text-[#74777f] flex-1">
              {t("termsAgree")}{" "}
              <Text className="text-[#264191] font-bold">
                {t("termsOfService")}
              </Text>
            </Text>
          </Pressable>

          {/* ── Register Button ── */}
          <Pressable
            className="h-14 rounded-xl items-center justify-center bg-[#001a5a] active:opacity-90"
            onPress={handleRegister}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-white text-base font-bold">
                {t("registerButton")}
              </Text>
            )}
          </Pressable>

          {/* ── Footer ── */}
          <View
            style={{ marginTop: "auto", paddingTop: 20, alignItems: "center" }}
          >
            <Pressable onPress={() => navigation.goBack()}>
              <Text style={rtlStyle} className="text-sm text-[#74777f]">
                {t("alreadyHaveAccount")}{" "}
                <Text className="text-[#001a5a] font-bold">
                  {t("signIn")}
                </Text>
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
