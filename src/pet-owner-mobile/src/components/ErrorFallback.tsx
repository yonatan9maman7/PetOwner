import { View, Text, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import type { FallbackProps } from "react-error-boundary";

const COLORS = {
  bg: "#f4fafd",
  surface: "#ffffff",
  text: "#001a5a",
  textSecondary: "#64748b",
  primary: "#2563eb",
  primaryText: "#ffffff",
  dangerLight: "#fef2f2",
  danger: "#dc2626",
};

export function ErrorFallback({ error, resetErrorBoundary }: FallbackProps) {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: 32,
        }}
      >
        <View
          style={{
            width: 96,
            height: 96,
            borderRadius: 28,
            backgroundColor: COLORS.dangerLight,
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 28,
          }}
        >
          <Ionicons name="warning-outline" size={48} color={COLORS.danger} />
        </View>

        <Text
          style={{
            fontSize: 22,
            fontWeight: "800",
            color: COLORS.text,
            textAlign: "center",
            marginBottom: 10,
          }}
        >
          Something went wrong
        </Text>

        <Text
          style={{
            fontSize: 15,
            color: COLORS.textSecondary,
            textAlign: "center",
            lineHeight: 22,
            marginBottom: 8,
          }}
        >
          An unexpected error occurred. Please try again.
        </Text>

        {__DEV__ && error ? (
          <View
            style={{
              backgroundColor: COLORS.dangerLight,
              borderRadius: 12,
              padding: 12,
              marginTop: 8,
              marginBottom: 16,
              width: "100%",
            }}
          >
            <Text
              style={{
                fontSize: 12,
                color: COLORS.danger,
                fontFamily: "monospace",
              }}
              numberOfLines={6}
            >
              {error instanceof Error ? error.message : String(error)}
            </Text>
          </View>
        ) : null}

        <Pressable
          onPress={resetErrorBoundary}
          style={{
            backgroundColor: COLORS.primary,
            paddingHorizontal: 32,
            paddingVertical: 14,
            borderRadius: 14,
            marginTop: 12,
            shadowColor: COLORS.primary,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 6,
          }}
        >
          <Text style={{ color: COLORS.primaryText, fontSize: 16, fontWeight: "700" }}>
            Try Again
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
