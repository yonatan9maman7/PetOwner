import { useEffect, useRef } from "react";
import { View, Animated } from "react-native";
import { useTheme } from "../../theme/ThemeContext";

interface ListSkeletonProps {
  rows?: number;
  /** "card" renders full-width cards; "row" renders compact list rows. */
  variant?: "card" | "row";
}

function ShimmerBlock({
  width,
  height,
  borderRadius = 8,
  style,
}: {
  width: number | string;
  height: number;
  borderRadius?: number;
  style?: object;
}) {
  const { colors } = useTheme();
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        {
          width: width as any,
          height,
          borderRadius,
          backgroundColor: colors.surfaceSecondary,
          opacity,
        },
        style,
      ]}
    />
  );
}

function CardSkeleton() {
  const { colors } = useTheme();
  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderRadius: 16,
        marginHorizontal: 16,
        marginTop: 12,
        padding: 16,
        gap: 12,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <ShimmerBlock width={42} height={42} borderRadius={21} />
        <View style={{ flex: 1, gap: 6 }}>
          <ShimmerBlock width="60%" height={14} />
          <ShimmerBlock width="30%" height={10} />
        </View>
      </View>
      <ShimmerBlock width="100%" height={14} />
      <ShimmerBlock width="85%" height={14} />
      <ShimmerBlock width="40%" height={14} />
    </View>
  );
}

function RowSkeleton() {
  const { colors } = useTheme();
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingHorizontal: 16,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: colors.borderLight,
      }}
    >
      <ShimmerBlock width={48} height={48} borderRadius={24} />
      <View style={{ flex: 1, gap: 8 }}>
        <ShimmerBlock width="55%" height={14} />
        <ShimmerBlock width="80%" height={12} />
      </View>
    </View>
  );
}

export function ListSkeleton({ rows = 5, variant = "card" }: ListSkeletonProps) {
  const Component = variant === "card" ? CardSkeleton : RowSkeleton;
  return (
    <View style={{ paddingTop: 4 }}>
      {Array.from({ length: rows }, (_, i) => (
        <Component key={i} />
      ))}
    </View>
  );
}
