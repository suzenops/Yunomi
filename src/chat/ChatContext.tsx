import {
  createContext,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Conversation, requestReply, type ChatState } from "./conversation";
import * as SecureStore from "expo-secure-store";

const ChatContext = createContext<{
  conversation: Conversation;
  state: ChatState;
} | null>(null);
export function ChatProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ChatState>({
    messages: [],
    busy: false,
    error: "",
    retry: false,
  });
  const ref = useRef<Conversation | null>(null);
  if (!ref.current)
    ref.current = new Conversation(async (request, signal) => {
      const token = await SecureStore.getItemAsync("yunomi.backend.token");
      return requestReply(
        process.env.EXPO_PUBLIC_YUNOMI_API_URL ?? "",
        token ?? "",
        request,
        signal,
      );
    }, setState);
  return (
    <ChatContext.Provider value={{ conversation: ref.current, state }}>
      {children}
    </ChatContext.Provider>
  );
}
export function useChat() {
  const value = useContext(ChatContext);
  if (!value) throw new Error("ChatProvider is required");
  return value;
}
