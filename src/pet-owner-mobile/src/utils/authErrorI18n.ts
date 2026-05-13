import type { NormalizedApiError } from "./apiUtils";
import type { TranslationKey } from "../i18n/index";

const CODE_TO_KEY: Record<string, TranslationKey> = {
  EMAIL_ALREADY_REGISTERED: "errorEmailExists",
  PHONE_ALREADY_REGISTERED: "errorPhoneExists",
  PHONE_TAKEN: "errorPhoneExists",
  INVALID_CREDENTIALS: "errorInvalidCredentials",
  ACCOUNT_SUSPENDED: "errorAccountSuspended",
  USER_NOT_FOUND: "errorUserNotFound",
  PASSWORD_ACCOUNT_EXISTS: "socialLoginEmailExists",
  INVALID_SOCIAL_TOKEN: "socialLoginFailed",
  UNSUPPORTED_AUTH_PROVIDER: "errorGeneric",
};

/** Legacy / human messages before `code` was added on the API. */
const MESSAGE_SUBSTRINGS: { needle: string; key: TranslationKey }[] = [
  { needle: "email already exists", key: "errorEmailExists" },
  { needle: "This email address is already registered", key: "errorEmailExists" },
  { needle: "This phone number is already registered", key: "errorPhoneExists" },
  { needle: "phone number is already registered", key: "errorPhoneExists" },
  { needle: "Invalid email or password", key: "errorInvalidCredentials" },
  { needle: "account has been suspended", key: "errorAccountSuspended" },
  { needle: "No account found with this email", key: "errorUserNotFound" },
  { needle: "Please log in with your password", key: "socialLoginEmailExists" },
  { needle: "invalid social token", key: "socialLoginFailed" },
  { needle: "unsupported provider", key: "errorGeneric" },
];

/**
 * Maps normalized API errors from auth endpoints to a {@link TranslationKey}.
 * Safe to use outside React (no hooks).
 */
export function mapAuthApiErrorToTranslationKey(
  normalized: NormalizedApiError,
): TranslationKey {
  if (normalized.isConnectivityError) return "apiNetworkTimeout";
  if (normalized.isServerError) return "apiErrorServer";

  const code = normalized.code?.trim().toUpperCase();
  if (code && CODE_TO_KEY[code]) return CODE_TO_KEY[code];

  const lower = normalized.message.trim().toLowerCase();
  for (const { needle, key } of MESSAGE_SUBSTRINGS) {
    if (lower.includes(needle.toLowerCase())) return key;
  }

  return "errorGeneric";
}
