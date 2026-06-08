import { memo, useCallback } from "react";
import { View, Text, Pressable, RefreshControl } from "react-native";
import { FlashList } from "@shopify/flash-list";
import { useTranslation } from "../../../i18n";
import { useTheme } from "../../../theme/ThemeContext";
import { useCommunityStyles } from "../communityStyles";
import { ListEmptyState } from "../../../components/shared";
import { SectionHeader } from "./SectionHeader";
import type { PostDto } from "../../../types/api";
import type { CopyKey } from "../communityShared";

interface QATabProps {
  questionPosts: PostDto[];
  refreshing: boolean;
  bottomContentPadding: number;
  onRefresh: () => void;
  onAskQuestion: () => void;
  onAnswer: (post: PostDto) => void;
  onToggleLike: (id: string) => void;
  copy: (key: CopyKey) => string;
  t: (key: any) => string;
}

export const QATab = memo(function QATab({
  questionPosts,
  refreshing,
  bottomContentPadding,
  onRefresh,
  onAskQuestion,
  onAnswer,
  onToggleLike,
  copy,
}: QATabProps) {
  const { colors } = useTheme();
  const styles = useCommunityStyles();
  const { rtlText, rtlRow, isRTL } = useTranslation();
  const appRowDirection = isRTL ? "row-reverse" as const : "row" as const;

  const renderItem = useCallback(
    ({ item: post }: { item: PostDto; index: number }) => (
      <View style={styles.card}>
        <Text style={[styles.sectionCardTitle, rtlText]}>{post.content}</Text>
        <Text style={[styles.sectionCardSub, rtlText]}>
          {copy("askedBy")} {post.userName} · {post.commentCount} {copy("answers")}
        </Text>
        <View style={[styles.metaWrap, { flexDirection: appRowDirection }]}>
          <Text style={styles.metaPill}>{copy("training")}</Text>
          <Text style={styles.metaPill}>{copy("bestAnswerPending")}</Text>
          <Text style={styles.metaPill}>{copy("helpful")} {post.likeCount}</Text>
        </View>
        <View style={[styles.actionBar, rtlRow]}>
          <Pressable onPress={() => onAnswer(post)} style={styles.primarySmallBtn}>
            <Text style={styles.primarySmallText}>{copy("answer")}</Text>
          </Pressable>
          <Pressable onPress={() => onToggleLike(post.id)} style={styles.smallOutlineBtn}>
            <Text style={styles.smallOutlineText}>{copy("helpful")}</Text>
          </Pressable>
        </View>
      </View>
    ),
    [styles, rtlText, rtlRow, appRowDirection, copy, onAnswer, onToggleLike],
  );

  return (
    <View style={{ flex: 1 }}>
      <FlashList
        data={questionPosts}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListHeaderComponent={
          <SectionHeader
            title={copy("qaTitle")}
            subtitle={copy("qaSub")}
            actionLabel={copy("askQuestion")}
            onAction={onAskQuestion}
          />
        }
        ListEmptyComponent={
          <ListEmptyState icon="help-circle-outline" title={copy("qaTitle")} message={copy("qaSub")} />
        }
        contentContainerStyle={{ paddingBottom: bottomContentPadding, flexGrow: 1 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.text} colors={[colors.text]} />
        }
      />
    </View>
  );
});
