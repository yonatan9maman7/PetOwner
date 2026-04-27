export type ModalButtonRole = "primary" | "secondary" | "destructive" | "cancel";

export interface ModalButton {
  text: string;
  role?: ModalButtonRole;
  onPress?: () => void | Promise<void>;
  autoClose?: boolean;
}

export interface ShowModalOptions {
  title: string;
  message?: string;
  buttons: ModalButton[];
  dismissible?: boolean;
}

export interface ShowAlertOptions {
  buttonText?: string;
  onDismiss?: () => void | Promise<void>;
}

export interface ShowConfirmOptions {
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void | Promise<void>;
  onCancel?: () => void | Promise<void>;
  destructive?: boolean;
}

export interface GlobalModalApi {
  showAlert: (title: string, message?: string, options?: ShowAlertOptions) => void;
  showConfirm: (
    title: string,
    message?: string,
    onConfirm?: () => void | Promise<void>,
    onCancel?: () => void | Promise<void>,
    options?: Omit<ShowConfirmOptions, "onConfirm" | "onCancel">,
  ) => void;
  showModal: (options: ShowModalOptions) => void;
  hideModal: () => void;
}
