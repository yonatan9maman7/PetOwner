import { Text, type StyleProp, type TextStyle } from "react-native";
import { useTheme } from "../theme/ThemeContext";

type Variant = "default" | "modal";

export function FormFieldLabel({
  text,
  isRTL,
  isRequired,
  variant = "default",
  style,
}: {
  text: string;
  isRTL: boolean;
  isRequired?: boolean;
  variant?: Variant;
  style?: StyleProp<TextStyle>;
}) {
  const { colors } = useTheme();
  const isModal = variant === "modal";
  return (
    <Text
      style={[
        {
          fontSize: isModal ? 13 : 14,
          fontWeight: isModal ? "800" : "700",
          color: isModal ? colors.textSecondary : colors.text,
          marginTop: isModal ? 12 : 18,
          marginBottom: 8,
          textAlign: isRTL ? "right" : "left",
          writingDirection: isRTL ? "rtl" : "ltr",
        },
        style,
      ]}
    >
      {text}
      {isRequired ? <Text style={{ color: colors.danger }}> *</Text> : null}
    </Text>
  );
}
