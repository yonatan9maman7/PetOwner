import { create } from "zustand";
import { chatApi } from "../api/client";
import { useAuthStore } from "./authStore";
import type {
  ChatConversationDto,
  ChatMessageDto,
  ChatNewMessageResponse,
} from "../types/api";

interface ChatState {
  conversations: ChatConversationDto[];
  activeMessages: ChatMessageDto[];
  activeOtherUserId: string | null;
  loading: boolean;
  fetchConversations: () => Promise<void>;
  fetchMessages: (otherUserId: string, page?: number) => Promise<void>;
  markAsRead: (otherUserId: string) => Promise<void>;
  addIncomingMessage: (msg: ChatNewMessageResponse) => void;
  addSentMessage: (msg: ChatNewMessageResponse) => void;
  setActiveChat: (otherUserId: string | null) => void;
  reset: () => void;
}

/** Inbound SignalR message: update list preview + unread when not viewing that thread. */
function applyIncomingMessage(
  state: ChatState,
  msg: ChatNewMessageResponse,
  myUserId: string,
): Partial<ChatState> {
  const senderId = msg.message.senderId;
  const fromOther = !myUserId || senderId !== myUserId;
  const viewingThisChat = state.activeOtherUserId === senderId;
  const bumpUnread = fromOther && !viewingThisChat;

  const activeMessages =
    state.activeOtherUserId &&
    (senderId === state.activeOtherUserId ||
      msg.conversationId ===
        state.conversations.find(
          (c) => c.otherUserId === state.activeOtherUserId,
        )?.conversationId)
      ? [...state.activeMessages, msg.message]
      : state.activeMessages;

  const existing = state.conversations.find(
    (c) => c.conversationId === msg.conversationId,
  );
  const conversations = existing
    ? state.conversations.map((c) =>
        c.conversationId === msg.conversationId
          ? {
              ...c,
              lastMessageSnippet: msg.message.content,
              lastMessageAt: msg.message.sentAt,
              unreadCount: viewingThisChat
                ? 0
                : bumpUnread
                  ? c.unreadCount + 1
                  : c.unreadCount,
            }
          : c,
      )
    : state.conversations;

  return { activeMessages, conversations };
}

export const useChatStore = create<ChatState>((set, get) => ({
  conversations: [],
  activeMessages: [],
  activeOtherUserId: null,
  loading: false,

  fetchConversations: async () => {
    set({ loading: true });
    try {
      const conversations = await chatApi.getConversations();
      set({ conversations, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  fetchMessages: async (otherUserId, page = 1) => {
    set({ loading: true });
    try {
      const data = await chatApi.getMessages(otherUserId, page);
      set({
        activeMessages:
          page > 1 ? [...data, ...get().activeMessages] : data,
        activeOtherUserId: otherUserId,
        loading: false,
      });
    } catch {
      set({ loading: false });
    }
  },

  markAsRead: async (otherUserId) => {
    try {
      await chatApi.markAsRead(otherUserId);
      set({
        conversations: get().conversations.map((c) =>
          c.otherUserId === otherUserId ? { ...c, unreadCount: 0 } : c,
        ),
      });
    } catch {
      /* silent */
    }
  },

  addIncomingMessage: (msg) => {
    const myId = useAuthStore.getState().userId ?? "";
    const hadConversation = get().conversations.some(
      (c) => c.conversationId === msg.conversationId,
    );
    set((state) => applyIncomingMessage(state, msg, myId));
    if (!hadConversation) void get().fetchConversations();
  },

  addSentMessage: (msg) => {
    set((state) => {
      const isDuplicate = state.activeMessages.some(
        (m) => m.id === msg.message.id,
      );
      const activeMessages =
        state.activeOtherUserId && !isDuplicate
          ? [...state.activeMessages, msg.message]
          : state.activeMessages;

      const existing = state.conversations.find(
        (c) => c.conversationId === msg.conversationId,
      );
      const conversations = existing
        ? state.conversations.map((c) =>
            c.conversationId === msg.conversationId
              ? {
                  ...c,
                  lastMessageSnippet: msg.message.content,
                  lastMessageAt: msg.message.sentAt,
                }
              : c,
          )
        : state.conversations;

      return { activeMessages, conversations };
    });
  },

  setActiveChat: (otherUserId) => {
    set({ activeOtherUserId: otherUserId, activeMessages: [] });
  },

  reset: () => {
    set({
      conversations: [],
      activeMessages: [],
      activeOtherUserId: null,
      loading: false,
    });
  },
}));
