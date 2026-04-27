import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  TextInput,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { showGlobalAlertCompat } from "../../../../components/global-modal";
import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import { useTranslation, type TranslationKey, rowDirectionForAppLayout } from "../../../../i18n";
import { useTheme } from "../../../../theme/ThemeContext";
import { medicalApi, filesApi } from "../../../../api/client";
import { DatePickerField } from "../../../../components/DatePickerField";
import { ListSkeleton } from "../../../../components/shared/ListSkeleton";
import {
  VaccineNameApiValue,
  VACCINE_NAME_OPTIONS,
  type VaccineNameOption,
  type CreateVaccinationRequest,
  type VaccineStatusDto,
  type VaccinationDto,
} from "../../../../types/api";
import { STATUS_STYLE } from "../constants";
import { formInputStyle } from "../helpers";
import { pickImageWithSource } from "../../../../utils/imagePicker";

const VACCINE_NAME_I18N: Record<VaccineNameOption, TranslationKey> = {
  Rabies: "vaccineRabies",
  Parvo: "vaccineParvo",
  Distemper: "vaccineDistemper",
  Hepatitis: "vaccineHepatitis",
  Leptospirosis: "vaccineLeptospirosis",
  Bordetella: "vaccineBordetella",
  Lyme: "vaccineLyme",
  Influenza: "vaccineInfluenza",
  Worms: "vaccineWorms",
  Fleas: "vaccineFleas",
  Ticks: "vaccineTicks",
  FeLV: "vaccineFeLV",
  FIV: "vaccineFIV",
  Other: "vaccineOther",
};

function vaccineNameToEnumValue(raw: unknown): number | null {
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (/^\d+$/.test(trimmed)) return parseInt(trimmed, 10);
    if ((trimmed as VaccineNameOption) in VaccineNameApiValue) {
      return VaccineNameApiValue[trimmed as VaccineNameOption];
    }
  }
  return null;
}

function vaccineEnumToOption(val: number): VaccineNameOption | null {
  const pair = (Object.entries(VaccineNameApiValue) as [VaccineNameOption, number][]).find(([, v]) => v === val);
  return pair ? pair[0] : null;
}

function formatVaccineName(raw: unknown, translate: (k: TranslationKey) => string): string {
  const val = vaccineNameToEnumValue(raw);
  if (val == null) return String(raw ?? "");
  const opt = vaccineEnumToOption(val);
  if (!opt) return String(raw);
  return translate(VACCINE_NAME_I18N[opt]);
}

function sameVaccineName(a: unknown, b: unknown): boolean {
  const va = vaccineNameToEnumValue(a);
  const vb = vaccineNameToEnumValue(b);
  return va != null && vb != null && va === vb;
}

export function VaccinesSection({ petId, reloadNonce = 0 }: { petId: string; reloadNonce?: number }) {
  const { t, isRTL } = useTranslation();
  const { colors } = useTheme();
  const [statuses, setStatuses] = useState<VaccineStatusDto[]>([]);
  const [vaccinations, setVaccinations] = useState<VaccinationDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingVacId, setEditingVacId] = useState<string | null>(null);
  const [formName, setFormName] = useState<VaccineNameOption>(VACCINE_NAME_OPTIONS[0]);
  const [formDate, setFormDate] = useState("");
  const [formNextDue, setFormNextDue] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [formDocUrl, setFormDocUrl] = useState<string | undefined>();
  const [formDocName, setFormDocName] = useState<string | undefined>();
  const [docUploading, setDocUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const [s, v] = await Promise.all([medicalApi.getVaccineStatus(petId), medicalApi.getVaccinations(petId)]);
      setStatuses(s);
      setVaccinations(v);
    } catch {}
  }, [petId]);

  useEffect(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [load, reloadNonce]);

  const resetForm = () => {
    setShowForm(false);
    setEditingVacId(null);
    setFormDate("");
    setFormNextDue("");
    setFormNotes("");
    setFormName(VACCINE_NAME_OPTIONS[0]);
    setFormDocUrl(undefined);
    setFormDocName(undefined);
  };

  const openEdit = (vac: VaccinationDto) => {
    const val = vaccineNameToEnumValue(vac.vaccineName);
    const nameOption = val != null ? vaccineEnumToOption(val) : null;
    setFormName(nameOption ?? VACCINE_NAME_OPTIONS[0]);
    setFormDate(vac.dateAdministered?.slice(0, 10) ?? "");
    setFormNextDue(vac.nextDueDate?.slice(0, 10) ?? "");
    setFormNotes(vac.notes ?? "");
    setFormDocUrl(vac.documentUrl ?? undefined);
    setFormDocName(vac.documentUrl ? "Attached" : undefined);
    setEditingVacId(vac.id);
    setShowForm(true);
  };

  const pickVaccineDoc = () => {
    showGlobalAlertCompat(t("attachFile"), undefined, [
      {
        text: t("pickImage"),
        onPress: async () => {
          const uri = await pickImageWithSource({
            labels: {
              camera: t("takePhoto"),
              gallery: t("chooseFromLibrary"),
              cancel: t("cancel"),
            },
            pickerOptions: { mediaTypes: ["images"], quality: 0.8 },
            permissionDeniedAlert: {
              title: t("errorTitle"),
              message: t("triagePhotoPermissionDenied"),
            },
          });
          if (!uri) return;
          setDocUploading(true);
          try {
            const res = await filesApi.uploadDocument(uri, "health-records");
            setFormDocUrl(res.url);
            setFormDocName(uri.split("/").pop() ?? "photo");
          } catch {
            showGlobalAlertCompat(t("errorTitle"), t("genericError"));
          }
          setDocUploading(false);
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
          setDocUploading(true);
          try {
            const res = await filesApi.uploadDocument(result.assets[0].uri, "health-records");
            setFormDocUrl(res.url);
            setFormDocName(result.assets[0].name ?? "document");
          } catch {
            showGlobalAlertCompat(t("errorTitle"), t("genericError"));
          }
          setDocUploading(false);
        },
      },
      { text: t("cancel"), style: "cancel" },
    ]);
  };

  const saveVaccine = async () => {
    const dateAdministered = formDate.trim();
    if (!dateAdministered) return;
    setSaving(true);
    try {
      const nextTrim = formNextDue.trim();
      const notesTrim = formNotes.trim();

      if (editingVacId) {
        await medicalApi.updateVaccination(petId, editingVacId, {
          vaccineName: VaccineNameApiValue[formName],
          dateAdministered,
          nextDueDate: nextTrim || null,
          notes: notesTrim || null,
          documentUrl: formDocUrl ?? null,
        });
      } else {
        const payload: CreateVaccinationRequest = {
          vaccineName: VaccineNameApiValue[formName],
          dateAdministered,
        };
        if (nextTrim) payload.nextDueDate = nextTrim;
        if (notesTrim) payload.notes = notesTrim;
        if (formDocUrl) payload.documentUrl = formDocUrl;
        await medicalApi.addVaccination(petId, payload);
      }
      resetForm();
      await load();
    } catch (e: unknown) {
      const err = e as { response?: { data?: unknown }; message?: string };
      const data = err.response?.data as
        | { message?: string; errors?: Record<string, string[]>; title?: string }
        | undefined;
      const msg =
        (typeof data?.message === "string" && data.message) ||
        (data?.errors && JSON.stringify(data.errors)) ||
        (typeof data?.title === "string" && data.title) ||
        err.message ||
        t("genericError");
      showGlobalAlertCompat(t("errorTitle"), msg);
    }
    setSaving(false);
  };

  const deleteVaccine = async (vaccineName: string | number) => {
    const vac = vaccinations.find((v) => sameVaccineName(v.vaccineName, vaccineName));
    if (!vac) return;
    try {
      await medicalApi.deleteVaccination(petId, vac.id);
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
      {statuses.length === 0 ? (
        <View style={{ padding: 24, alignItems: "center" }}>
          <View
            style={{
              width: 64,
              height: 64,
              borderRadius: 20,
              backgroundColor: "#ecfdf5",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 12,
            }}
          >
            <Ionicons name="shield-checkmark-outline" size={32} color="#6ee7b7" />
          </View>
          <Text style={{ color: colors.textMuted, fontSize: 15, fontWeight: "600", textAlign: "center" }}>{t("noVaccines")}</Text>
          <Text style={{ color: colors.textMuted, fontSize: 12, textAlign: "center", marginTop: 4, lineHeight: 18 }}>
            {t("vaccineEmptyStateHint")}
          </Text>
        </View>
      ) : (
        <>
          {(() => {
            const urgent = statuses.filter((s) => s.status === "Overdue" || s.status === "Due Soon");
            const upToDate = statuses.filter((s) => s.status === "Up to Date");
            const renderRow = (s: VaccineStatusDto) => {
              const st = STATUS_STYLE[s.status] ?? STATUS_STYLE["Up to Date"];
              const vacKey = vaccineNameToEnumValue(s.vaccineName) ?? String(s.vaccineName);
              return (
                <View
                  key={vacKey}
                  style={{
                    flexDirection: rowDirectionForAppLayout(isRTL),
                    alignItems: "center",
                    backgroundColor: colors.surface,
                    padding: 14,
                    borderRadius: 14,
                    gap: 12,
                    shadowColor: colors.shadow,
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.04,
                    shadowRadius: 4,
                    elevation: 1,
                  }}
                >
                  <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: st.bg, alignItems: "center", justifyContent: "center" }}>
                    <Ionicons name="shield-checkmark" size={18} color={st.fg} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: "700", color: colors.text, textAlign: isRTL ? "right" : "left" }}>
                      {formatVaccineName(s.vaccineName, t)}
                    </Text>
                    {s.dateAdministered && (
                      <Text style={{ fontSize: 11, color: colors.textSecondary, textAlign: isRTL ? "right" : "left", marginTop: 2 }}>
                        {new Date(s.dateAdministered).toLocaleDateString()}
                        {s.nextDueDate ? ` → ${new Date(s.nextDueDate).toLocaleDateString()}` : ""}
                      </Text>
                    )}
                  </View>
                  <View style={{ backgroundColor: st.bg, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 }}>
                    <Text style={{ fontSize: 10, fontWeight: "700", color: st.fg }}>
                      {s.status === "Up to Date" ? t("upToDate") : s.status === "Due Soon" ? t("dueSoon") : t("overdue")}
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => {
                      const vac = vaccinations.find((v) => sameVaccineName(v.vaccineName, s.vaccineName));
                      if (vac) openEdit(vac);
                    }}
                    hitSlop={8}
                  >
                    <Ionicons name="create-outline" size={16} color={colors.textSecondary} />
                  </Pressable>
                  <Pressable onPress={() => deleteVaccine(s.vaccineName)} hitSlop={8}>
                    <Ionicons name="trash-outline" size={16} color="#ef4444" />
                  </Pressable>
                </View>
              );
            };
            return (
              <>
                {urgent.length > 0 && (
                  <>
                    <Text style={{ fontSize: 13, fontWeight: "700", color: "#dc2626", textAlign: isRTL ? "right" : "left", marginBottom: 2 }}>
                      {t("upcomingVaccines")}
                    </Text>
                    {urgent.map(renderRow)}
                  </>
                )}
                {upToDate.length > 0 && (
                  <>
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: "700",
                        color: colors.textSecondary,
                        textAlign: isRTL ? "right" : "left",
                        marginTop: urgent.length > 0 ? 12 : 0,
                        marginBottom: 2,
                      }}
                    >
                      {t("vaccinationHistory")}
                    </Text>
                    {upToDate.map(renderRow)}
                  </>
                )}
              </>
            );
          })()}
        </>
      )}

      {showForm ? (
        <View
          style={{
            backgroundColor: colors.surface,
            borderRadius: 16,
            padding: 16,
            gap: 12,
            borderWidth: 1,
            borderColor: "#ede9fe",
          }}
        >
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{
              gap: 8,
              flexDirection: rowDirectionForAppLayout(isRTL),
            }}
          >
            {VACCINE_NAME_OPTIONS.map((name) => (
              <Pressable
                key={name}
                onPress={() => setFormName(name)}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 10,
                  backgroundColor: formName === name ? colors.primary : colors.surfaceSecondary,
                }}
              >
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: "600",
                    color: formName === name ? "#fff" : colors.textSecondary,
                  }}
                >
                  {t(VACCINE_NAME_I18N[name])}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
          <DatePickerField
            value={formDate}
            onChange={setFormDate}
            placeholder={t("dateAdministered")}
            isRTL={isRTL}
            maximumDate={new Date()}
          />
          <DatePickerField
            value={formNextDue}
            onChange={setFormNextDue}
            placeholder={t("nextDueDate")}
            isRTL={isRTL}
            minimumDate={formDate ? new Date(`${formDate}T12:00:00`) : undefined}
          />
          <Text style={{ fontSize: 11, color: colors.textMuted, textAlign: isRTL ? "right" : "left", marginTop: -6 }}>
            {t("vaccineReminderHint")}
          </Text>
          <TextInput
            placeholder={t("vaccineNotes")}
            value={formNotes}
            onChangeText={setFormNotes}
            style={formInputStyle(isRTL, colors)}
            placeholderTextColor={colors.textMuted}
          />
          <Pressable
            onPress={pickVaccineDoc}
            disabled={docUploading}
            style={{
              flexDirection: rowDirectionForAppLayout(isRTL),
              alignItems: "center",
              gap: 8,
              paddingVertical: 10,
              paddingHorizontal: 14,
              borderRadius: 10,
              borderWidth: 1,
              borderColor: formDocUrl ? "#16a34a" : colors.borderLight,
              borderStyle: "dashed",
              backgroundColor: formDocUrl ? "#f0fdf4" : colors.surfaceSecondary,
            }}
          >
            {docUploading ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Ionicons name={formDocUrl ? "checkmark-circle" : "attach"} size={18} color={formDocUrl ? "#16a34a" : colors.textSecondary} />
            )}
            <Text style={{ fontSize: 13, color: formDocUrl ? "#16a34a" : colors.textSecondary, flex: 1 }} numberOfLines={1}>
              {docUploading ? t("uploading") : formDocName ?? t("attachFile")}
            </Text>
            {formDocUrl && (
              <Pressable
                onPress={() => {
                  setFormDocUrl(undefined);
                  setFormDocName(undefined);
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
            <Pressable
              onPress={saveVaccine}
              disabled={saving || !formDate.trim()}
              style={{
                flex: 1,
                paddingVertical: 12,
                borderRadius: 12,
                backgroundColor: !formDate.trim() ? colors.primaryLight : colors.primary,
                alignItems: "center",
                opacity: !formDate.trim() ? 0.6 : 1,
              }}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={{ fontWeight: "700", color: "#fff", fontSize: 14 }}>{t("save")}</Text>
              )}
            </Pressable>
          </View>
        </View>
      ) : (
        <Pressable
          onPress={() => {
            resetForm();
            setShowForm(true);
          }}
          style={{
            flexDirection: rowDirectionForAppLayout(isRTL),
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            paddingVertical: 14,
            borderRadius: 14,
            borderWidth: 1.5,
            borderColor: colors.primary,
            borderStyle: "dashed",
            backgroundColor: colors.primaryLight,
          }}
        >
          <Ionicons name="add-circle" size={18} color={colors.primary} />
          <Text style={{ fontSize: 14, fontWeight: "600", color: colors.primary }}>{t("addVaccine")}</Text>
        </Pressable>
      )}
    </View>
  );
}
