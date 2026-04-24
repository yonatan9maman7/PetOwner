import { useEffect, useRef } from "react";
import { View, Text, Image, Pressable, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  interpolate,
} from "react-native-reanimated";
import { rowDirectionForAppLayout, useTranslation } from "../../../../i18n";
import { useTheme } from "../../../../theme/ThemeContext";
import type { PetDto } from "../../../../types/api";
import { getSpeciesEmoji } from "../constants";

const AVATAR_SIZE = 56;
const RING_PADDING = 3;

interface PetAvatarSwitcherProps {
  pets: PetDto[];
  activeIndex: number;
  onSelect: (index: number) => void;
  onAddPress: () => void;
}

function ActiveRing({ color }: { color: string }) {
  const glow = useSharedValue(0);

  useEffect(() => {
    glow.value = withRepeat(
      withSequence(withTiming(1, { duration: 900 }), withTiming(0, { duration: 900 })),
      -1,
      false,
    );
  }, [glow]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: interpolate(glow.value, [0, 1], [0.7, 1]),
    transform: [{ scale: interpolate(glow.value, [0, 1], [1, 1.06]) }],
  }));

  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          width: AVATAR_SIZE + RING_PADDING * 2 + 4,
          height: AVATAR_SIZE + RING_PADDING * 2 + 4,
          borderRadius: (AVATAR_SIZE + RING_PADDING * 2 + 4) / 2,
          borderWidth: 2.5,
          borderColor: color,
          top: -(RING_PADDING + 2),
          left: -(RING_PADDING + 2),
        },
        animStyle,
      ]}
    />
  );
}

function PetAvatar({
  pet,
  isActive,
  activeColor,
  onPress,
}: {
  pet: PetDto;
  isActive: boolean;
  activeColor: string;
  onPress: () => void;
}) {
  const { colors } = useTheme();

  return (
    <Pressable onPress={onPress} style={{ alignItems: "center", gap: 5 }}>
      <View style={{ position: "relative" }}>
        {isActive && <ActiveRing color={activeColor} />}
        <View
          style={{
            width: AVATAR_SIZE,
            height: AVATAR_SIZE,
            borderRadius: AVATAR_SIZE / 2,
            overflow: "hidden",
            backgroundColor: isActive ? `${activeColor}22` : colors.surfaceSecondary,
            borderWidth: isActive ? 2 : 1,
            borderColor: isActive ? activeColor : colors.border,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {pet.imageUrl ? (
            <Image
              source={{ uri: pet.imageUrl }}
              style={{ width: AVATAR_SIZE, height: AVATAR_SIZE }}
              resizeMode="cover"
            />
          ) : (
            <Text style={{ fontSize: 26 }}>{getSpeciesEmoji(pet.species)}</Text>
          )}
        </View>
      </View>
      <Text
        numberOfLines={1}
        style={{
          fontSize: 11,
          fontWeight: isActive ? "700" : "500",
          color: isActive ? activeColor : colors.textSecondary,
          maxWidth: AVATAR_SIZE + 8,
          textAlign: "center",
        }}
      >
        {pet.name}
      </Text>
    </Pressable>
  );
}

export function PetAvatarSwitcher({ pets, activeIndex, onSelect, onAddPress }: PetAvatarSwitcherProps) {
  const { colors } = useTheme();
  const { isRTL } = useTranslation();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{
        flexDirection: rowDirectionForAppLayout(isRTL),
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 4,
        gap: 16,
        justifyContent: pets.length <= 3 ? "center" : undefined,
        flexGrow: pets.length <= 3 ? 1 : undefined,
      }}
    >
      {pets.map((p, i) => (
        <PetAvatar
          key={p.id}
          pet={p}
          isActive={i === activeIndex}
          activeColor={colors.brand}
          onPress={() => onSelect(i)}
        />
      ))}

      <Pressable
        onPress={onAddPress}
        style={{ alignItems: "center", gap: 5 }}
        android_ripple={{ color: `${colors.primary}22`, borderless: true, radius: AVATAR_SIZE / 2 }}
      >
        <View
          style={{
            width: AVATAR_SIZE,
            height: AVATAR_SIZE,
            borderRadius: AVATAR_SIZE / 2,
            backgroundColor: colors.surfaceSecondary,
            borderWidth: 1.5,
            borderColor: colors.border,
            borderStyle: "dashed",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name="add" size={24} color={colors.textMuted} />
        </View>
        <Text
          style={{
            fontSize: 11,
            fontWeight: "500",
            color: colors.textMuted,
            maxWidth: AVATAR_SIZE + 8,
            textAlign: "center",
          }}
        >
          {""}
        </Text>
      </Pressable>
    </ScrollView>
  );
}
