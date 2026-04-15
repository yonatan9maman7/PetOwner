import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "../../../../i18n";
import { TILE_CONFIG } from "../constants";
import type { Section } from "../types";

type TileSection = Exclude<Section, null | "triage">;

interface ActionTilesProps {
  onSelectSection: (s: TileSection) => void;
  disabled?: boolean;
}

export function ActionTiles({ onSelectSection, disabled }: ActionTilesProps) {
  const { t } = useTranslation();

  return (
    <View style={{ paddingHorizontal: 20, marginTop: 20, gap: 12 }}>
      {[TILE_CONFIG.slice(0, 2), TILE_CONFIG.slice(2, 4)].map((row, ri) => (
        <View key={ri} style={{ flexDirection: "row", gap: 12 }}>
          {row.map((tile) => (
            <View
              key={tile.key}
              style={{
                flex: 1,
                backgroundColor: tile.color,
                borderRadius: 20,
                shadowColor: tile.color,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.35,
                shadowRadius: 10,
                elevation: 6,
                overflow: "hidden",
              }}
            >
              <Pressable
                onPress={() => {
                  if (!disabled) onSelectSection(tile.key);
                }}
                disabled={disabled}
                style={{
                  paddingVertical: 24,
                  paddingHorizontal: 16,
                  alignItems: "center",
                  opacity: disabled ? 0.5 : 1,
                }}
                android_ripple={{ color: "rgba(255,255,255,0.2)" }}
              >
                <View
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: 16,
                    backgroundColor: "rgba(255,255,255,0.2)",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: 14,
                  }}
                >
                  <Ionicons name={tile.icon} size={26} color="#fff" />
                </View>
                <Text
                  style={{
                    fontSize: 15,
                    fontWeight: "800",
                    color: "#fff",
                    textAlign: "center",
                  }}
                  numberOfLines={1}
                >
                  {t(tile.labelKey)}
                </Text>
                <Text
                  style={{
                    fontSize: 11,
                    color: "rgba(255,255,255,0.7)",
                    marginTop: 3,
                    fontWeight: "500",
                    textAlign: "center",
                  }}
                >
                  {tile.key === "health"
                    ? t("viewDetails")
                    : tile.key === "vaccines"
                      ? t("manageVaccines")
                      : tile.key === "weight"
                        ? t("trackWeight")
                        : t("viewRecords")}
                </Text>
              </Pressable>
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}
