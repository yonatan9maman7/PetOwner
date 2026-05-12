import { memo } from "react";
import { View, Text, TextInput, FlatList, Pressable, RefreshControl, type ListRenderItemInfo } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { rowDirectionForAppLayout, useTranslation } from "../../../i18n";
import { useTheme } from "../../../theme/ThemeContext";
import { useCommunityStyles } from "../communityStyles";
import { ListEmptyState, ScreenLoadingCenter } from "../../../components/shared";
import { SectionHeader } from "./SectionHeader";
import type { CommunityGroupDto } from "../../../types/api";
import type { CopyKey } from "../communityShared";
import type { EdgeInsets } from "react-native-safe-area-context";

interface GroupsTabProps {
  filteredGroups: CommunityGroupDto[];
  groupsLoading: boolean;
  groupsRefreshing: boolean;
  groupSearch: string;
  isAdmin: boolean;
  bottomContentPadding: number;
  insets: EdgeInsets;
  onRefresh: () => void;
  onSetGroupSearch: (v: string) => void;
  onOpenCreateModal: () => void;
  renderGroupCard: (info: ListRenderItemInfo<CommunityGroupDto>) => React.ReactElement;
  copy: (key: CopyKey) => string;
  t: (key: any) => string;
}

export const GroupsTab = memo(function GroupsTab({
  filteredGroups,
  groupsLoading,
  groupsRefreshing,
  groupSearch,
  isAdmin,
  bottomContentPadding,
  insets,
  onRefresh,
  onSetGroupSearch,
  onOpenCreateModal,
  renderGroupCard,
  copy,
  t,
}: GroupsTabProps) {
  const { colors } = useTheme();
  const styles = useCommunityStyles();
  const { rtlInput, isRTL } = useTranslation();
  const appRowDirection = rowDirectionForAppLayout(isRTL);

  const groupsListBottomPad = bottomContentPadding + (isAdmin ? 88 : 0);

  const renderGroupsEmpty = () =>
    !groupsLoading ? (
      <ListEmptyState
        icon="people-outline"
        title={t("noGroups")}
        message={t("noGroupsSubtitle")}
      />
    ) : null;

  return (
    <View style={{ flex: 1, position: "relative" }}>
      <SectionHeader title={copy("groupsTitle")} subtitle={copy("groupsSub")} />
      <View style={[styles.searchCard, { flexDirection: appRowDirection }]}>
        <Ionicons name="search" size={18} color={colors.textMuted} />
        <TextInput
          style={[styles.searchInput, rtlInput]}
          value={groupSearch}
          onChangeText={onSetGroupSearch}
          placeholder={copy("searchGroups")}
          placeholderTextColor={colors.textMuted}
        />
      </View>
      {groupsLoading && filteredGroups.length === 0 ? (
        <ScreenLoadingCenter spinnerSize={60} fill={false} style={{ paddingTop: 40 }} title={copy("groupsTitle")} />
      ) : (
        <FlatList
          style={{ flex: 1 }}
          data={filteredGroups}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={renderGroupsEmpty}
          contentContainerStyle={{ paddingBottom: groupsListBottomPad, flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          initialNumToRender={8}
          maxToRenderPerBatch={8}
          windowSize={5}
          removeClippedSubviews
          refreshControl={
            <RefreshControl
              refreshing={groupsRefreshing}
              onRefresh={onRefresh}
              tintColor={colors.text}
              colors={[colors.text]}
            />
          }
          renderItem={renderGroupCard}
        />
      )}
      {isAdmin ? (
        <Pressable
          onPress={onOpenCreateModal}
          accessibilityRole="button"
          accessibilityLabel={t("createGroup")}
          style={{
            position: "absolute",
            left: 24,
            bottom: 24 + insets.bottom,
            zIndex: 100,
            flexDirection: rowDirectionForAppLayout(isRTL),
            alignItems: "center",
            gap: 8,
            backgroundColor: colors.text,
            paddingHorizontal: 18,
            paddingVertical: 14,
            borderRadius: 18,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.25,
            shadowRadius: 10,
            elevation: 5,
          }}
        >
          <Ionicons name="add" size={22} color={colors.textInverse} />
          <Text style={{ color: colors.textInverse, fontSize: 14, fontWeight: "700" }}>{t("createGroup")}</Text>
        </Pressable>
      ) : null}
    </View>
  );
});
