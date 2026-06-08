import { memo, useCallback } from "react";
import { View, RefreshControl } from "react-native";
import { FlashList } from "@shopify/flash-list";
import { useTheme } from "../../../theme/ThemeContext";
import { ListEmptyState, ScreenLoadingCenter } from "../../../components/shared";
import { SectionHeader } from "./SectionHeader";
import type { PostDto } from "../../../types/api";
import type { CopyKey, PostMeta } from "../communityShared";

interface LostSosTabProps {
  sosFeedPosts: PostDto[];
  loading: boolean;
  refreshing: boolean;
  postMetaById: Record<string, PostMeta>;
  currentUserId: string | null;
  likeBusy: Record<string, boolean>;
  deleteBusy: Record<string, boolean>;
  bottomContentPadding: number;
  onRefresh: () => void;
  onToggleLike: (id: string) => void;
  onToggleHelpful: (id: string) => void;
  onToggleSave: (id: string) => void;
  onDelete: (id: string) => void;
  onHide: (id: string) => void;
  onReport: (id: string) => void;
  onBlock: (userId: string) => void;
  onPlaydateComing: (post: PostDto) => void;
  onSosResolved: (postId: string, resolvedAtIso: string) => void;
  burstMarkFoundCelebrate?: () => void;
  /** PostCard is passed as a render prop to avoid circular imports. */
  renderPostCard: (post: PostDto) => React.ReactElement;
  copy: (key: CopyKey) => string;
  t: (key: any) => string;
}

export const LostSosTab = memo(function LostSosTab({
  sosFeedPosts,
  loading,
  refreshing,
  bottomContentPadding,
  onRefresh,
  renderPostCard,
  t,
}: LostSosTabProps) {
  const { colors } = useTheme();

  const renderItem = useCallback(
    ({ item }: { item: PostDto; index: number }) => renderPostCard(item),
    [renderPostCard],
  );

  return (
    <View style={{ flex: 1 }}>
      <FlashList
        data={sosFeedPosts}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListHeaderComponent={
          <SectionHeader title={t("cm_lost_sos_title")} subtitle={t("cm_lost_sos_subtitle")} />
        }
        ListEmptyComponent={
          loading ? (
            <ScreenLoadingCenter spinnerSize={60} fill={false} style={{ paddingTop: 40 }} title={t("cm_lost_sos_title")} />
          ) : (
            <ListEmptyState icon="warning-outline" title={t("cm_lost_sos_title")} message={t("cm_lost_sos_empty")} />
          )
        }
        contentContainerStyle={{ paddingBottom: bottomContentPadding }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.text} colors={[colors.text]} />
        }
      />
    </View>
  );
});
