import { isIsraeliMobileValid } from "../features/provider-onboarding/phoneUtils";

/**
 * Israeli mobile (05…, 10 digits). Accepts +972… input via normalization.
 * Matches API PhoneValidator (0 + 05x + 7 digits).
 */
export function isValidPhoneFormat(phone: string): boolean {
  return isIsraeliMobileValid(phone);
}
