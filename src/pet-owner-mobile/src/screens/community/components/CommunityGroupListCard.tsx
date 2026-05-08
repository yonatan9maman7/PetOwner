import { memo } from "react";
import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../../theme/ThemeContext";
import { rowDirectionForAppLayout } from "../../../i18n";
import type { CommunityGroupDto } from "../../../types/api";

export type CommunityGroupListCardProps = {
  item: CommunityGroupDto;
  isRTL: boolean;
  postsCountSuffix: string;
  joinedLabel: string;
  joinLabel: string;
  onOpenDetail: (group: CommunityGroupDto) => void;
  onToggleJoin: (group: CommunityGroupDto) => void;
};

/**
 * Memoized row for the communities / groups list so parent re-renders (e.g. search typing)
 * do not re-render every card on the JS thread.
 */
export const CommunityGroupListCard = memo(function CommunityGroupListCard({
  item,
  isRTL,
  postsCountSuffix,
  joinedLabel,
  joinLabel,
  onOpenDetail,
  onToggleJoin,
}: CommunityGroupListCardProps) {
  const { colors } = useTheme();
  const joined = item.joinedByMe ?? false;
  const rowDir = rowDirectionForAppLayout(isRTL);

  return (
    <Pressable
      onPress={() => onOpenDetail(item)}
      style={{
        backgroundColor: colors.surface,
        borderRadius: 16,
        marginHorizontal: 16,
        marginTop: 12,
        padding: 16,
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
        elevation: 3,
      }}
    >
      <View
        style={{
          flexDirection: rowDir,
          alignItems: "center",
          gap: 14,
        }}
      >
        <View
          style={{
            width: 50,
            height: 50,
            borderRadius: 16,
            backgroundColor: colors.surfaceSecondary,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={{ fontSize: 24 }}>{item.icon || "👥"}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontSize: 16,
              fontWeight: "700",
              color: colors.text,
              textAlign: isRTL ? "right" : "left",
            }}
            numberOfLines={1}
          >
            {item.name}
          </Text>
          {item.description ? (
            <Text
              style={{
                fontSize: 13,
                color: colors.textSecondary,
                marginTop: 2,
                textAlign: isRTL ? "right" : "left",
              }}
              numberOfLines={2}
            >
              {item.description}
            </Text>
          ) : null}
          <View
            style={{
              flexDirection: rowDir,
              alignItems: "center",
              gap: 6,
              marginTop: 6,
            }}
          >
            <Ionicons name="chatbubbles-outline" size={14} color={colors.textMuted} />
            <Text style={{ fontSize: 12, color: colors.textMuted, fontWeight: "600" }}>
              {item.postCount} {postsCountSuffix}
            </Text>
          </View>
        </View>
        <Pressable
          onPress={(e) => {
            e.stopPropagation?.();
            onToggleJoin(item);
          }}
          style={{
            backgroundColor: joined ? colors.successLight : colors.text,
            paddingHorizontal: 16,
            paddingVertical: 8,
            borderRadius: 10,
            borderWidth: joined ? 1 : 0,
            borderColor: colors.success,
          }}
        >
          <Text style={{ color: joined ? colors.success : colors.textInverse, fontSize: 13, fontWeight: "700" }}>
            {joined ? joinedLabel : joinLabel}
          </Text>
        </Pressable>
      </View>
    </Pressable>
  );
});
