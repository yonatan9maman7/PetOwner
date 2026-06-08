import { memo } from "react";
import { View, StyleSheet } from "react-native";
import { useTheme } from "../../theme/ThemeContext";

export const PostCardSkeleton = memo(function PostCardSkeleton() {
  const { colors } = useTheme();
  const shimmerColor = colors.surface === "#ffffff" ? "#e0e0e0" : "#2a3550";

  return (
    <View style={[styles.card, { backgroundColor: colors.card ?? colors.surface }]}>
      <View style={styles.headerRow}>
        <View style={[styles.avatar, { backgroundColor: shimmerColor }]} />
        <View style={styles.headerText}>
          <View style={[styles.line, { width: "40%", backgroundColor: shimmerColor }]} />
          <View style={[styles.line, { width: "25%", backgroundColor: shimmerColor, marginTop: 6 }]} />
        </View>
      </View>
      <View style={[styles.line, { width: "100%", backgroundColor: shimmerColor, marginTop: 12 }]} />
      <View style={[styles.line, { width: "90%", backgroundColor: shimmerColor, marginTop: 8 }]} />
      <View style={[styles.line, { width: "70%", backgroundColor: shimmerColor, marginTop: 8 }]} />
      <View style={styles.actionRow}>
        <View style={[styles.actionBtn, { backgroundColor: shimmerColor }]} />
        <View style={[styles.actionBtn, { backgroundColor: shimmerColor }]} />
        <View style={[styles.actionBtn, { backgroundColor: shimmerColor }]} />
      </View>
    </View>
  );
});

const SKELETON_ITEMS = Array.from({ length: 4 }, (_, i) => i);

export const FeedSkeleton = memo(function FeedSkeleton() {
  return (
    <>
      {SKELETON_ITEMS.map((i) => (
        <PostCardSkeleton key={i} />
      ))}
    </>
  );
});

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 12,
    marginVertical: 6,
    borderRadius: 16,
    padding: 16,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  headerText: {
    flex: 1,
    marginLeft: 10,
  },
  line: {
    height: 12,
    borderRadius: 6,
  },
  actionRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 16,
  },
  actionBtn: {
    width: 60,
    height: 28,
    borderRadius: 8,
  },
});
