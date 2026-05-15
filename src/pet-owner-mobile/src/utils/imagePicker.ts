import { ActionSheetIOS, Platform } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { translate } from "../i18n";
import { showGlobalAlert } from "../components/global-modal";

export type ImagePickerSourceLabels = {
  camera: string;
  gallery: string;
  cancel: string;
  /** Shown when `allowRemove` is true; defaults to `translate("removePhoto")`. */
  remove?: string;
};

type PermissionDeniedAlert = {
  title: string;
  message: string;
};

export type PickImageWithSourceOptions = {
  labels: ImagePickerSourceLabels;
  pickerOptions?: ImagePicker.ImagePickerOptions;
  title?: string;
  message?: string;
  permissionDeniedAlert?: PermissionDeniedAlert;
  /** When true, show "remove" before cancel; `onRemove` runs then promise resolves with `null`. */
  allowRemove?: boolean;
  onRemove?: () => void;
};

export type ResolvedPickImageWithSourceOptions = PickImageWithSourceOptions & {
  title: string;
  message: string;
};

type PendingSheet = {
  options: ResolvedPickImageWithSourceOptions;
  resolve: (uri: string | null) => void;
};

const sheetListeners = new Set<() => void>();
let pendingSheet: PendingSheet | null = null;

/** Stable for `useSyncExternalStore`: same reference until store changes; then replaced. */
let sheetSnapshot = { version: 0, pending: null as PendingSheet | null };

function bumpSheet() {
  sheetSnapshot = {
    version: sheetSnapshot.version + 1,
    pending: pendingSheet,
  };
  sheetListeners.forEach((cb) => cb());
}

export function subscribeImageSourceSheet(cb: () => void) {
  sheetListeners.add(cb);
  return () => sheetListeners.delete(cb);
}

export function getImageSourceSheetSnapshot() {
  return sheetSnapshot;
}

/** Clears the pending sheet and returns it so the caller can resolve after async work. */
export function detachPendingImageSource(): PendingSheet | null {
  const p = pendingSheet;
  pendingSheet = null;
  bumpSheet();
  return p;
}

function resolvePickImageOptions(
  raw: PickImageWithSourceOptions,
): ResolvedPickImageWithSourceOptions {
  return {
    ...raw,
    title: raw.title ?? translate("imagePickerSheetTitle"),
    message: raw.message ?? translate("imagePickerSheetSubtitle"),
  };
}

async function pickFromCamera(
  pickerOptions: ImagePicker.ImagePickerOptions,
  permissionDeniedAlert?: PermissionDeniedAlert,
): Promise<string | null> {
  const { status } = await ImagePicker.requestCameraPermissionsAsync();
  if (status !== "granted") {
    if (permissionDeniedAlert) {
      showGlobalAlert(permissionDeniedAlert.title, permissionDeniedAlert.message);
    }
    return null;
  }
  const result = await ImagePicker.launchCameraAsync(pickerOptions);
  return result.canceled || !result.assets?.[0]?.uri ? null : result.assets[0].uri;
}

async function pickFromGallery(
  pickerOptions: ImagePicker.ImagePickerOptions,
  permissionDeniedAlert?: PermissionDeniedAlert,
): Promise<string | null> {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== "granted") {
    if (permissionDeniedAlert) {
      showGlobalAlert(permissionDeniedAlert.title, permissionDeniedAlert.message);
    }
    return null;
  }
  const result = await ImagePicker.launchImageLibraryAsync(pickerOptions);
  return result.canceled || !result.assets?.[0]?.uri ? null : result.assets[0].uri;
}

/** Used by the Android / web bottom sheet host. */
export async function runResolvedPickFromCamera(
  options: ResolvedPickImageWithSourceOptions,
): Promise<string | null> {
  return pickFromCamera(options.pickerOptions ?? {}, options.permissionDeniedAlert);
}

/** Used by the Android / web bottom sheet host. */
export async function runResolvedPickFromGallery(
  options: ResolvedPickImageWithSourceOptions,
): Promise<string | null> {
  return pickFromGallery(options.pickerOptions ?? {}, options.permissionDeniedAlert);
}

/** Label for the optional remove row (sheet host + iOS). */
export function removeLabelFor(options: ResolvedPickImageWithSourceOptions): string {
  return options.labels.remove ?? translate("removePhoto");
}

function presentIosActionSheet(
  options: ResolvedPickImageWithSourceOptions,
): Promise<string | null> {
  return new Promise((resolve) => {
    const withRemove = Boolean(options.allowRemove);
    const sheetOptions = withRemove
      ? [
          options.labels.camera,
          options.labels.gallery,
          removeLabelFor(options),
          options.labels.cancel,
        ]
      : [options.labels.camera, options.labels.gallery, options.labels.cancel];
    const cancelButtonIndex = sheetOptions.length - 1;
    const removeButtonIndex = withRemove ? 2 : -1;

    ActionSheetIOS.showActionSheetWithOptions(
      {
        title: options.title,
        message: options.message,
        options: sheetOptions,
        cancelButtonIndex,
        ...(withRemove ? { destructiveButtonIndex: removeButtonIndex } : {}),
      },
      (buttonIndex) => {
        void (async () => {
          if (buttonIndex === undefined || buttonIndex === cancelButtonIndex) {
            resolve(null);
            return;
          }
          if (withRemove && buttonIndex === removeButtonIndex) {
            options.onRemove?.();
            resolve(null);
            return;
          }
          if (buttonIndex === 0) {
            resolve(
              await pickFromCamera(
                options.pickerOptions ?? {},
                options.permissionDeniedAlert,
              ),
            );
            return;
          }
          if (buttonIndex === 1) {
            resolve(
              await pickFromGallery(
                options.pickerOptions ?? {},
                options.permissionDeniedAlert,
              ),
            );
            return;
          }
          resolve(null);
        })();
      },
    );
  });
}

function queueNonIosSheet(
  options: ResolvedPickImageWithSourceOptions,
): Promise<string | null> {
  return new Promise((resolve) => {
    if (pendingSheet) {
      resolve(null);
      return;
    }
    pendingSheet = { options, resolve };
    bumpSheet();
  });
}

export function pickImageWithSource(
  raw: PickImageWithSourceOptions,
): Promise<string | null> {
  const options = resolvePickImageOptions(raw);
  if (Platform.OS === "ios") {
    return presentIosActionSheet(options);
  }
  return queueNonIosSheet(options);
}
