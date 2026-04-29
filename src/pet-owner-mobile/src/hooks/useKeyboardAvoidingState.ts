import { useEffect, useState } from "react";
import { Keyboard, Platform, type KeyboardAvoidingViewProps } from "react-native";

/**
 * Android (Expo edge-to-edge + `softwareKeyboardLayoutMode: "resize"`): use
 * `KeyboardAvoidingView` `behavior="height"` only while the IME is visible so
 * inputs stay above the keyboard without a persistent bottom gap when it hides.
 * iOS keeps `padding` (reliable with the keyboard-will-* events).
 */
export function useKeyboardAvoidingState(): {
  behavior: KeyboardAvoidingViewProps["behavior"];
  keyboardVisible: boolean;
} {
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    const showEvt = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvt = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const show = Keyboard.addListener(showEvt, () => setKeyboardVisible(true));
    const hide = Keyboard.addListener(hideEvt, () => setKeyboardVisible(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  const behavior: KeyboardAvoidingViewProps["behavior"] =
    Platform.OS === "ios" ? "padding" : keyboardVisible ? "height" : undefined;

  return { behavior, keyboardVisible };
}
