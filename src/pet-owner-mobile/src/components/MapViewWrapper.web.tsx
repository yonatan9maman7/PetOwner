import React from "react";
import { View, Text } from "react-native";

export const MapViewWrapper = React.forwardRef<View, any>(
  ({ style, fallbackLabel, children, ...rest }, ref) => {
    return (
      <View
        ref={ref}
        style={[
          {
            flex: 1,
            backgroundColor: "#e8eff1",
            alignItems: "center",
            justifyContent: "center",
          },
          style,
        ]}
      >
        <Text style={{ color: "#74777f", fontSize: 14, fontWeight: "600" }}>
          {fallbackLabel ?? "Map (available on mobile)"}
        </Text>
      </View>
    );
  },
);

export function MarkerWrapper(_props: any) {
  return null;
}
