import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import * as SecureStore from "expo-secure-store";
import {
  obviousUrgency,
  urgentReply,
  type ConversationPath,
  type JournalContext,
} from "../../shared/conversation";
import { requestReply } from "../services/companionApi";
import {
  completeTurn,
  deleteConversation,
  emptyConversation,
  prepareTurn,
  type ConversationState,
  type PendingTurn,
} from "./flow";
import { createMemoryManager, type MemorySnapshot } from "./memory";
const memoryKey = "yunomi.memory.v1";
type ChatContextValue = {
  state: ConversationState;
  busy: boolean;
  consent: boolean;
  path: ConversationPath;
  memory: string;
  memoryEnabled: boolean;
  memoryReady: boolean;
  privacyError: string;
  setPath: (path: ConversationPath) => void;
  grantConsent: () => void;
  revokeConsent: () => void;
  send: (text: string, journal?: JournalContext) => Promise<void>;
  retry: () => Promise<void>;
  clear: () => void;
  saveMemory: (text: string) => Promise<void>;
  forgetMemory: () => Promise<void>;
};
const Context = createContext<ChatContextValue | null>(null);
export function ChatProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState(emptyConversation);
  const current = useRef(state);
  const controller = useRef<AbortController | null>(null);
  const [busy, setBusy] = useState(false);
  const sending = useRef(false);
  const [consent, setConsent] = useState(false);
  const consentRef = useRef(false);
  const [path, setPath] = useState<ConversationPath>("auto");
  const [memoryState, setMemoryState] = useState<MemorySnapshot>({
    text: "",
    enabled: false,
    ready: false,
    error: "",
  });
  const memoryCurrent = useRef(memoryState);
  const memoryManager = useRef<ReturnType<typeof createMemoryManager> | null>(
    null,
  );
  if (!memoryManager.current)
    memoryManager.current = createMemoryManager(
      {
        read: () => SecureStore.getItemAsync(memoryKey),
        write: (text) => SecureStore.setItemAsync(memoryKey, text),
        remove: () => SecureStore.deleteItemAsync(memoryKey),
      },
      (next) => {
        memoryCurrent.current = next;
        setMemoryState(next);
      },
    );
  const {
    text: memory,
    enabled: memoryEnabled,
    ready: memoryReady,
    error: privacyError,
  } = memoryState;
  function publish(next: ConversationState) {
    current.current = next;
    setState(next);
  }
  useEffect(() => {
    void memoryManager.current!.load();
    return () => {
      controller.current?.abort();
    };
  }, []);
  function clear() {
    controller.current?.abort();
    controller.current = null;
    sending.current = false;
    setBusy(false);
    publish(deleteConversation(current.current));
  }
  function revokeConsent() {
    consentRef.current = false;
    setConsent(false);
    clear();
  }
  async function run(turn: PendingTurn) {
    if (sending.current) return;
    const generation = current.current.generation;
    const abort = new AbortController();
    controller.current = abort;
    sending.current = true;
    setBusy(true);
    publish({ ...current.current, pending: turn, error: "" });
    const timeout = setTimeout(() => abort.abort(), 75000);
    try {
      const reply = obviousUrgency(
        turn.text + " " + (turn.request.journal?.note ?? ""),
      )
        ? urgentReply
        : await requestReply(turn.request, abort.signal);
      if (!abort.signal.aborted)
        publish(completeTurn(current.current, turn, reply, generation));
    } catch (error) {
      if (current.current.generation === generation)
        publish({
          ...current.current,
          error: abort.signal.aborted
            ? "The reply timed out. You can retry."
            : error instanceof Error
              ? error.message
              : "Something went wrong. Please retry.",
        });
    } finally {
      clearTimeout(timeout);
      if (controller.current === abort) {
        controller.current = null;
        sending.current = false;
        setBusy(false);
      }
    }
  }
  async function send(text: string, journal?: JournalContext) {
    if (sending.current || current.current.pending) return;
    try {
      const turn = prepareTurn(current.current, {
        id: `turn-${Date.now()}`,
        text,
        consent: consentRef.current,
        path,
        journal,
        journalConsent: !!journal,
        memory: memoryCurrent.current.enabled
          ? memoryCurrent.current.text
          : undefined,
      });
      await run(turn);
    } catch {
      publish({
        ...current.current,
        error:
          "Allow AI sharing first, and use a message of 1–1500 characters.",
      });
    }
  }
  async function saveMemory(text: string) {
    clear();
    await memoryManager.current!.save(text);
  }
  async function forgetMemory() {
    clear();
    await memoryManager.current!.forget();
  }
  return (
    <Context.Provider
      value={{
        state,
        busy,
        consent,
        path,
        memory,
        memoryEnabled,
        memoryReady,
        privacyError,
        setPath,
        grantConsent: () => {
          consentRef.current = true;
          setConsent(true);
        },
        revokeConsent,
        send,
        retry: async () => {
          if (consentRef.current && current.current.pending)
            await run(current.current.pending);
        },
        clear,
        saveMemory,
        forgetMemory,
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useChat() {
  const value = useContext(Context);
  if (!value) throw new Error("ChatProvider is required");
  return value;
}
