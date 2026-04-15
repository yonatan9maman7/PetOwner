import { View, Text, Pressable, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "../../../../i18n";
import type { PetDto } from "../../../../types/api";
import { usePetsStore } from "../../../../store/petsStore";

interface PetCardActionsProps {
  pet: PetDto;
  isRTL: boolean;
  surfaceColor: string;
  primaryColor: string;
  primaryLight: string;
  onEdit: (pet: PetDto) => void;
  onDelete: (pet: PetDto) => void;
}

export function PetCardActions({
  pet,
  isRTL,
  surfaceColor,
  primaryColor,
  primaryLight,
  onEdit,
  onDelete,
}: PetCardActionsProps) {
  const { t } = useTranslation();

  return (
    <View
      style={{
        backgroundColor: surfaceColor,
        flexDirection: isRTL ? "row-reverse" : "row",
        paddingVertical: 12,
        paddingHorizontal: 20,
        justifyContent: "center",
        gap: 12,
      }}
    >
      <Pressable
        onPress={() => onEdit(pet)}
        style={{
          flexDirection: isRTL ? "row-reverse" : "row",
          alignItems: "center",
          gap: 6,
          backgroundColor: primaryLight,
          paddingHorizontal: 16,
          paddingVertical: 8,
          borderRadius: 10,
        }}
      >
        <Ionicons name="create-outline" size={16} color={primaryColor} />
        <Text style={{ fontSize: 13, fontWeight: "600", color: primaryColor }}>{t("editPet")}</Text>
      </Pressable>
      <Pressable
        onPress={() => onDelete(pet)}
        style={{
          flexDirection: isRTL ? "row-reverse" : "row",
          alignItems: "center",
          gap: 6,
          backgroundColor: "#fef2f2",
          paddingHorizontal: 16,
          paddingVertical: 8,
          borderRadius: 10,
        }}
      >
        <Ionicons name="trash-outline" size={16} color="#ef4444" />
        <Text style={{ fontSize: 13, fontWeight: "600", color: "#ef4444" }}>{t("deletePet")}</Text>
      </Pressable>

      {pet.isLost && (
        <Pressable
          onPress={() => {
            Alert.alert(t("markFoundBtn"), t("markFound") + "?", [
              { text: t("cancel"), style: "cancel" },
              {
                text: t("markFoundBtn"),
                onPress: async () => {
                  try {
                    await usePetsStore.getState().markFound(pet.id);
                  } catch {
                    Alert.alert(t("errorTitle"));
                  }
                },
              },
            ]);
          }}
          style={{
            flexDirection: isRTL ? "row-reverse" : "row",
            alignItems: "center",
            gap: 6,
            backgroundColor: "#ecfdf5",
            paddingHorizontal: 16,
            paddingVertical: 8,
            borderRadius: 10,
          }}
        >
          <Ionicons name="checkmark-circle" size={16} color="#059669" />
          <Text style={{ fontSize: 13, fontWeight: "600", color: "#059669" }}>{t("markFoundBtn")}</Text>
        </Pressable>
      )}
    </View>
  );
}
