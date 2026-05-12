import { memo } from "react";
import { ScrollView, RefreshControl } from "react-native";
import { useTranslation } from "../../../i18n";
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
  copy,
  t,
}: LostSosTabProps) {
  const { colors } = useTheme();
  const { } = useTranslation();

  return (
    <ScrollView
      style={{ flex: 1 }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.text} colors={[colors.text]} />
      }
      contentContainerStyle={{ paddingBottom: bottomContentPadding }}
    >
      <SectionHeader title={t("cm_lost_sos_title")} subtitle={t("cm_lost_sos_subtitle")} />
      {loading && sosFeedPosts.length === 0 ? (
        <ScreenLoadingCenter spinnerSize={60} fill={false} style={{ paddingTop: 40 }} title={t("cm_lost_sos_title")} />
      ) : sosFeedPosts.length > 0 ? (
        sosFeedPosts.map((item) => renderPostCard(item))
      ) : (
        <ListEmptyState icon="warning-outline" title={t("cm_lost_sos_title")} message={t("cm_lost_sos_empty")} />
      )}
    </ScrollView>
  );
});
