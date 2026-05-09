import { useEffect, useRef } from "react";
import { View, Animated, Easing } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../theme/ThemeContext";

interface Props {
  size?: number;
}

/**
 * Branded loading indicator: a rotating arc ring with a softly pulsing
 * paw icon inside. Uses only native-driver animations (zero JS overhead).
 */
export function PawLoadingSpinner({ size = 72 }: Props) {
  const { colors } = useTheme();
  const rotation = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0.85)).current;

  useEffect(() => {
    const spin = Animated.loop(
      Animated.timing(rotation, {
        toValue: 1,
        duration: 1100,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    const breathe = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1.08,
          duration: 700,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0.85,
          duration: 700,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    spin.start();
    breathe.start();
    return () => {
      spin.stop();
      breathe.stop();
    };
  }, [rotation, pulse]);

  const rotateDeg = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  const iconSize = Math.round(size * 0.42);
  const ringThickness = Math.max(3, Math.round(size * 0.055));
  const innerSize = size - ringThickness * 2;

  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      {/* Rotating arc ring */}
      <Animated.View
        style={{
          position: "absolute",
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: ringThickness,
          borderColor: "transparent",
          borderTopColor: colors.brand ?? colors.primary,
          borderRightColor: (colors.brand ?? colors.primary) + "55",
          transform: [{ rotate: rotateDeg }],
        }}
      />
      {/* Static background circle */}
      <View
        style={{
          width: innerSize,
          height: innerSize,
          borderRadius: innerSize / 2,
          backgroundColor: colors.surfaceSecondary,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {/* Pulsing paw */}
        <Animated.View style={{ transform: [{ scale: pulse }] }}>
          <Ionicons name="paw" size={iconSize} color={colors.brand ?? colors.primary} />
        </Animated.View>
      </View>
    </View>
  );
}
