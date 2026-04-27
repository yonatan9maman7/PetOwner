import type { AlertButton, AlertOptions } from "react-native";
import { showGlobalAlert, showGlobalConfirm, showGlobalModal } from "./modalService";

function toRole(button?: AlertButton): "primary" | "secondary" | "destructive" | "cancel" {
  if (button?.style === "cancel") return "cancel";
  if (button?.style === "destructive") return "destructive";
  return "primary";
}

function normalizeMessage(message?: string): string | undefined {
  if (message === undefined || message === null) return undefined;
  return String(message);
}

export function showGlobalAlertCompat(
  title: string,
  message?: string,
  buttons?: AlertButton[],
  options?: AlertOptions,
) {
  const resolvedTitle = title ?? "";
  const resolvedMessage = normalizeMessage(message);
  const resolvedButtons = buttons ?? [];

  if (resolvedButtons.length === 0) {
    showGlobalAlert(resolvedTitle, resolvedMessage);
    return;
  }

  if (resolvedButtons.length === 1) {
    const only = resolvedButtons[0];
    showGlobalAlert(resolvedTitle, resolvedMessage, {
      buttonText: only.text,
      onDismiss: only.onPress,
    });
    return;
  }

  if (resolvedButtons.length === 2) {
    const cancelButton = resolvedButtons.find((b) => b.style === "cancel");
    const confirmButton = resolvedButtons.find((b) => b !== cancelButton) ?? resolvedButtons[1];
    if (cancelButton && confirmButton) {
      showGlobalConfirm(
        resolvedTitle,
        resolvedMessage,
        confirmButton.onPress,
        cancelButton.onPress,
        {
          confirmText: confirmButton.text,
          cancelText: cancelButton.text,
          destructive: confirmButton.style === "destructive",
        },
      );
      return;
    }
  }

  showGlobalModal({
    title: resolvedTitle,
    message: resolvedMessage,
    dismissible: options?.cancelable ?? true,
    buttons: resolvedButtons.map((button) => ({
      text: button.text ?? "",
      role: toRole(button),
      onPress: button.onPress,
    })),
  });
}
