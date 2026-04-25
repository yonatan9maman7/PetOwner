import { Text } from "react-native";
import { useTheme } from "../../theme/ThemeContext";

type Variant = "section" | "small";

export function FieldLabel({
  text,
  isRTL,
  required,
  variant = "section",
}: {
  text: string;
  isRTL: boolean;
  required?: boolean;
  variant?: Variant;
}) {
  const { colors } = useTheme();
  const isSmall = variant === "small";
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
      {required ? <Text style={{ color: colors.danger }}> *</Text> : null}
    </Text>
  );
}
