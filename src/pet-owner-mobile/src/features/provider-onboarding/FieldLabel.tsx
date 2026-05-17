import { Text } from "react-native";
import { useTheme } from "../../theme/ThemeContext";

type Variant = "section" | "small";

export function FieldLabel({
  text,
  isRTL,
  required,
  isRequired,
  variant = "section",
}: {
  text: string;
  isRTL: boolean;
  /** @deprecated Prefer `isRequired` */
  required?: boolean;
  isRequired?: boolean;
  variant?: Variant;
}) {
  const { colors } = useTheme();
  const isSmall = variant === "small";
  const showRequired = isRequired ?? required;
  return (
    <Text
      style={{
        fontSize: isSmall ? 11 : 14,
        fontWeight: isSmall ? "600" : "700",
        color: isSmall ? colors.textSecondary : colors.text,
        marginBottom: isSmall ? 3 : 8,
        textAlign: isRTL ? "right" : "left",
        writingDirection: isRTL ? "rtl" : "ltr",
      }}
    >
      {text}
      {showRequired ? <Text style={{ color: colors.danger }}> *</Text> : null}
    </Text>
  );
}
