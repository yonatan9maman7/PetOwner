import { View, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";

const STAR_COLOR = "#f59e0b";

interface StarRatingInputProps {
  value: number;
  onChange: (rating: number) => void;
  /** Star icon size (default 36). */
  size?: number;
  /** Accessibility label for the group (e.g. rating label). */
  accessibilityLabel?: string;
  isRTL?: boolean;
}

export function StarRatingInput({
  value,
  onChange,
  size = 36,
  accessibilityLabel,
  isRTL,
}: StarRatingInputProps) {
  return (
    <View
      className="flex-row items-center justify-center gap-1"
      style={{ flexDirection: isRTL ? "row-reverse" : "row" }}
      accessibilityRole="adjustable"
      accessibilityLabel={accessibilityLabel}
    >
      {[1, 2, 3, 4, 5].map((star) => (
        <Pressable
          key={star}
          onPress={() => onChange(star)}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={`${star}`}
          accessibilityState={{ selected: value >= star }}
        >
          <Ionicons
            name={value >= star ? "star" : "star-outline"}
            size={size}
            color={STAR_COLOR}
            style={{ opacity: value >= star ? 1 : 0.45 }}
          />
        </Pressable>
      ))}
    </View>
  );
}
