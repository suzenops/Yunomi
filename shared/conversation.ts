export const paths = ["auto", "listen", "encourage", "plan"] as const;
export type ConversationPath = (typeof paths)[number];
export type Message = {
  id: string;
  role: "user" | "assistant";
  text: string;
  safety?: boolean;
};
export type JournalContext = { date: string; mood: string; note: string };
export type ChatRequest = {
  consent: true;
  path: ConversationPath;
  messages: { role: "user" | "assistant"; text: string }[];
  journal?: JournalContext;
  journalConsent?: true;
  memory?: string;
  memoryConsent?: true;
};
export type ChatReply = {
  reply: string;
  safety: "none" | "urgent";
  source: "ai" | "safety";
};
export const privacyText =
  "Your messages, recent conversation, and any details you choose to share go through Yunomi’s backend to OpenAI. Chats stay in this app session until you close or delete them. Optional memory is saved on this device until you forget it. Memory is off at each app launch until you choose to use it. The backend stores no conversation content. Supabase retains an anonymous sign-in identity; resetting the connection clears only local credentials. OpenAI may retain abuse-monitoring logs for up to 30 days, or longer for legal or safety reasons. Local deletion cannot erase provider logs. Yunomi is AI, can make mistakes, and is not a therapist or emergency service.";
export const urgentReply: ChatReply = {
  reply:
    "I’m concerned about your immediate safety. If you’ve taken something harmful, are injured, or might act on hurting yourself or someone else, contact local emergency services now. If you can, move away from anything you could use to cause harm and ask a trusted person to stay with you. In the US or Canada, call or text 988; elsewhere, find local support at findahelpline.com. Are you somewhere safe right now?",
  safety: "urgent",
  source: "safety",
};
// A narrow offline backstop, not a diagnosis or a substitute for model safety checks.
export function obviousUrgency(text: string): boolean {
  return /\b(i(?:'m| am) (?:about to|going to) (?:kill myself|end my life)|i (?:just )?(?:took|taken) an overdose|i have (?:a |the )?(?:gun|knife) and (?:will|am going to) (?:kill|hurt)|i can'?t keep myself safe)\b/i.test(
    text,
  );
}
function object(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
function bounded(value: unknown, max: number): value is string {
  return typeof value === "string" && value.length <= max;
}
export function validateRequest(value: unknown): ChatRequest {
  if (
    !object(value) ||
    value.consent !== true ||
    !paths.includes(value.path as ConversationPath) ||
    !Array.isArray(value.messages) ||
    !value.messages.length ||
    value.messages.length > 20
  )
    throw new Error("Invalid request or missing consent");
  let total = 0;
  for (let i = 0; i < value.messages.length; i++) {
    const message = value.messages[i];
    if (
      !object(message) ||
      !["user", "assistant"].includes(String(message.role)) ||
      !bounded(message.text, 1500) ||
      !message.text.trim() ||
      (i > 0 && message.role === value.messages[i - 1].role)
    )
      throw new Error("Invalid conversation");
    total += message.text.length;
  }
  if (
    value.messages[0].role !== "user" ||
    value.messages.at(-1).role !== "user" ||
    total > 16000
  )
    throw new Error("Invalid conversation");
  if (value.journal !== undefined) {
    if (
      value.journalConsent !== true ||
      !object(value.journal) ||
      !bounded(value.journal.note, 500) ||
      !["low", "heavy", "okay", "good", "bright"].includes(
        String(value.journal.mood),
      ) ||
      typeof value.journal.date !== "string" ||
      !/^\d{4}-\d{2}-\d{2}$/.test(value.journal.date)
    )
      throw new Error("Journal sharing requires consent");
  }
  if (
    value.memory !== undefined &&
    (value.memoryConsent !== true || !bounded(value.memory, 500))
  )
    throw new Error("Memory sharing requires consent");
  // Whitelist fields so clients cannot override system instructions or provider options.
  return {
    consent: true,
    path: value.path as ConversationPath,
    messages: value.messages.map((message) => ({
      role: message.role,
      text: message.text,
    })),
    ...(value.journal
      ? {
          journal: value.journal as JournalContext,
          journalConsent: true as const,
        }
      : {}),
    ...(value.memory !== undefined
      ? { memory: value.memory as string, memoryConsent: true as const }
      : {}),
  };
}
export function validateReply(value: unknown): ChatReply {
  if (
    !object(value) ||
    !bounded(value.reply, 1200) ||
    !value.reply.trim() ||
    !["none", "urgent"].includes(String(value.safety)) ||
    (value.reply.match(/\?/g)?.length ?? 0) > 1
  )
    throw new Error("Invalid provider response");
  if (value.safety === "urgent") return urgentReply;
  return { reply: value.reply.trim(), safety: "none", source: "ai" };
}
