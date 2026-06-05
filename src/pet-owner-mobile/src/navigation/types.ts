export type ChatRoomParams = {
  otherUserId: string;
  otherUserName: string;
  otherUserAvatar?: string;
  prefilledMessage?: string;
};

export type MessagesStackParamList = {
  MessagesMain: undefined;
  ChatRoom: ChatRoomParams;
};
