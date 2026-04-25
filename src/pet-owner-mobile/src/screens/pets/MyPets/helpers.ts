import type { ThemeColors } from "../../../theme/ThemeContext";

export function formInputStyle(isRTL: boolean, colors: ThemeColors) {
  return {
    backgroundColor: colors.surfaceTertiary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    color: colors.text,
    textAlign: (isRTL ? "right" : "left") as "right" | "left",
    writingDirection: (isRTL ? "rtl" : "ltr") as "rtl" | "ltr",
  };
}
