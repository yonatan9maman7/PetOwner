/** Support contact — override via EXPO_PUBLIC_SUPPORT_EMAIL / EXPO_PUBLIC_SUPPORT_PHONE */
const envEmail = process.env.EXPO_PUBLIC_SUPPORT_EMAIL?.trim();
export const SUPPORT_EMAIL =
  envEmail && envEmail.length > 0 ? envEmail : "support@petowner.app";

const envPhone = process.env.EXPO_PUBLIC_SUPPORT_PHONE?.trim();
export const SUPPORT_PHONE: string | undefined =
  envPhone && envPhone.length > 0 ? envPhone : undefined;
