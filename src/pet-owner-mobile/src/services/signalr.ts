import {
  HubConnectionBuilder,
  HubConnection,
  LogLevel,
} from "@microsoft/signalr";
import { useAuthStore } from "../store/authStore";
import { useChatStore } from "../store/chatStore";
import type { ChatNewMessageResponse } from "../types/api";
import { CHAT_HUB_URL } from "../config/server";

let connection: HubConnection | null = null;

export async function startConnection(): Promise<void> {
  if (connection) return;

  const token = useAuthStore.getState().token;
  if (!token) return;

  connection = new HubConnectionBuilder()
    .withUrl(CHAT_HUB_URL, {
      accessTokenFactory: () => useAuthStore.getState().token ?? "",
    })
    .withAutomaticReconnect()
    .configureLogging(LogLevel.None)
    .build();

  connection.on("ReceiveMessage", (data: ChatNewMessageResponse) => {
    useChatStore.getState().addIncomingMessage(data);
  });

  connection.on("MessageSent", (data: ChatNewMessageResponse) => {
    useChatStore.getState().addSentMessage(data);
  });

  try {
    await connection.start();
  } catch {
    connection = null;
  }
}

export async function stopConnection(): Promise<void> {
  if (!connection) return;
  await connection.stop();
  connection = null;
}

export function sendMessage(
  recipientId: string,
  content: string,
): Promise<void> {
  if (!connection) {
    return Promise.reject(new Error("Chat connection not ready"));
  }
  return connection.invoke("SendMessage", recipientId, content);
}
