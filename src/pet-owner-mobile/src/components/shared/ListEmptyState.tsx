import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../theme/ThemeContext";
import { useTranslation } from "../../i18n";

interface ListEmptyStateProps {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  message?: string;
}

export function ListEmptyState({
  icon = "document-text-outline",
  title,
  message,
}: ListEmptyStateProps) {
  const { colors } = useTheme();
  const { rtlStyle } = useTranslation();

  return (
    <View
      style={{
        alignItems: "center",
        paddingTop: 64,
        paddingHorizontal: 32,
        paddingBottom: 32,
      }}
    >
      <View
        style={{
          width: 88,
          height: 88,
          borderRadius: 24,
          backgroundColor: colors.surfaceSecondary,
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 20,
        }}
      >
        <Ionicons name={icon} size={40} color={colors.textMuted} />
      </View>
      <Text
        style={[
          rtlStyle,
          {
            fontSize: 18,
            fontWeight: "700",
            color: colors.text,
            textAlign: "center",
            marginBottom: 6,
          },
        ]}
      >
        {title}
      </Text>
      {message ? (
        <Text
          style={[
            rtlStyle,
            {
              fontSize: 14,
              color: colors.textMuted,
              textAlign: "center",
              lineHeight: 20,
            },
          ]}
        >
          {message}
        </Text>
      ) : null}
    </View>
  );
}
