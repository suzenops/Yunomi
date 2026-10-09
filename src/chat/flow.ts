import {
  validateRequest,
  type ChatRequest,
  type ChatReply,
  type ConversationPath,
  type JournalContext,
  type Message,
} from "../../shared/conversation.ts";
export type PendingTurn = { id: string; text: string; request: ChatRequest };
export type ConversationState = {
  messages: Message[];
  pending: PendingTurn | null;
  error: string;
  generation: number;
};
export const emptyConversation = (): ConversationState => ({
  messages: [],
  pending: null,
  error: "",
  generation: 0,
});
export function prepareTurn(
  state: ConversationState,
  options: {
    id: string;
    text: string;
    consent: boolean;
    path: ConversationPath;
    journal?: JournalContext;
    journalConsent?: boolean;
    memory?: string;
  },
): PendingTurn {
  if (state.pending) throw new Error("A reply is already in progress");
  const text = options.text.trim();
  // Keep whole turns. The last 9 pairs plus this message fit the backend's limit.
  const history = state.messages
    .slice(-18)
    .map(({ role, text }) => ({ role, text }));
  while (
    history.length &&
    history.reduce((sum, message) => sum + message.text.length, text.length) >
      16000
  )
    history.splice(0, 2);
  const request = validateRequest({
    consent: options.consent,
    path: options.path,
    messages: [...history, { role: "user", text }],
    ...(options.journal
      ? { journal: options.journal, journalConsent: options.journalConsent }
      : {}),
    ...(options.memory ? { memory: options.memory, memoryConsent: true } : {}),
  });
  return { id: options.id, text, request };
}
export function completeTurn(
  state: ConversationState,
  turn: PendingTurn,
  reply: ChatReply,
  generation: number,
): ConversationState {
  // Deleted/revoked conversations must never be resurrected by a late response.
  if (generation !== state.generation || state.pending?.id !== turn.id)
    return state;
  const journal = turn.request.journal;
  const visibleText = journal
    ? `Shared check-in (${journal.date}, ${journal.mood}): ${journal.note || "No note added."}`
    : turn.text;
  return {
    ...state,
    pending: null,
    error: "",
    messages: [
      ...state.messages,
      { id: turn.id, role: "user" as const, text: visibleText },
      {
        id: `${turn.id}-reply`,
        role: "assistant" as const,
        text: reply.reply,
        safety: reply.safety === "urgent",
      },
    ].slice(-40),
  };
}
export function deleteConversation(
  state: ConversationState,
): ConversationState {
  return { ...emptyConversation(), generation: state.generation + 1 };
}
