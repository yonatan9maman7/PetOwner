import { Alert } from "react-native";
import * as ImagePicker from "expo-image-picker";

type ImagePickerSourceLabels = {
  camera: string;
  gallery: string;
  cancel: string;
};

type PermissionDeniedAlert = {
  title: string;
  message: string;
};

type PickImageWithSourceOptions = {
  labels: ImagePickerSourceLabels;
  pickerOptions?: ImagePicker.ImagePickerOptions;
  title?: string;
  message?: string;
  permissionDeniedAlert?: PermissionDeniedAlert;
};

async function pickFromCamera(
  pickerOptions: ImagePicker.ImagePickerOptions,
  permissionDeniedAlert?: PermissionDeniedAlert,
): Promise<string | null> {
  const { status } = await ImagePicker.requestCameraPermissionsAsync();
  if (status !== "granted") {
    if (permissionDeniedAlert) {
      Alert.alert(permissionDeniedAlert.title, permissionDeniedAlert.message);
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
      Alert.alert(permissionDeniedAlert.title, permissionDeniedAlert.message);
    }
    return null;
  }
  const result = await ImagePicker.launchImageLibraryAsync(pickerOptions);
  return result.canceled || !result.assets?.[0]?.uri ? null : result.assets[0].uri;
}

export function pickImageWithSource(options: PickImageWithSourceOptions): Promise<string | null> {
  const {
    labels,
    pickerOptions = {},
    title,
    message,
    permissionDeniedAlert,
  } = options;

  return new Promise((resolve) => {
    let resolved = false;
    const resolveOnce = (value: string | null) => {
      if (resolved) return;
      resolved = true;
      resolve(value);
    };

    Alert.alert(
      title,
      message,
      [
        {
          text: labels.camera,
          onPress: () => {
            void pickFromCamera(pickerOptions, permissionDeniedAlert).then(resolveOnce);
          },
        },
        {
          text: labels.gallery,
          onPress: () => {
            void pickFromGallery(pickerOptions, permissionDeniedAlert).then(resolveOnce);
          },
        },
        {
          text: labels.cancel,
          style: "cancel",
          onPress: () => resolveOnce(null),
        },
      ],
      {
        cancelable: true,
        onDismiss: () => resolveOnce(null),
      },
    );
  });
}
