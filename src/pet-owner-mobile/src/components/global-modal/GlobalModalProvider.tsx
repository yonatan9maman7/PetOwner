import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  BackHandler,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "../../i18n";
import { useAuthStore } from "../../store/authStore";
import { useTheme } from "../../theme/ThemeContext";
import { registerGlobalModalApi } from "./modalService";
import type { GlobalModalApi, ModalButton, ShowAlertOptions, ShowConfirmOptions, ShowModalOptions } from "./types";

interface QueueItem extends ShowModalOptions {
  id: number;
}

const GlobalModalContext = createContext<GlobalModalApi | null>(null);

/** Defer `onPress` until after hide so overlay + navigation/auth updates don't race (e.g. logout). */
const MODAL_CLOSE_ACTION_DELAY_MS = 300;

export function GlobalModalProvider({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  const language = useAuthStore((s) => s.language);
  const { rtlText, rtlRow } = useTranslation();
  const defaultOkLabel = language === "he" ? "אישור" : "OK";
  const defaultCancelLabel = language === "he" ? "ביטול" : "Cancel";
  const { colors, isDark } = useTheme();
  const [activeModal, setActiveModal] = useState<QueueItem | null>(null);
  const queueRef = useRef<QueueItem[]>([]);
  const idRef = useRef(1);

  const showModal = useCallback(
    (options: ShowModalOptions) => {
      const normalizedButtons = (options.buttons?.length ? options.buttons : [{ text: defaultOkLabel }]).map(
        (button): ModalButton => ({
          role: "primary",
          autoClose: true,
          ...button,
        }),
      );

      const item: QueueItem = {
        id: idRef.current++,
        title: options.title != null ? String(options.title) : "",
        message: options.message != null ? String(options.message) : undefined,
        dismissible: options.dismissible ?? true,
        buttons: normalizedButtons,
      };

      setActiveModal((current) => {
        if (!current) return item;
        queueRef.current.push(item);
        return current;
      });
    },
    [defaultOkLabel],
  );

  const hideModal = useCallback(() => {
    setActiveModal(() => {
      const next = queueRef.current.shift() ?? null;
      return next;
    });
  }, []);

  const showAlert = useCallback(
    (title: string, message?: string, options?: ShowAlertOptions) => {
      showModal({
        title,
        message,
        dismissible: true,
        buttons: [
          {
            text: options?.buttonText ?? defaultOkLabel,
            role: "primary",
            onPress: options?.onDismiss,
          },
        ],
      });
    },
    [defaultOkLabel, showModal],
  );

  const showConfirm = useCallback(
    (
      title: string,
      message?: string,
      onConfirm?: () => void | Promise<void>,
      onCancel?: () => void | Promise<void>,
      options?: Omit<ShowConfirmOptions, "onConfirm" | "onCancel">,
    ) => {
      const cancelBtn: ModalButton = {
        text: options?.cancelText ?? defaultCancelLabel,
        role: "cancel",
        onPress: onCancel,
      };
      const confirmBtn: ModalButton = {
        text: options?.confirmText ?? defaultOkLabel,
        role: options?.destructive ? "destructive" : "primary",
        onPress: onConfirm,
      };
      const buttons = [cancelBtn, confirmBtn];
      showModal({
        title,
        message,
        dismissible: false,
        buttons,
      });
    },
    [defaultCancelLabel, defaultOkLabel, showModal],
  );

  const handlePressButton = useCallback(
    (button: ModalButton) => {
      const runAction = () => {
        void Promise.resolve(button.onPress?.()).catch((e) => {
          if (__DEV__) {
            console.warn("[GlobalModal] button onPress error", e);
          }
        });
      };

      if (button.autoClose !== false) {
        hideModal();
        setTimeout(runAction, MODAL_CLOSE_ACTION_DELAY_MS);
        return;
      }

      void Promise.resolve(button.onPress?.()).catch((e) => {
        if (__DEV__) {
          console.warn("[GlobalModal] button onPress error", e);
        }
      });
    },
    [hideModal],
  );

  const api = useMemo<GlobalModalApi>(
    () => ({
      showAlert,
      showConfirm,
      showModal,
      hideModal,
    }),
    [hideModal, showAlert, showConfirm, showModal],
  );

  useEffect(() => {
    registerGlobalModalApi(api);
    return () => registerGlobalModalApi(null);
  }, [api]);

  useEffect(() => {
    if (!activeModal) return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (activeModal.dismissible) {
        hideModal();
      }
      return true;
    });
    return () => sub.remove();
  }, [activeModal, hideModal]);

  const isVerticalButtons = (activeModal?.buttons?.length ?? 0) > 2;

  return (
    <GlobalModalContext.Provider value={api}>
      <>
        {children}
        {activeModal ? (
          <View
            pointerEvents="box-none"
            style={[StyleSheet.absoluteFillObject, styles.overlayHost]}
          >
            <Pressable
              style={[
                StyleSheet.absoluteFillObject,
                styles.backdrop,
                {
                  paddingTop: insets.top + 16,
                  paddingBottom: insets.bottom + 16,
                  paddingHorizontal: 16,
                },
              ]}
              onPress={() => {
                if (activeModal.dismissible) hideModal();
              }}
            >
              <Pressable
                style={[
                  styles.card,
                  {
                    maxWidth: 420,
                    backgroundColor: colors.surface,
                    shadowColor: colors.shadow,
                    shadowOpacity: isDark ? 0.45 : 0.18,
                  },
                ]}
                onPress={(e) => e.stopPropagation()}
              >
                {activeModal.title ? (
                  <Text
                    style={[
                      styles.title,
                      rtlText,
                      { color: colors.text },
                    ]}
                  >
                    {activeModal.title}
                  </Text>
                ) : null}

                {activeModal.message ? (
                  <Text
                    style={[
                      styles.message,
                      rtlText,
                      { color: colors.textSecondary },
                    ]}
                  >
                    {activeModal.message}
                  </Text>
                ) : (
                  <View style={styles.messageSpacer} />
                )}

                <View
                  style={[
                    isVerticalButtons ? styles.buttonCol : styles.buttonRow,
                    !isVerticalButtons ? rtlRow : null,
                  ]}
                >
                  {(activeModal.buttons ?? []).map((button, index) => {
                    const role = button.role ?? "primary";
                    const isPrimary = role === "primary";
                    const isDestructive = role === "destructive";
                    const isSecondary = role === "secondary" || role === "cancel";

                    const destructiveAsFilled = isDestructive && !isVerticalButtons;
                    const bg = isPrimary
                      ? colors.brand
                      : isDestructive
                        ? destructiveAsFilled
                          ? colors.danger
                          : colors.dangerLight
                        : isSecondary
                          ? colors.surfaceSecondary
                          : colors.primaryLight;
                    const fg = isPrimary || destructiveAsFilled
                      ? colors.primaryText
                      : isDestructive
                        ? colors.danger
                        : colors.text;

                    return (
                      <Pressable
                        key={`${activeModal.id}-${index}-${button.text}`}
                        style={[
                          styles.button,
                          {
                            flex: isVerticalButtons ? undefined : 1,
                            backgroundColor: bg,
                            borderWidth: isSecondary ? 1 : 0,
                            borderColor: isSecondary ? colors.border : "transparent",
                          },
                        ]}
                        onPress={() => {
                          void handlePressButton(button);
                        }}
                      >
                        <Text
                          style={[
                            styles.buttonLabel,
                            rtlText,
                            { color: fg, textAlign: "center" },
                          ]}
                        >
                          {button.text}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </Pressable>
            </Pressable>
          </View>
        ) : null}
      </>
    </GlobalModalContext.Provider>
  );
}

const styles = StyleSheet.create({
  overlayHost: {
    zIndex: 100000,
    elevation: 100000,
  },
  backdrop: {
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  card: {
    width: "86%",
    borderRadius: 16,
    padding: 24,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 20,
    elevation: 12,
  },
  title: {
    width: "100%",
    marginBottom: 12,
    fontSize: 20,
    fontWeight: "700",
  },
  message: {
    width: "100%",
    marginBottom: 24,
    fontSize: 16,
  },
  messageSpacer: {
    marginBottom: 24,
  },
  buttonRow: {
    gap: 12,
  },
  buttonCol: {
    flexDirection: "column",
    gap: 8,
  },
  button: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  buttonLabel: {
    fontSize: 16,
    fontWeight: "600",
  },
});

export function useGlobalModal() {
  const ctx = useContext(GlobalModalContext);
  if (!ctx) {
    throw new Error("useGlobalModal must be used within GlobalModalProvider");
  }
  return ctx;
}
