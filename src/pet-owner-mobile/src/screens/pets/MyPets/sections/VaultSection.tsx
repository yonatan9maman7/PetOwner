import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  Alert,
  TextInput,
  ScrollView,
  Linking,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { useTranslation } from "../../../../i18n";
import { useTheme } from "../../../../theme/ThemeContext";
import { petHealthApi, filesApi } from "../../../../api/client";
import { DatePickerField } from "../../../../components/DatePickerField";
import { ListSkeleton } from "../../../../components/shared/ListSkeleton";
import type { MedicalRecordDto } from "../../../../types/api";
import { formInputStyle } from "../helpers";

const RECORD_TYPES = ["Condition", "Medication", "VetVisit"] as const;

export function VaultSection({ petId, reloadNonce = 0 }: { petId: string; reloadNonce?: number }) {
  const { t, isRTL } = useTranslation();
  const { colors } = useTheme();
  const [records, setRecords] = useState<MedicalRecordDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formType, setFormType] = useState<string>(RECORD_TYPES[0]);
  const [formTitle, setFormTitle] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formDate, setFormDate] = useState("");
  const [formAttachmentUrl, setFormAttachmentUrl] = useState<string | undefined>();
  const [formAttachmentName, setFormAttachmentName] = useState<string | undefined>();
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setRecords(await petHealthApi.getMedicalRecords(petId));
    } catch {}
  }, [petId]);

  useEffect(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [load, reloadNonce]);

  const resetForm = () => {
    setShowForm(false);
    setFormType(RECORD_TYPES[0]);
    setFormTitle("");
    setFormDesc("");
    setFormDate("");
    setFormAttachmentUrl(undefined);
    setFormAttachmentName(undefined);
  };

  const pickAttachment = () => {
    Alert.alert(t("attachFile"), undefined, [
      {
        text: t("pickImage"),
        onPress: async () => {
          const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ["images"],
            quality: 0.8,
          });
          if (result.canceled || !result.assets?.[0]) return;
          setUploading(true);
          try {
            const res = await filesApi.uploadDocument(result.assets[0].uri, "health-records");
            setFormAttachmentUrl(res.url);
            setFormAttachmentName(result.assets[0].uri.split("/").pop() ?? "photo");
          } catch {
            Alert.alert(t("errorTitle"), t("genericError"));
          }
          setUploading(false);
        },
      },
      {
        text: t("pickDocument"),
        onPress: async () => {
          const result = await DocumentPicker.getDocumentAsync({
            type: ["application/pdf", "image/*"],
            copyToCacheDirectory: true,
          });
          if (result.canceled || !result.assets?.[0]) return;
          setUploading(true);
          try {
            const res = await filesApi.uploadDocument(result.assets[0].uri, "health-records");
            setFormAttachmentUrl(res.url);
            setFormAttachmentName(result.assets[0].name ?? "document");
          } catch {
            Alert.alert(t("errorTitle"), t("genericError"));
          }
          setUploading(false);
        },
      },
      { text: t("cancel"), style: "cancel" },
    ]);
  };

  const saveRecord = async () => {
    if (!formTitle.trim() || !formDate.trim()) return;
    setSaving(true);
    try {
      await petHealthApi.addMedicalRecord(petId, {
        type: formType,
        title: formTitle.trim(),
        description: formDesc.trim() || undefined,
        date: formDate.trim(),
        documentUrl: formAttachmentUrl,
      });
      resetForm();
      await load();
    } catch (e: any) {
      const msg = e?.response?.data?.message ?? e?.message ?? t("genericError");
      Alert.alert(t("errorTitle"), msg);
    }
    setSaving(false);
  };

  const deleteRecord = async (recordId: string) => {
    try {
      await petHealthApi.deleteMedicalRecord(petId, recordId);
      await load();
    } catch {}
  };

  if (loading) {
    return (
      <View style={{ paddingHorizontal: 20, paddingTop: 16 }}>
        <ListSkeleton rows={3} variant="row" />
      </View>
    );
  }

  return (
    <View style={{ padding: 20, gap: 10 }}>
      {records.length === 0 && !showForm && (
        <View style={{ padding: 24, alignItems: "center" }}>
          <View
            style={{
              width: 64,
              height: 64,
              borderRadius: 20,
              backgroundColor: "#fffbeb",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 12,
            }}
          >
            <Ionicons name="folder-open-outline" size={32} color="#fbbf24" />
          </View>
          <Text style={{ color: colors.textMuted, fontSize: 15, fontWeight: "600", textAlign: "center" }}>
            {t("noMedicalRecords")}
          </Text>
        </View>
      )}

      {records.map((rec) => (
        <View
          key={rec.id}
          style={{
            flexDirection: isRTL ? "row-reverse" : "row",
            backgroundColor: colors.surface,
            borderRadius: 14,
            padding: 14,
            gap: 12,
            alignItems: "center",
            shadowColor: colors.shadow,
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.04,
            shadowRadius: 4,
            elevation: 1,
          }}
        >
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              backgroundColor: "#f5f3ff",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons
              name={
                rec.type === "Vaccination"
                  ? "medkit"
                  : rec.type === "WeightLog"
                    ? "scale"
                    : rec.type === "VetVisit"
                      ? "medical"
                      : rec.type === "Medication"
                        ? "flask"
                        : "document-text"
              }
              size={20}
              color="#7c3aed"
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontSize: 14,
                fontWeight: "700",
                color: colors.text,
                textAlign: isRTL ? "right" : "left",
              }}
              numberOfLines={1}
            >
              {rec.title}
            </Text>
            <Text style={{ fontSize: 11, color: colors.textSecondary, textAlign: isRTL ? "right" : "left", marginTop: 2 }}>
              {rec.type} · {new Date(rec.date).toLocaleDateString()}
            </Text>
          </View>
          {rec.documentUrl && (
            <Pressable
              onPress={() => Linking.openURL(rec.documentUrl!)}
              style={{
                width: 34,
                height: 34,
                borderRadius: 10,
                backgroundColor: "#f5f3ff",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons name="open-outline" size={16} color="#7c3aed" />
            </Pressable>
          )}
          {!rec.vaccinationId && !rec.weightLogId && (
            <Pressable onPress={() => deleteRecord(rec.id)} hitSlop={8}>
              <Ionicons name="trash-outline" size={16} color="#ef4444" />
            </Pressable>
          )}
        </View>
      ))}

      {showForm ? (
        <View
          style={{
            backgroundColor: colors.surface,
            borderRadius: 16,
            padding: 16,
            gap: 12,
            borderWidth: 1,
            borderColor: "#fde68a",
          }}
        >
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{
              gap: 8,
              flexDirection: isRTL ? "row-reverse" : "row",
            }}
          >
            {RECORD_TYPES.map((rt) => (
              <Pressable
                key={rt}
                onPress={() => setFormType(rt)}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 10,
                  backgroundColor: formType === rt ? "#d97706" : colors.surfaceSecondary,
                }}
              >
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: "600",
                    color: formType === rt ? "#fff" : colors.textSecondary,
                  }}
                >
                  {rt}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
          <TextInput
            placeholder={t("recordTitle")}
            value={formTitle}
            onChangeText={setFormTitle}
            style={formInputStyle(isRTL, colors)}
            placeholderTextColor={colors.textMuted}
          />
          <DatePickerField
            value={formDate}
            onChange={setFormDate}
            placeholder={t("dateRecorded")}
            isRTL={isRTL}
            maximumDate={new Date()}
          />
          <TextInput
            placeholder={t("recordDescription")}
            value={formDesc}
            onChangeText={setFormDesc}
            style={formInputStyle(isRTL, colors)}
            placeholderTextColor={colors.textMuted}
            multiline
          />
          <Pressable
            onPress={pickAttachment}
            disabled={uploading}
            style={{
              flexDirection: isRTL ? "row-reverse" : "row",
              alignItems: "center",
              gap: 8,
              paddingVertical: 10,
              paddingHorizontal: 14,
              borderRadius: 10,
              borderWidth: 1,
              borderColor: formAttachmentUrl ? "#16a34a" : colors.borderLight,
              borderStyle: "dashed",
              backgroundColor: formAttachmentUrl ? "#f0fdf4" : colors.surfaceSecondary,
            }}
          >
            {uploading ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Ionicons
                name={formAttachmentUrl ? "checkmark-circle" : "attach"}
                size={18}
                color={formAttachmentUrl ? "#16a34a" : colors.textSecondary}
              />
            )}
            <Text style={{ fontSize: 13, color: formAttachmentUrl ? "#16a34a" : colors.textSecondary, flex: 1 }} numberOfLines={1}>
              {uploading ? t("uploading") : formAttachmentName ?? t("attachFile")}
            </Text>
            {formAttachmentUrl && (
              <Pressable
                onPress={() => {
                  setFormAttachmentUrl(undefined);
                  setFormAttachmentName(undefined);
                }}
                hitSlop={8}
              >
                <Ionicons name="close-circle" size={16} color="#ef4444" />
              </Pressable>
            )}
          </Pressable>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <Pressable
              onPress={resetForm}
              style={{
                flex: 1,
                paddingVertical: 12,
                borderRadius: 12,
                backgroundColor: colors.surfaceSecondary,
                alignItems: "center",
              }}
            >
              <Text style={{ fontWeight: "600", color: colors.textSecondary, fontSize: 14 }}>{t("cancel")}</Text>
            </Pressable>
            {(() => {
              const canSave = !!formTitle.trim() && !!formDate.trim() && !saving;
              return (
                <Pressable
                  onPress={saveRecord}
                  disabled={!canSave}
                  style={{
                    flex: 1,
                    paddingVertical: 12,
                    borderRadius: 12,
                    backgroundColor: canSave ? "#d97706" : "#fcd34d",
                    alignItems: "center",
                    opacity: canSave ? 1 : 0.6,
                  }}
                >
                  {saving ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={{ fontWeight: "700", color: "#fff", fontSize: 14 }}>{t("save")}</Text>
                  )}
                </Pressable>
              );
            })()}
          </View>
        </View>
      ) : (
        <Pressable
          onPress={() => {
            resetForm();
            setShowForm(true);
          }}
          style={{
            flexDirection: isRTL ? "row-reverse" : "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            paddingVertical: 14,
            borderRadius: 14,
            borderWidth: 1.5,
            borderColor: "#d97706",
            borderStyle: "dashed",
            backgroundColor: "#fffbeb",
          }}
        >
          <Ionicons name="add-circle" size={18} color="#d97706" />
          <Text style={{ fontSize: 14, fontWeight: "600", color: "#d97706" }}>{t("addRecord")}</Text>
        </Pressable>
      )}
    </View>
  );
}
