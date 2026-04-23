import React from "react";
import { View, Text } from "react-native";
import MapView, { Marker, Circle } from "react-native-maps";

export const MapViewWrapper = React.forwardRef<MapView, any>(
  ({ style, fallbackLabel, children, ...rest }, ref) => {
    try {
      return (
        <MapView ref={ref} style={[{ flex: 1 }, style]} {...rest}>
          {children}
        </MapView>
      );
    } catch {
      return (
        <View
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
            {fallbackLabel ?? "Map loading..."}
          </Text>
        </View>
      );
    }
  },
);

/** Memoized so parent re-renders (search UI, etc.) do not always push new props into native Marker. */
export const MarkerWrapper = React.memo(function MarkerWrapper(props: any) {
  return <Marker {...props} />;
});

/** Memoized accuracy / radius circle — stable props prevent MapKit redraws on parent re-renders. */
export const CircleWrapper = React.memo(function CircleWrapper(props: any) {
  return <Circle {...props} />;
});
