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
  const { isRTL } = useTranslation();
  const insets = useSafeAreaInsets();
  const rowDir = rowDirectionForAppLayout(isRTL);
  const textAlign = isRTL ? "right" : "left";

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

  if (Platform.OS === "ios") return null;
  if (!pending) return null;

  const { title, message, labels } = pending.options;

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
          style={[styles.sheet, { backgroundColor: colors.surface, paddingBottom: Math.max(insets.bottom, 16) }]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={[styles.handle, { backgroundColor: colors.border }]} />

          <Text style={[styles.title, { color: colors.text, textAlign }]}>{title}</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary, textAlign }]}>{message}</Text>

          <Pressable
            onPress={onCamera}
            style={({ pressed }) => [
              styles.optionRow,
              { flexDirection: rowDir, backgroundColor: pressed ? colors.surfaceSecondary : "transparent" },
            ]}
            android_ripple={{ color: colors.surfaceSecondary }}
          >
            <View style={[styles.iconWrap, { backgroundColor: colors.primaryLight }]}>
              <Ionicons name="camera-outline" size={22} color={colors.primary} />
            </View>
            <Text style={[styles.optionLabel, { color: colors.text, textAlign }]}>{labels.camera}</Text>
          </Pressable>

          <View style={[styles.divider, { backgroundColor: colors.borderLight }]} />

          <Pressable
            onPress={onGallery}
            style={({ pressed }) => [
              styles.optionRow,
              { flexDirection: rowDir, backgroundColor: pressed ? colors.surfaceSecondary : "transparent" },
            ]}
            android_ripple={{ color: colors.surfaceSecondary }}
          >
            <View style={[styles.iconWrap, { backgroundColor: colors.primaryLight }]}>
              <Ionicons name="images-outline" size={22} color={colors.primary} />
            </View>
            <Text style={[styles.optionLabel, { color: colors.text, textAlign }]}>{labels.gallery}</Text>
          </Pressable>

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
            <Text style={[styles.cancelLabel, { color: colors.textSecondary }]}>{labels.cancel}</Text>
          </Pressable>
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
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 8,
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
    marginBottom: 8,
  },
  optionRow: {
    alignItems: "center",
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderRadius: 12,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  optionLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 2,
  },
  cancelBtn: {
    marginTop: 12,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelLabel: {
    fontSize: 16,
    fontWeight: "600",
  },
});
