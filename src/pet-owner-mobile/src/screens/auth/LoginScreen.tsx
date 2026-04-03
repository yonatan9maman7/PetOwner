import { useState } from "react";
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

/* ─── LoginScreen (root) ─────────────────────────────────────────── */

export function LoginScreen() {
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const logout = useAuthStore((s) => s.logout);
  const { t, rtlText, rtlStyle } = useTranslation();

  if (isLoggedIn) {
    return (
      <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
        <View className="flex-row justify-end px-8 pt-4">
          <LanguageToggle />
        </View>
        <View className="flex-1 items-center justify-center px-8">
          <View className="w-20 h-20 rounded-full bg-[#f4fafd] items-center justify-center mb-6">
            <Ionicons name="person" size={36} color="#001a5a" />
          </View>
          <Text
            style={rtlStyle}
            className="text-xl font-bold text-[#161d1f] text-center mb-6"
          >
            {t("myProfile")}
          </Text>
          <Pressable
            className="py-3.5 px-10 rounded-2xl active:opacity-80"
            style={{ backgroundColor: "rgba(186,26,26,0.1)" }}
            onPress={logout}
          >
            <Text className="text-base font-bold text-[#ba1a1a]">
              {t("logoutButton")}
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return <LoginForm />;
}

/* ─── LoginForm ──────────────────────────────────────────────────── */

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [secureEntry, setSecureEntry] = useState(true);
  const navigation = useNavigation<any>();
  const setAuth = useAuthStore((s) => s.setAuth);
  const { t, isHebrew, rtlText, rtlStyle, rtlRow, rtlInput, alignCls } =
    useTranslation();

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert(t("errorTitle"), t("fillAllFields"));
      return;
    }

    setLoading(true);
    try {
      const { data } = await apiClient.post("/auth/login", {
        email,
        password,
      });
      await setAuth(data.token, data.userId ?? data.id);
      navigation.navigate("Explore");
    } catch (err: any) {
      const message = err.response?.data?.message ?? t("loginError");
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
          {/* ── Header: Branding + Language Toggle ── */}
          <View className="flex-row items-center justify-between mb-8">
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

          {/* ── Welcome ── */}
          <View className="mb-6">
            <Text
              style={rtlText}
              className={`text-3xl font-bold text-[#161d1f] mb-2 ${alignCls}`}
            >
              {t("welcomeTitle")}
            </Text>
            <Text
              style={rtlText}
              className={`text-base leading-6 text-[#74777f] ${alignCls}`}
            >
              {t("welcomeSubtitle")}
            </Text>
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

          {/* ── Password ── */}
          <View className="mb-3">
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

          {/* ── Forgot Password Link ── */}
          <Pressable
            className={`mb-6 ${isHebrew ? "self-end" : "self-start"}`}
            hitSlop={8}
            onPress={() => navigation.navigate("ForgotPasswordScreen")}
          >
            <Text className="text-xs font-bold text-[#264191]">
              {t("forgotPassword")}
            </Text>
          </Pressable>

          {/* ── Sign-In Button ── */}
          <Pressable
            className="h-14 rounded-xl items-center justify-center bg-[#001a5a] active:opacity-90"
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-white text-base font-bold">
                {t("loginButton")}
              </Text>
            )}
          </Pressable>

          {/* ── Divider ── */}
          <View className="flex-row items-center my-6">
            <View className="flex-1 h-px bg-[#c4c6cf]/30" />
            <Text
              style={rtlStyle}
              className={`px-4 text-xs font-bold text-[#74777f] ${!isHebrew ? "uppercase tracking-wider" : ""}`}
            >
              {t("socialDivider")}
            </Text>
            <View className="flex-1 h-px bg-[#c4c6cf]/30" />
          </View>

          {/* ── Social Login ── */}
          <View className="flex-row gap-4">
            <Pressable className="flex-1 flex-row items-center justify-center gap-3 h-12 bg-[#e8eff1] rounded-xl active:bg-[#dde4e6]">
              <Ionicons name="logo-apple" size={20} color="#161d1f" />
              <Text className="text-sm font-bold text-[#161d1f]">Apple</Text>
            </Pressable>
            <Pressable className="flex-1 flex-row items-center justify-center gap-3 h-12 bg-[#e8eff1] rounded-xl active:bg-[#dde4e6]">
              <Ionicons name="logo-google" size={20} color="#161d1f" />
              <Text className="text-sm font-bold text-[#161d1f]">Google</Text>
            </Pressable>
          </View>

          {/* ── Footer ── */}
          <View
            style={{ marginTop: "auto", paddingTop: 16, alignItems: "center" }}
          >
            <Pressable onPress={() => navigation.navigate("RegisterScreen")}>
              <Text style={rtlStyle} className="text-sm text-[#74777f]">
                {t("newToCommunity")}{" "}
                <Text className="text-[#001a5a] font-bold">
                  {t("createAccount")}
                </Text>
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
