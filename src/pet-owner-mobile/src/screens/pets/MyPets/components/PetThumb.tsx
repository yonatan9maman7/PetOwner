import { useState } from "react";
import { View, Text, type ViewStyle } from "react-native";
import { Image } from "expo-image";
import type { PetSpecies } from "../../../../types/api";
import { getSpeciesEmoji } from "../constants";

interface PetThumbProps {
  imageUrl?: string | null;
  species?: PetSpecies | string | number | null;
  size: number;
  borderRadius?: number;
  style?: ViewStyle;
  recyclingKey?: string;
}

export function PetThumb({
  imageUrl,
  species,
  size,
  borderRadius,
  style,
  recyclingKey,
}: PetThumbProps) {
  const [failed, setFailed] = useState(false);
  const radius = borderRadius ?? size / 2;
  const showImage = !!imageUrl && !failed;

  if (showImage) {
    return (
      <Image
        source={imageUrl}
        style={[{ width: size, height: size, borderRadius: radius }, style]}
        contentFit="cover"
        cachePolicy="memory-disk"
        recyclingKey={recyclingKey}
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <View
      style={[
        {
          width: size,
          height: size,
          borderRadius: radius,
          alignItems: "center",
          justifyContent: "center",
        },
        style,
      ]}
    >
      <Text style={{ fontSize: Math.round(size * 0.52) }}>{getSpeciesEmoji(species)}</Text>
    </View>
  );
}
