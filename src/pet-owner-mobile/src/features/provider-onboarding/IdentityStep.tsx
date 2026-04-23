import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFormContext } from "react-hook-form";
import * as ImagePicker from "expo-image-picker";
import { useTranslation, rowDirectionForAppLayout } from "../../i18n";
import { useTheme } from "../../theme/ThemeContext";
import { filesApi, providerApi } from "../../api/client";
import { AddressMapModal } from "./AddressMapModal";
import { FieldLabel } from "./FieldLabel";
import type { OnboardingFormValues } from "./schemas";

export function IdentityStep() {
  const { t, isRTL, rtlInput } = useTranslation();
  const { colors } = useTheme();
  const { watch, setValue, clearErrors, formState } = useFormContext<OnboardingFormValues>();
  const phoneNumberError = formState.errors.phoneNumber?.message;
  const [uploading, setUploading] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [aiNotes, setAiNotes] = useState("");
  const [generatingBio, setGeneratingBio] = useState(false);

  const providerType = watch("providerType");
  const bio = watch("bio");
  const imageUri = watch("imageUri");
  const phoneNumber = watch("phoneNumber");
  const whatsAppNumber = watch("whatsAppNumber");
  const websiteUrl = watch("websiteUrl");
  const businessName = watch("businessName");
  const city = watch("city");
  const street = watch("street");
  const buildingNumber = watch("buildingNumber");
  const apartmentNumber = watch("apartmentNumber");
  const latitude = watch("latitude");
  const longitude = watch("longitude");

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled || !result.assets?.[0]?.uri) return;

    const uri = result.assets[0].uri;
    setValue("imageUri", uri);
    setUploading(true);
    try {
      const { url } = await filesApi.uploadImage(uri, "profiles");
      setValue("imageUrl", url);
    } catch {
      Alert.alert(t("errorTitle"), t("onbImageUploadError"));
      setValue("imageUri", "");
    } finally {
      setUploading(false);
    }
  };

  const hasAddress = city.trim().length > 0;

  const handleGenerateBio = async () => {
    const notes = aiNotes.trim();
    if (!notes || generatingBio) return;
    setGeneratingBio(true);
    try {
      const result = await providerApi.generateBio(notes);
      setValue("bio", result.bio);
    } catch {
      Alert.alert(t("errorTitle"), t("toastBioFail"));
    } finally {
      setGeneratingBio(false);
    }
  };

  return (
    <ScrollView
      contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24, gap: 20 }}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      showsVerticalScrollIndicator={false}
    >
      {/* Provider Type */}
      <View>
        <FieldLabel text={t("onbProviderType")} isRTL={isRTL} />
        <View style={{ flexDirection: rowDirectionForAppLayout(isRTL), gap: 10 }}>
          <TypeChip
            label={t("onbIndividual")}
            active={providerType === 0}
            onPress={() => setValue("providerType", 0)}
          />
          <TypeChip
            label={t("onbBusiness")}
            active={providerType === 1}
            onPress={() => setValue("providerType", 1)}
          />
        </View>
      </View>

      {providerType === 1 && (
        <View>
          <FieldLabel text={t("onbBusinessName")} isRTL={isRTL} required />
          <StyledInput
            value={businessName}
            onChangeText={(v) => setValue("businessName", v)}
            placeholder={t("onbBusinessNamePlaceholder")}
            isRTL={isRTL}
          />
        </View>
      )}

      {/* Profile Photo */}
      <View>
        <FieldLabel text={t("profilePicture")} isRTL={isRTL} />
        <Pressable
          onPress={pickImage}
          disabled={uploading}
          style={{
            alignSelf: "center",
            width: 100,
            height: 100,
            borderRadius: 20,
            backgroundColor: colors.primaryLight,
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
            borderWidth: 2,
            borderColor: colors.surface,
          }}
        >
          {uploading ? (
            <ActivityIndicator color={colors.text} />
          ) : imageUri ? (
            <Image source={{ uri: imageUri }} style={{ width: 100, height: 100 }} />
          ) : (
            <Ionicons name="camera-outline" size={36} color={colors.text} />
          )}
        </Pressable>
        <Text style={{ fontSize: 12, color: colors.textMuted, textAlign: "center", marginTop: 6 }}>
          {uploading ? t("onbUploadingImage") : t("onbTapToUpload")}
        </Text>
      </View>

      {/* Bio: AI notes → generate (same API as web /providers/generate-bio) → public bio */}
      <View style={{ gap: 10 }}>
        <View>
          <FieldLabel
            text={providerType === 1 ? t("tellAiLabelBusiness") : t("tellAiLabel")}
            isRTL={isRTL}
          />
          <Text
            style={{
              fontSize: 13,
              color: colors.textMuted,
              lineHeight: 18,
              marginBottom: 8,
              textAlign: isRTL ? "right" : "left",
              writingDirection: isRTL ? "rtl" : "ltr",
            }}
          >
            {providerType === 1 ? t("magicBioSubtitleBusiness") : t("magicBioSubtitle")}
          </Text>
          <TextInput
            value={aiNotes}
            onChangeText={setAiNotes}
            placeholder={t("aiNotesPlaceholder")}
            multiline
            maxLength={2000}
            style={{
              backgroundColor: colors.surface,
              borderRadius: 14,
              paddingHorizontal: 14,
              paddingVertical: 12,
              fontSize: 15,
              color: colors.text,
              borderWidth: 1,
              borderColor: colors.border,
              minHeight: 72,
              textAlignVertical: "top",
              ...rtlInput,
            }}
            placeholderTextColor={colors.textMuted}
          />
        </View>

        <Pressable
          onPress={handleGenerateBio}
          disabled={!aiNotes.trim() || generatingBio}
          style={{
            flexDirection: rowDirectionForAppLayout(isRTL),
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            paddingVertical: 14,
            borderRadius: 14,
            backgroundColor: colors.primary,
            opacity: !aiNotes.trim() || generatingBio ? 0.55 : 1,
          }}
        >
          {generatingBio ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Ionicons name="sparkles" size={18} color="#fff" />
          )}
          <Text style={{ fontSize: 15, fontWeight: "700", color: "#fff" }}>
            {generatingBio ? t("generating") : t("magicBioButton")}
          </Text>
        </Pressable>

        <View>
          <FieldLabel text={t("yourBioLabel")} isRTL={isRTL} required />
          <TextInput
            value={bio}
            onChangeText={(v) => setValue("bio", v)}
            placeholder={t("bioPolishedPlaceholder")}
            multiline
            maxLength={1500}
            style={{
              backgroundColor: colors.surface,
              borderRadius: 14,
              paddingHorizontal: 14,
              paddingVertical: 12,
              fontSize: 15,
              color: colors.text,
              borderWidth: 1,
              borderColor: colors.border,
              minHeight: 120,
              textAlignVertical: "top",
              ...rtlInput,
            }}
            placeholderTextColor={colors.textMuted}
          />
          <Text style={{ fontSize: 11, color: colors.textMuted, textAlign: isRTL ? "left" : "right", marginTop: 2 }}>
            {bio.length}/1500
          </Text>
        </View>
      </View>

      {/* Phone */}
      <View>
        <FieldLabel text={t("phoneNumber")} isRTL={isRTL} required />
        <StyledInput
          value={phoneNumber}
          onChangeText={(v) => {
            setValue("phoneNumber", v);
            clearErrors("phoneNumber");
          }}
          placeholder={providerType === 1 ? t("phoneNumberPlaceholderBusiness") : t("phoneNumberPlaceholder")}
          keyboardType="phone-pad"
          isRTL={isRTL}
          errorMessage={phoneNumberError}
        />
      </View>

      {/* WhatsApp */}
      <View>
        <FieldLabel text={t("onbWhatsApp")} isRTL={isRTL} />
        <StyledInput
          value={whatsAppNumber}
          onChangeText={(v) => setValue("whatsAppNumber", v)}
          placeholder={t("phoneNumberPlaceholder")}
          keyboardType="phone-pad"
          isRTL={isRTL}
        />
      </View>

      {/* Website */}
      <View>
        <FieldLabel text={t("onbWebsite")} isRTL={isRTL} />
        <StyledInput
          value={websiteUrl}
          onChangeText={(v) => setValue("websiteUrl", v)}
          placeholder={t("onbWebsitePlaceholder")}
          keyboardType="url"
          autoCapitalize="none"
          isRTL={isRTL}
        />
      </View>

      {/* Address */}
      <View>
        <FieldLabel text={t("onbAddress")} isRTL={isRTL} required />
        <Pressable
          onPress={() => setShowMap(true)}
          style={{
            flexDirection: rowDirectionForAppLayout(isRTL),
            alignItems: "center",
            backgroundColor: colors.surface,
            borderRadius: 14,
            padding: 16,
            borderWidth: 1,
            borderColor: colors.border,
            gap: 10,
          }}
        >
          <Ionicons name="location-outline" size={22} color={colors.text} />
          <Text style={{ flex: 1, fontSize: 14, color: hasAddress ? colors.text : colors.textMuted, textAlign: isRTL ? "right" : "left" }}>
            {hasAddress ? `${street} ${buildingNumber}, ${city}` : t("onbSelectAddress")}
          </Text>
          <Ionicons name={isRTL ? "chevron-back" : "chevron-forward"} size={18} color={colors.textMuted} />
        </Pressable>
      </View>

      <AddressMapModal
        visible={showMap}
        onClose={() => setShowMap(false)}
        initial={{ lat: latitude, lng: longitude, city, street, building: buildingNumber, apartment: apartmentNumber }}
        onConfirm={(data) => {
          setValue("latitude", data.lat);
          setValue("longitude", data.lng);
          setValue("city", data.city);
          setValue("street", data.street);
          setValue("buildingNumber", data.building);
          setValue("apartmentNumber", data.apartment);
          setShowMap(false);
        }}
      />
    </ScrollView>
  );
}

function TypeChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={{
        flex: 1,
        paddingVertical: 14,
        borderRadius: 14,
        alignItems: "center",
        backgroundColor: active ? colors.primary : colors.surface,
        borderWidth: 1,
        borderColor: active ? colors.primary : colors.border,
      }}
    >
      <Text style={{ fontWeight: "700", fontSize: 14, color: active ? "#fff" : colors.text }}>{label}</Text>
    </Pressable>
  );
}

function StyledInput({
  value,
  onChangeText,
  placeholder,
  isRTL,
  keyboardType,
  autoCapitalize,
  errorMessage,
}: {
  value: string;
  onChangeText: (v: string) => void;
  placeholder: string;
  isRTL: boolean;
  keyboardType?: "default" | "phone-pad" | "url" | "email-address";
  autoCapitalize?: "none" | "sentences";
  errorMessage?: string;
}) {
  const { colors } = useTheme();
  const hasError = Boolean(errorMessage);
  return (
    <View>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        style={{
          backgroundColor: colors.surface,
          borderRadius: 14,
          paddingHorizontal: 14,
          paddingVertical: 13,
          fontSize: 15,
          color: colors.text,
          borderWidth: 1,
          borderColor: hasError ? colors.danger : colors.border,
          textAlign: isRTL ? "right" : "left",
          writingDirection: isRTL ? "rtl" : "ltr",
        }}
        placeholderTextColor={colors.textMuted}
      />
      {hasError ? (
        <Text
          style={{
            marginTop: 6,
            fontSize: 12,
            color: colors.danger,
            textAlign: isRTL ? "right" : "left",
          }}
        >
          {errorMessage}
        </Text>
      ) : null}
    </View>
  );
}
