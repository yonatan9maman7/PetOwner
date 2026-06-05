import { useState } from "react";
import { View, Text, Image } from "react-native";
import type { useTheme } from "../../theme/ThemeContext";

type ThemeColors = ReturnType<typeof useTheme>["colors"];

export function ConversationAvatar({
  uri,
  initials,
  colors,
  size = 48,
}: {
  uri?: string;
  initials: string;
  colors: ThemeColors;
  size?: number;
}) {
  const [failed, setFailed] = useState(false);
  const radius = size / 2;
  const fontSize = size * 0.35;

  if (uri && !failed) {
    return (
      <Image
        source={{ uri }}
        style={{
          width: size,
          height: size,
          borderRadius: radius,
          backgroundColor: colors.primaryLight,
        }}
        resizeMode="cover"
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: colors.primary,
      }}
    >
      <Text style={{ color: colors.textInverse, fontWeight: "bold", fontSize }}>
        {initials}
      </Text>
    </View>
  );
}
