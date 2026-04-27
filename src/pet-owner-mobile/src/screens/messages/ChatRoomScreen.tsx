import { useEffect, useRef, useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  BackHandler,
  Keyboard,
} from "react-native";
import { showGlobalAlertCompat } from "../../components/global-modal";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useChatStore } from "../../store/chatStore";
import { useAuthStore } from "../../store/authStore";
import { sendMessage } from "../../services/signalr";
import { useTranslation } from "../../i18n";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useTheme } from "../../theme/ThemeContext";
import type { ChatMessageDto } from "../../types/api";

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function ChatRoomScreen() {
  const { t, rtlText, rtlInput, isRTL } = useTranslation();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { colors } = useTheme();
  const { otherUserId, otherUserName } = route.params as {
    otherUserId: string;
    otherUserName: string;
  };

  const currentUserId = useAuthStore((s) => s.userId);
  const activeMessages = useChatStore((s) => s.activeMessages);
  const [text, setText] = useState("");
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const insets = useSafeAreaInsets();
  const listRef = useRef<FlatList>(null);

  const handleBack = useCallback(() => {
    const routes = navigation.getState()?.routes;
    if (routes && routes.length > 1) {
      navigation.goBack();
    } else {
      navigation.navigate("MessagesMain");
    }
  }, [navigation]);

  useEffect(() => {
    useChatStore.getState().setActiveChat(otherUserId);
    useChatStore.getState().fetchMessages(otherUserId);
    useChatStore.getState().markAsRead(otherUserId);

    return () => {
      useChatStore.getState().setActiveChat(null);
    };
  }, [otherUserId]);

  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      handleBack();
      return true;
    });
    return () => sub.remove();
  }, [handleBack]);

  useEffect(() => {
    const showEvt = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvt = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const show = Keyboard.addListener(showEvt, () => setKeyboardVisible(true));
    const hide = Keyboard.addListener(hideEvt, () => setKeyboardVisible(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  const handleSend = async () => {
    const content = text.trim();
    if (!content) return;
    setText("");
    try {
      await sendMessage(otherUserId, content);
    } catch {
      setText(content);
      showGlobalAlertCompat(t("genericErrorTitle"), t("genericErrorDesc"));
    }
  };

  const renderMessage = ({ item }: { item: ChatMessageDto }) => {
    const isSent = item.senderId === currentUserId;
    return (
      <View
        style={{
          paddingHorizontal: 16,
          marginBottom: 8,
          alignItems: isSent ? "flex-end" : "flex-start",
        }}
      >
        <View
          style={{
            maxWidth: "75%",
            borderRadius: 16,
            paddingHorizontal: 16,
            paddingVertical: 10,
            borderBottomRightRadius: isSent ? 4 : 16,
            borderBottomLeftRadius: isSent ? 16 : 4,
            backgroundColor: isSent ? colors.primary : colors.surfaceSecondary,
          }}
        >
          <Text
            style={[
              rtlText,
              {
                fontSize: 15,
                lineHeight: 20,
                color: isSent ? colors.textInverse : colors.text,
              },
            ]}
          >
            {item.content}
          </Text>
        </View>
        <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 4, paddingHorizontal: 4 }}>
          {formatTime(item.sentAt)}
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background, marginTop: -8 }} edges={["top"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={0}
      >
        <View
          style={{
            height: 56,
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 16,
            backgroundColor: colors.surface,
            shadowColor: colors.shadow,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.06,
            shadowRadius: 8,
            elevation: 3,
          }}
        >
          <TouchableOpacity
            onPress={handleBack}
            activeOpacity={0.7}
            style={{
              width: 40,
              height: 40,
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 20,
            }}
          >
            <Ionicons
              name={isRTL ? "chevron-forward" : "chevron-back"}
              size={24}
              color={colors.primary}
            />
          </TouchableOpacity>
          <Text style={{ fontSize: 18, fontWeight: "bold", color: colors.text, marginLeft: 8 }}>
            {otherUserName}
          </Text>
        </View>

        <FlatList
          ref={listRef}
          data={activeMessages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          inverted
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            flexDirection: "column-reverse",
            paddingVertical: 12,
          }}
        />

        {/* Avoid SafeAreaView bottom here: it stacks with KeyboardAvoidingView and leaves a gap above the keyboard on iOS. */}
        <View
          style={{
            backgroundColor: colors.surface,
            paddingBottom: keyboardVisible ? 0 : Math.max(insets.bottom, 8),
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "flex-end",
              paddingHorizontal: 16,
              paddingTop: 8,
              paddingBottom: 8,
              backgroundColor: colors.surface,
              gap: 8,
              shadowColor: colors.shadow,
              shadowOffset: { width: 0, height: -2 },
              shadowOpacity: 0.06,
              shadowRadius: 8,
              elevation: 4,
            }}
          >
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder={t("typeMessage")}
              placeholderTextColor={colors.textMuted}
              multiline
              style={[
                rtlInput,
                {
                  flex: 1,
                  backgroundColor: colors.inputBg,
                  borderRadius: 16,
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  fontSize: 15,
                  color: colors.text,
                  maxHeight: 96,
                },
              ]}
              onSubmitEditing={handleSend}
              blurOnSubmit={false}
            />
            <TouchableOpacity
              onPress={handleSend}
              disabled={!text.trim()}
              activeOpacity={0.7}
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: text.trim() ? colors.primary : colors.textMuted,
              }}
            >
              <Ionicons
                name="send"
                size={18}
                color={colors.textInverse}
                style={{ marginLeft: isRTL ? -2 : 2 }}
              />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
