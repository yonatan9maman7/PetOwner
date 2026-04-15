import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../theme/ThemeContext";
import { useTranslation } from "../../i18n";

interface InlineErrorProps {
  message?: string;
  onRetry?: () => void;
}

export function InlineError({ message, onRetry }: InlineErrorProps) {
  const { colors } = useTheme();
  const { t, rtlRow, rtlText } = useTranslation();

  const displayMessage = message || t("genericError");

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        backgroundColor: colors.dangerLight,
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 10,
        marginHorizontal: 16,
        marginVertical: 8,
        ...(rtlRow as object),
      }}
    >
      <Ionicons name="alert-circle" size={20} color={colors.danger} />
      <Text
        style={[
          rtlText,
          {
            flex: 1,
            fontSize: 13,
            color: colors.danger,
            lineHeight: 18,
          },
        ]}
      >
        {displayMessage}
      </Text>
      {onRetry && (
        <Pressable
          onPress={onRetry}
          hitSlop={8}
          style={{
            backgroundColor: colors.danger,
            borderRadius: 8,
            paddingHorizontal: 12,
            paddingVertical: 6,
          }}
        >
          <Text style={{ color: colors.textInverse, fontSize: 12, fontWeight: "700" }}>
            {t("retry")}
          </Text>
        </Pressable>
      )}
    </View>
  );
}
