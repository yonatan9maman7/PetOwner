import { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Image,
  ActionSheetIOS,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";
import { useAuthStore } from "../../store/authStore";
import { authApi } from "../../api/client";
import { useTranslation } from "../../i18n";
import { useTheme } from "../../theme/ThemeContext";

function InputLabel({ text }: { text: string }) {
  const { isRTL } = useTranslation();
  const { colors } = useTheme();
  return (
    <Text
      style={{
        fontSize: 13,
        fontWeight: "600",
        color: colors.textSecondary,
        marginBottom: 6,
        textAlign: isRTL ? "right" : "left",
      }}
    >
      {text}
    </Text>
  );
}

export function AccountEditScreen() {
  const navigation = useNavigation<any>();
  const user = useAuthStore((s) => s.user);
  const { t, isRTL } = useTranslation();
  const { colors } = useTheme();

  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [phone, setPhone] = useState("");
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    authApi
      .getMe()
      .then((me) => {
        setName(me.name);
        setEmail(me.email);
        setPhone(me.phone ?? "");
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const initials = (user?.name ?? "?")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const pickFromLibrary = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets?.[0]) {
      setAvatarUri(result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(t("genericError"));
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets?.[0]) {
      setAvatarUri(result.assets[0].uri);
    }
  };

  const showPhotoOptions = () => {
    const options = [
      t("chooseFromLibrary"),
      t("takePhoto"),
      ...(avatarUri ? [t("removePhoto")] : []),
      t("cancel"),
    ];
    const destructiveIndex = avatarUri ? 2 : undefined;
    const cancelIndex = options.length - 1;

    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options,
          cancelButtonIndex: cancelIndex,
          destructiveButtonIndex: destructiveIndex,
          title: t("editProfilePicture"),
        },
        (idx) => {
          if (idx === 0) pickFromLibrary();
          else if (idx === 1) takePhoto();
          else if (idx === 2 && avatarUri) setAvatarUri(null);
        },
      );
    } else {
      Alert.alert(t("editProfilePicture"), undefined, [
        { text: t("chooseFromLibrary"), onPress: pickFromLibrary },
        { text: t("takePhoto"), onPress: takePhoto },
        ...(avatarUri
          ? [
              {
                text: t("removePhoto"),
                style: "destructive" as const,
                onPress: () => setAvatarUri(null),
              },
            ]
          : []),
        { text: t("cancel"), style: "cancel" as const },
      ]);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await authApi.updateProfile({
        name: name.trim(),
        phone: phone.trim() || undefined,
      });
      await useAuthStore.getState().setAuth(res.token, res.userId);
      Alert.alert(t("profileUpdated"));
      navigation.goBack();
    } catch {
      Alert.alert(t("genericError"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colors.background, marginTop: -8 }}
      edges={["top"]}
    >
      {/* Header */}
      <View
        style={{
          flexDirection: isRTL ? "row-reverse" : "row",
          alignItems: "center",
          paddingHorizontal: 16,
          paddingVertical: 12,
          backgroundColor: colors.surface,
          borderBottomWidth: 1,
          borderBottomColor: colors.borderLight,
        }}
      >
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          style={{ padding: 4 }}
        >
          <Ionicons
            name={isRTL ? "arrow-forward" : "arrow-back"}
            size={24}
            color={colors.text}
          />
        </TouchableOpacity>
        <Text
          style={{
            flex: 1,
            fontSize: 18,
            fontWeight: "700",
            color: colors.text,
            textAlign: "center",
          }}
        >
          {t("personalInfo")}
        </Text>
        <View style={{ width: 32 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {loading && (
            <ActivityIndicator
              size="large"
              color={colors.text}
              style={{ marginVertical: 40 }}
            />
          )}

          {!loading && (
          <>
          {/* ── Profile Picture ── */}
          <View style={{ alignItems: "center", marginBottom: 28 }}>
            <TouchableOpacity onPress={showPhotoOptions} style={{ alignItems: "center" }}>
              <View style={{ position: "relative" }}>
                {avatarUri ? (
                  <Image
                    source={{ uri: avatarUri }}
                    style={{
                      width: 100,
                      height: 100,
                      borderRadius: 50,
                      borderWidth: 3,
                      borderColor: colors.primaryLight,
                    }}
                  />
                ) : (
                  <View
                    style={{
                      width: 100,
                      height: 100,
                      borderRadius: 50,
                      alignItems: "center",
                      justifyContent: "center",
                      borderWidth: 3,
                      borderColor: colors.primaryLight,
                      backgroundColor: colors.primary,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 32,
                        fontWeight: "800",
                        color: colors.textInverse,
                      }}
                    >
                      {initials}
                    </Text>
                  </View>
                )}

                {/* Camera badge */}
                <View
                  style={{
                    position: "absolute",
                    bottom: 0,
                    right: 0,
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor: colors.text,
                    alignItems: "center",
                    justifyContent: "center",
                    borderWidth: 2.5,
                    borderColor: colors.background,
                  }}
                >
                  <Ionicons name="camera" size={15} color={colors.textInverse} />
                </View>
              </View>

              <Text
                style={{
                  marginTop: 10,
                  fontSize: 14,
                  fontWeight: "600",
                  color: colors.primary,
                }}
              >
                {t("changePhoto")}
              </Text>
            </TouchableOpacity>
          </View>

          {/* ── Form card ── */}
          <View
            style={{
              backgroundColor: colors.surface,
              borderRadius: 18,
              padding: 20,
              borderWidth: 1,
              borderColor: colors.borderLight,
              shadowColor: colors.shadow,
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.04,
              shadowRadius: 10,
              elevation: 2,
              gap: 20,
            }}
          >
            {/* Name */}
            <View>
              <InputLabel text={t("fullName")} />
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder={t("fullNamePlaceholder")}
                placeholderTextColor={colors.textMuted}
                style={{
                  backgroundColor: colors.inputBg,
                  borderRadius: 12,
                  paddingHorizontal: 16,
                  paddingVertical: 13,
                  fontSize: 15.5,
                  color: colors.text,
                  borderWidth: 1,
                  borderColor: colors.border,
                  textAlign: isRTL ? "right" : "left",
                }}
              />
            </View>

            {/* Phone */}
            <View>
              <InputLabel text={t("phoneLabel")} />
              <TextInput
                value={phone}
                onChangeText={setPhone}
                placeholder={t("phonePlaceholder")}
                placeholderTextColor={colors.textMuted}
                keyboardType="phone-pad"
                style={{
                  backgroundColor: colors.inputBg,
                  borderRadius: 12,
                  paddingHorizontal: 16,
                  paddingVertical: 13,
                  fontSize: 15.5,
                  color: colors.text,
                  borderWidth: 1,
                  borderColor: colors.border,
                  textAlign: isRTL ? "right" : "left",
                }}
              />
            </View>

            {/* Email (read-only) */}
            <View>
              <InputLabel text={t("emailLabel")} />
              <View
                style={{
                  backgroundColor: colors.surfaceSecondary,
                  borderRadius: 12,
                  paddingHorizontal: 16,
                  paddingVertical: 13,
                  borderWidth: 1,
                  borderColor: colors.border,
                  flexDirection: isRTL ? "row-reverse" : "row",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <Ionicons name="lock-closed" size={14} color={colors.textMuted} />
                <Text
                  style={{
                    fontSize: 15.5,
                    color: colors.textSecondary,
                    flex: 1,
                    textAlign: isRTL ? "right" : "left",
                  }}
                >
                  {email || t("managedViaLogin")}
                </Text>
              </View>
              <Text
                style={{
                  fontSize: 11.5,
                  color: colors.textMuted,
                  marginTop: 4,
                  textAlign: isRTL ? "right" : "left",
                }}
              >
                {t("emailCannotChange")}
              </Text>
            </View>
          </View>

          {/* Save */}
          <TouchableOpacity
            onPress={handleSave}
            disabled={saving || !name.trim()}
            activeOpacity={0.9}
            style={{
              marginTop: 24,
              borderRadius: 16,
              paddingVertical: 16,
              alignItems: "center",
              backgroundColor:
                saving || !name.trim() ? colors.textMuted : colors.text,
              shadowColor: colors.text,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: saving || !name.trim() ? 0 : 0.2,
              shadowRadius: 8,
              elevation: saving || !name.trim() ? 0 : 3,
            }}
          >
            {saving ? (
              <ActivityIndicator size="small" color={colors.textInverse} />
            ) : (
              <Text
                style={{ fontSize: 16, fontWeight: "700", color: colors.textInverse }}
              >
                {t("save")}
              </Text>
            )}
          </TouchableOpacity>
          </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
