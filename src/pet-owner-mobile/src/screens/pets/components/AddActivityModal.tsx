import { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  Modal,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { useForm, Controller, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation, rowDirectionForAppLayout } from "../../../i18n";
import { useTheme } from "../../../theme/ThemeContext";
import { DatePickerField } from "../../../components/DatePickerField";
import { TimePickerField } from "../../../components/TimePickerField";
import { useActivitiesStore } from "../../../store/activitiesStore";
import type { CreateActivityDto, PetActivityType } from "../../../types/api";
import type { TranslationKey } from "../../../i18n";
import { formInputStyle } from "../MyPets/helpers";
import { useKeyboardAvoidingState } from "../../../hooks/useKeyboardAvoidingState";

/** Activity types the modal supports creating. "Weight" is intentionally excluded
 *  — weight is tracked via the dedicated WeightSection in MyPets. */
export type CreateableActivityType = Exclude<PetActivityType, "Weight">;

function todayYmd(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function nowHHMM(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/** Local wall time as `yyyy-MM-ddTHH:mm:00` (no `Z`) for JSON → server `DateTime`. */
function localYmdHhmmToIsoLike(ymd: string, hhmm: string): string {
  const [y, mo, da] = ymd.split("-").map((p) => parseInt(p, 10));
  const [hStr, mStr] = (hhmm || "00:00").split(":");
  const h = parseInt(hStr ?? "0", 10);
  const mi = parseInt(mStr ?? "0", 10);
  const pad = (n: number) => String(n).padStart(2, "0");
  if (!Number.isFinite(y) || !Number.isFinite(mo) || !Number.isFinite(da)) {
    return `${ymd}T00:00:00`;
  }
  return `${y}-${pad(mo)}-${pad(da)}T${pad(h)}:${pad(mi)}:00`;
}

const feedingTimeRe = /^([01]\d|2[0-3]):[0-5]\d$/;

const addActivitySchema = z
  .object({
    type: z.enum(["Walk", "Meal", "Exercise", "Grooming"]),
    date: z.string().min(1),
    feedingTime: z.string().optional(),
    durationMinutes: z.string().optional(),
    notes: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.type === "Walk" || data.type === "Exercise") {
      const n = parseInt((data.durationMinutes ?? "").trim(), 10);
      if (!Number.isFinite(n) || n < 1) {
        ctx.addIssue({
          code: "custom",
          message: "activityValidationDuration",
          path: ["durationMinutes"],
        });
      }
    }
    if (data.type === "Meal") {
      const ft = (data.feedingTime ?? "").trim();
      if (!feedingTimeRe.test(ft)) {
        ctx.addIssue({
          code: "custom",
          message: "activityValidationFeedingTime",
          path: ["feedingTime"],
        });
      }
    }
  });

export type AddActivityFormValues = z.infer<typeof addActivitySchema>;

function errMsg(msg: string | undefined, t: (k: TranslationKey) => string): string {
  if (!msg) return "";
  return t(msg as TranslationKey);
}

interface AddActivityModalProps {
  visible: boolean;
  onClose: () => void;
  petId: string;
  initialType: CreateableActivityType;
  onCreated?: () => void;
}

export function AddActivityModal({
  visible,
  onClose,
  petId,
  initialType,
  onCreated,
}: AddActivityModalProps) {
  const { t, isRTL } = useTranslation();
  const { colors } = useTheme();
  const { behavior: keyboardAvoidBehavior } = useKeyboardAvoidingState();
  const createActivity = useActivitiesStore((s) => s.createActivity);
  const [submitting, setSubmitting] = useState(false);

  const resolver = useMemo(() => zodResolver(addActivitySchema), []);

  const { control, handleSubmit, reset, formState: { errors } } = useForm<AddActivityFormValues>({
    resolver,
    defaultValues: {
      type: initialType,
      date: todayYmd(),
      feedingTime: nowHHMM(),
      durationMinutes: "",
      notes: "",
    },
  });

  useEffect(() => {
    if (visible) {
      reset({
        type: initialType,
        date: todayYmd(),
        feedingTime: nowHHMM(),
        durationMinutes: "",
        notes: "",
      });
    }
  }, [visible, initialType, reset]);

  const activityType = useWatch({ control, name: "type" });

  const onSubmit = handleSubmit(async (data) => {
    setSubmitting(true);
    const payload: CreateActivityDto = {
      type: data.type,
      date:
        data.type === "Meal"
          ? localYmdHhmmToIsoLike(data.date, (data.feedingTime ?? "").trim() || nowHHMM())
          : data.date,
      notes: data.notes?.trim() || undefined,
    };
    if (data.type === "Walk" || data.type === "Exercise") {
      payload.durationMinutes = parseInt(data.durationMinutes!.trim(), 10);
    }

    const created = await createActivity(petId, payload);
    setSubmitting(false);
    if (created) {
      onCreated?.();
      onClose();
    }
  });

  const typeLabel = (type: CreateableActivityType) => {
    switch (type) {
      case "Walk":
        return t("activityTypeWalk");
      case "Meal":
        return t("activityTypeMeal");
      case "Exercise":
        return t("activityTypeExercise");
      case "Grooming":
        return t("activityTypeGrooming");
      default:
        return type;
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/50">
        <Pressable className="absolute bottom-0 left-0 right-0 top-0" onPress={onClose} accessibilityRole="button" />
        <KeyboardAvoidingView behavior={keyboardAvoidBehavior}>
          <View
            className="min-h-[60%] max-h-[90%] rounded-t-3xl px-5 pt-4"
            style={{ backgroundColor: colors.surface }}
          >
          <View
            className="mb-3 flex-row items-center justify-between"
            style={{ flexDirection: rowDirectionForAppLayout(isRTL) }}
          >
            <Text className="flex-1 text-lg font-extrabold" style={{ color: colors.text, textAlign: isRTL ? "right" : "left" }}>
              {t("activityAddTitle")}
            </Text>
            <Pressable onPress={onClose} hitSlop={10} className="p-1">
              <Ionicons name="close" size={26} color={colors.textSecondary} />
            </Pressable>
          </View>

          <Text className="mb-3 text-sm font-semibold" style={{ color: colors.textSecondary, textAlign: isRTL ? "right" : "left" }}>
            {typeLabel((activityType ?? initialType) as CreateableActivityType)}
          </Text>

          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <Controller
              control={control}
              name="date"
              render={({ field: { value, onChange } }) => (
                <View className="mb-3">
                  <Text className="mb-1 text-xs font-bold uppercase tracking-wide" style={{ color: colors.textMuted, textAlign: isRTL ? "right" : "left" }}>
                    {t("activityDateLabel")}
                  </Text>
                  <DatePickerField
                    value={value}
                    onChange={onChange}
                    placeholder={t("activityDateLabel")}
                    isRTL={isRTL}
                    maximumDate={new Date()}
                  />
                  {errors.date ? (
                    <Text className="mt-1 text-xs" style={{ color: colors.danger }}>
                      {t("dateRequired")}
                    </Text>
                  ) : null}
                </View>
              )}
            />

            {activityType === "Meal" && (
              <Controller
                control={control}
                name="feedingTime"
                render={({ field: { value, onChange } }) => (
                  <View className="mb-3">
                    <Text
                      className="mb-1 text-xs font-bold uppercase tracking-wide"
                      style={{ color: colors.textMuted, textAlign: isRTL ? "right" : "left" }}
                    >
                      {t("activityFeedingTimeLabel")}
                    </Text>
                    <TimePickerField
                      value={value ?? nowHHMM()}
                      onChange={onChange}
                      placeholder={t("activityFeedingTimeLabel")}
                      isRTL={isRTL}
                    />
                    {errors.feedingTime ? (
                      <Text className="mt-1 text-xs" style={{ color: colors.danger }}>
                        {errMsg(errors.feedingTime.message, t)}
                      </Text>
                    ) : null}
                  </View>
                )}
              />
            )}

            {(activityType === "Walk" || activityType === "Exercise") && (
              <Controller
                control={control}
                name="durationMinutes"
                render={({ field: { value: v, onChange } }) => (
                  <View className="mb-3">
                    <Text
                      className="mb-1 text-xs font-bold uppercase tracking-wide"
                      style={{ color: colors.textMuted, textAlign: isRTL ? "right" : "left" }}
                    >
                      {t("activityDurationLabel")}
                    </Text>
                    <TextInput
                      value={v}
                      onChangeText={onChange}
                      keyboardType="number-pad"
                      placeholder={t("activityDurationPlaceholder")}
                      placeholderTextColor={colors.textMuted}
                      style={formInputStyle(isRTL, colors)}
                    />
                    {errors.durationMinutes ? (
                      <Text className="mt-1 text-xs" style={{ color: colors.danger }}>
                        {errMsg(errors.durationMinutes.message, t)}
                      </Text>
                    ) : null}
                  </View>
                )}
              />
            )}

            <Controller
              control={control}
              name="notes"
              render={({ field: { value, onChange } }) => (
                <View className="mb-4">
                  <Text className="mb-1 text-xs font-bold uppercase tracking-wide" style={{ color: colors.textMuted, textAlign: isRTL ? "right" : "left" }}>
                    {t("activityNotesLabel")}
                  </Text>
                  <TextInput
                    value={value}
                    onChangeText={onChange}
                    placeholder={t("activityNotesPlaceholder")}
                    placeholderTextColor={colors.textMuted}
                    multiline
                    numberOfLines={4}
                    style={[formInputStyle(isRTL, colors), { minHeight: 96, textAlignVertical: "top" }]}
                  />
                </View>
              )}
            />
          </ScrollView>

          {/* Button row — pinned below the scroll area, always visible */}
          <View className="mt-3 flex-row gap-3 pb-8" style={{ flexDirection: rowDirectionForAppLayout(isRTL) }}>
            <Pressable
              onPress={onClose}
              className="flex-1 items-center rounded-xl py-3.5"
              style={{ backgroundColor: colors.surfaceSecondary }}
            >
              <Text className="font-semibold" style={{ color: colors.textSecondary }}>
                {t("cancel")}
              </Text>
            </Pressable>
            <Pressable
              onPress={onSubmit}
              disabled={submitting}
              className="flex-1 items-center rounded-xl py-3.5"
              style={{ backgroundColor: submitting ? colors.primaryLight : colors.primary, opacity: submitting ? 0.7 : 1 }}
            >
              {submitting ? (
                <ActivityIndicator color={colors.primaryText} />
              ) : (
                <Text className="font-bold" style={{ color: colors.primaryText }}>
                  {t("save")}
                </Text>
              )}
            </Pressable>
          </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}
