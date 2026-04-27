import type {
  GlobalModalApi,
  ShowAlertOptions,
  ShowConfirmOptions,
  ShowModalOptions,
} from "./types";

let modalApi: GlobalModalApi | null = null;

export function registerGlobalModalApi(api: GlobalModalApi | null) {
  modalApi = api;
}

function warnNotReady(caller: string) {
  if (__DEV__) {
    console.warn(`[global-modal] ${caller} called before provider initialization.`);
  }
}

export function showGlobalAlert(
  title: string,
  message?: string,
  options?: ShowAlertOptions,
) {
  if (!modalApi) return warnNotReady("showGlobalAlert");
  modalApi.showAlert(title, message, options);
}

export function showGlobalConfirm(
  title: string,
  message?: string,
  onConfirm?: () => void | Promise<void>,
  onCancel?: () => void | Promise<void>,
  options?: Omit<ShowConfirmOptions, "onConfirm" | "onCancel">,
) {
  if (!modalApi) return warnNotReady("showGlobalConfirm");
  modalApi.showConfirm(title, message, onConfirm, onCancel, options);
}

export function showGlobalModal(options: ShowModalOptions) {
  if (!modalApi) return warnNotReady("showGlobalModal");
  modalApi.showModal(options);
}

export function hideGlobalModal() {
  if (!modalApi) return warnNotReady("hideGlobalModal");
  modalApi.hideModal();
}
