import { rowDirectionForAppLayout } from "../../../../i18n";
import { View, Text, Pressable, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { FlatList } from "react-native";
import type { RefObject } from "react";
import type { PetDto } from "../../../../types/api";
import { getSpeciesEmoji } from "../constants";

interface PetSwitcherProps {
  pets: PetDto[];
  activeIndex: number;
  onSelect: (index: number) => void;
  onAddPress: () => void;
  pagerRef: RefObject<FlatList<PetDto> | null>;
  isRTL: boolean;
  primaryColor: string;
  borderColor: string;
  textSecondary: string;
}

export function PetSwitcher({
  pets,
  activeIndex,
  onSelect,
  onAddPress,
  pagerRef,
  isRTL,
  primaryColor,
  borderColor,
  textSecondary,
}: PetSwitcherProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{
        flexDirection: rowDirectionForAppLayout(isRTL),
        justifyContent: pets.length <= 2 ? "center" : undefined,
        flexGrow: pets.length <= 2 ? 1 : undefined,
        gap: 8,
        marginTop: 16,
        marginBottom: 4,
        paddingHorizontal: 20,
      }}
    >
      {pets.map((p, i) => (
        <Pressable
          key={p.id}
          onPress={() => {
            onSelect(i);
            pagerRef.current?.scrollToIndex({ index: i, animated: true });
          }}
          style={{
            paddingHorizontal: 14,
            paddingVertical: 6,
            borderRadius: 20,
            backgroundColor: i === activeIndex ? primaryColor : borderColor,
          }}
        >
          <Text
            style={{
              fontSize: 13,
              fontWeight: "700",
              color: i === activeIndex ? "#fff" : textSecondary,
            }}
          >
            {getSpeciesEmoji(p.species)} {p.name}
          </Text>
        </Pressable>
      ))}
      <Pressable
        onPress={onAddPress}
        style={{
          width: 32,
          height: 32,
          borderRadius: 16,
          backgroundColor: borderColor,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Ionicons name="add" size={18} color={textSecondary} />
      </Pressable>
    </ScrollView>
  );
}
