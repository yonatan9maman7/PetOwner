import { useEffect, useSyncExternalStore } from "react";
import {
  Keyboard,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import {
  detachPendingImageSource,
  getImageSourceSheetSnapshot,
  removeLabelFor,
  runResolvedPickFromCamera,
  runResolvedPickFromGallery,
  subscribeImageSourceSheet,
} from "../utils/imagePicker";
import { useTheme } from "../theme/ThemeContext";
import { useTranslation, rowDirectionForAppLayout } from "../i18n";

/**
 * Renders the image source bottom sheet on Android and web. iOS uses ActionSheetIOS inside
 * `pickImageWithSource` and does not need this host, but mounting it everywhere is harmless.
 */
export function ImageSourcePickerHost() {
  const { colors } = useTheme();
  const { isRTL, rtlText } = useTranslation();
  const insets = useSafeAreaInsets();
  const rowDir = rowDirectionForAppLayout(isRTL);

  const snap = useSyncExternalStore(
    subscribeImageSourceSheet,
    getImageSourceSheetSnapshot,
    () => ({ version: 0, pending: null }),
  );

  const pending = snap.pending;

  useEffect(() => {
    if (Platform.OS === "ios") return;
    if (pending) Keyboard.dismiss();
  }, [pending]);

  const onBackdrop = () => {
    const p = detachPendingImageSource();
    if (p) p.resolve(null);
  };

  const onCancel = () => {
    onBackdrop();
  };

  const onCamera = () => {
    const p = detachPendingImageSource();
    if (!p) return;
    void (async () => {
      const uri = await runResolvedPickFromCamera(p.options);
      p.resolve(uri);
    })();
  };

  const onGallery = () => {
    const p = detachPendingImageSource();
    if (!p) return;
    void (async () => {
      const uri = await runResolvedPickFromGallery(p.options);
      p.resolve(uri);
    })();
  };

  const onRemovePhoto = () => {
    const p = detachPendingImageSource();
    if (!p) return;
    p.options.onRemove?.();
    p.resolve(null);
  };

  if (Platform.OS === "ios") return null;
  if (!pending) return null;

  const { title, message, labels, allowRemove } = pending.options;

  const renderOption = (
    onPress: () => void,
    icon: keyof typeof Ionicons.glyphMap,
    label: string,
    iconBg: string,
    iconColor: string,
    labelColor?: string,
  ) => (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.optionBtn,
        { borderColor: colors.borderLight, backgroundColor: pressed ? colors.surfaceSecondary : colors.surface },
      ]}
      android_ripple={{ color: colors.surfaceSecondary }}
    >
      <View style={[styles.optionRow, { flexDirection: rowDir }]}>
        <View style={[styles.iconWrap, { backgroundColor: iconBg }]}>
          <Ionicons name={icon} size={22} color={iconColor} />
        </View>
        <Text
          style={[styles.optionLabel, rtlText, { color: labelColor ?? colors.text }]}
          numberOfLines={2}
        >
          {label}
        </Text>
        <Ionicons
          name={isRTL ? "chevron-back" : "chevron-forward"}
          size={20}
          color={colors.textMuted}
        />
      </View>
    </Pressable>
  );

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onBackdrop}
    >
      <Pressable style={[styles.backdrop, { backgroundColor: colors.overlay }]} onPress={onBackdrop}>
        <Pressable
          style={[
            styles.sheet,
            {
              backgroundColor: colors.surface,
              paddingBottom: Math.max(insets.bottom, 16),
            },
          ]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={styles.sheetInner}>
            <View style={[styles.handle, { backgroundColor: colors.border }]} />

            <Text style={[styles.title, rtlText, { color: colors.text }]}>{title}</Text>
            <Text style={[styles.subtitle, rtlText, { color: colors.textSecondary }]}>{message}</Text>

            <View style={styles.optionsBlock}>
              {renderOption(
                onCamera,
                "camera-outline",
                labels.camera,
                colors.primaryLight,
                colors.primary,
              )}
              {renderOption(
                onGallery,
                "images-outline",
                labels.gallery,
                colors.primaryLight,
                colors.primary,
              )}
              {allowRemove
                ? renderOption(
                    onRemovePhoto,
                    "trash-outline",
                    removeLabelFor(pending.options),
                    colors.dangerLight,
                    colors.danger,
                    colors.danger,
                  )
                : null}
            </View>

            <Pressable
              onPress={onCancel}
              style={({ pressed }) => [
                styles.cancelBtn,
                {
                  borderColor: colors.border,
                  backgroundColor: pressed ? colors.surfaceSecondary : colors.surfaceTertiary,
                },
              ]}
            >
              <Text style={[styles.cancelLabel, rtlText, { color: colors.textSecondary }]}>
                {labels.cancel}
              </Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: "flex-end",
  },
  sheet: {
    width: "100%",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  sheetInner: {
    width: "100%",
    alignSelf: "stretch",
  },
  handle: {
    alignSelf: "center",
    width: 36,
    height: 4,
    borderRadius: 2,
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  optionsBlock: {
    width: "100%",
    gap: 10,
  },
  optionBtn: {
    width: "100%",
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  optionRow: {
    alignItems: "center",
    alignSelf: "stretch",
    gap: 14,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  optionLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
  },
  cancelBtn: {
    marginTop: 16,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "stretch",
  },
  cancelLabel: {
    fontSize: 16,
    fontWeight: "600",
  },
});
