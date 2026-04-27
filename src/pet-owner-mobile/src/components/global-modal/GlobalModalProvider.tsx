import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { I18nManager, Modal, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuthStore } from "../../store/authStore";
import { useTheme } from "../../theme/ThemeContext";
import { registerGlobalModalApi } from "./modalService";
import type { GlobalModalApi, ModalButton, ShowAlertOptions, ShowConfirmOptions, ShowModalOptions } from "./types";

interface QueueItem extends ShowModalOptions {
  id: number;
}

const GlobalModalContext = createContext<GlobalModalApi | null>(null);

export function GlobalModalProvider({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  const language = useAuthStore((s) => s.language);
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
      const buttons = I18nManager.isRTL ? [confirmBtn, cancelBtn] : [cancelBtn, confirmBtn];
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
    async (button: ModalButton) => {
      try {
        await button.onPress?.();
      } finally {
        if (button.autoClose !== false) {
          hideModal();
        }
      }
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

  const isRTL = I18nManager.isRTL;
  const isVerticalButtons = (activeModal?.buttons?.length ?? 0) > 2;

  return (
    <GlobalModalContext.Provider value={api}>
      {children}
      <Modal
        transparent
        visible={Boolean(activeModal)}
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => {
          if (activeModal?.dismissible) {
            hideModal();
          }
        }}
      >
        <View className="flex-1 items-center justify-center bg-black/60" style={{ paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16, paddingHorizontal: 16 }}>
          <View
            className="w-[86%] rounded-2xl p-6"
            style={{
              maxWidth: 420,
              backgroundColor: colors.surface,
              shadowColor: colors.shadow,
              shadowOffset: { width: 0, height: 10 },
              shadowOpacity: isDark ? 0.45 : 0.18,
              shadowRadius: 20,
              elevation: 12,
            }}
          >
            {activeModal?.title ? (
              <Text
                className="mb-3 text-right text-xl font-bold"
                style={{ color: colors.text, writingDirection: isRTL ? "rtl" : "ltr" }}
              >
                {activeModal.title}
              </Text>
            ) : null}

            {activeModal?.message ? (
              <Text
                className="mb-6 text-right text-base"
                style={{ color: colors.textSecondary, writingDirection: isRTL ? "rtl" : "ltr" }}
              >
                {activeModal.message}
              </Text>
            ) : (
              <View className="mb-6" />
            )}

            <View
              className={isVerticalButtons ? "gap-2" : "gap-3"}
              style={{ flexDirection: isVerticalButtons ? "column" : "row" }}
            >
              {(activeModal?.buttons ?? []).map((button, index) => {
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
                    key={`${activeModal?.id}-${index}-${button.text}`}
                    className="items-center justify-center rounded-xl px-4 py-3"
                    style={{
                      flex: isVerticalButtons ? undefined : 1,
                      backgroundColor: bg,
                      borderWidth: isSecondary ? 1 : 0,
                      borderColor: isSecondary ? colors.border : "transparent",
                    }}
                    onPress={() => {
                      void handlePressButton(button);
                    }}
                  >
                    <Text
                      className="text-base font-semibold text-right"
                      style={{
                        color: fg,
                        writingDirection: isRTL ? "rtl" : "ltr",
                      }}
                    >
                      {button.text}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>
      </Modal>
    </GlobalModalContext.Provider>
  );
}

export function useGlobalModal() {
  const ctx = useContext(GlobalModalContext);
  if (!ctx) {
    throw new Error("useGlobalModal must be used within GlobalModalProvider");
  }
  return ctx;
}
