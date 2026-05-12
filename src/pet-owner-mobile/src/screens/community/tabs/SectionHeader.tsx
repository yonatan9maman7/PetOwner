import { View, Text, Pressable } from "react-native";
import { useTranslation } from "../../../i18n";
import { useCommunityStyles } from "../communityStyles";

export function SectionHeader({
  title,
  subtitle,
  actionLabel,
  onAction,
}: {
  title: string;
  subtitle: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  const styles = useCommunityStyles();
  const { rtlText } = useTranslation();
  return (
    <View style={styles.sectionHeader}>
      <View style={{ flex: 1 }}>
        <Text style={[styles.sectionTitle, rtlText]}>{title}</Text>
        <Text style={[styles.sectionSubtitle, rtlText]}>{subtitle}</Text>
      </View>
      {actionLabel && onAction ? (
        <Pressable onPress={onAction} style={styles.primarySmallBtn}>
          <Text style={styles.primarySmallText}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
