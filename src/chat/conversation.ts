export type Mode = "adapt" | "listen" | "encourage" | "plan";
export type Message = { role: "user" | "assistant"; content: string };
export type Journal = { mood: string; note: string };
export type Request = {
  messages: Message[];
  mode: Mode;
  consent: true;
  journal?: Journal;
  journalConsent?: true;
  memory?: string;
};
export type ChatState = {
  messages: Message[];
  busy: boolean;
  error: string;
  retry: boolean;
};
export class Conversation {
  state: ChatState = { messages: [], busy: false, error: "", retry: false };
  private generation = 0;
  private abort?: AbortController;
  private pending?: Request;
  private transport: (request: Request, signal: AbortSignal) => Promise<string>;
  private changed: (state: ChatState) => void;
  constructor(
    transport: (request: Request, signal: AbortSignal) => Promise<string>,
    changed: (state: ChatState) => void,
  ) {
    this.transport = transport;
    this.changed = changed;
  }
  private publish(next: ChatState) {
    this.state = next;
    this.changed(next);
  }
  async send(input: {
    text: string;
    mode: Mode;
    consent: boolean;
    journal?: Journal;
    journalConsent?: boolean;
    memory?: string;
  }) {
    if (this.state.busy) return;
    if (!input.consent || (input.journal && !input.journalConsent))
      throw new Error("Explicit sharing consent is required.");
    const text = input.text.trim();
    if (!text || text.length > 2000) throw new Error("Use 1–2000 characters.");
    // A failed turn must be retried or discarded before adding another one.
    if (this.pending)
      throw new Error("Retry or delete the failed conversation first.");
    if (this.state.messages.length >= 38)
      throw new Error("Start a new conversation to continue.");
    // Keep explicitly shared context in the transcript for subsequent turns.
    const content = input.journal
      ? `${text}\nShared check-in: ${input.journal.mood}\n${input.journal.note}`
      : text;
    if (content.length > 2000)
      throw new Error("Use a shorter message with this check-in.");
    const messages: Message[] = [
      ...this.state.messages,
      { role: "user", content },
    ];
    this.pending = {
      messages,
      mode: input.mode,
      consent: true,
      ...(input.journal
        ? { journal: { ...input.journal }, journalConsent: true as const }
        : {}),
      ...(input.memory?.trim() ? { memory: input.memory.trim() } : {}),
    };
    this.publish({ messages, busy: false, error: "", retry: false });
    await this.run();
  }
  async retry() {
    if (this.pending && !this.state.busy) await this.run();
  }
  private async run() {
    const pending = this.pending;
    if (!pending) return;
    const generation = this.generation;
    const abort = new AbortController();
    this.abort = abort;
    this.publish({ ...this.state, busy: true, error: "", retry: false });
    try {
      const reply = await this.transport(pending, abort.signal);
      if (generation !== this.generation) return;
      if (!reply.trim() || reply.length > 8000)
        throw new Error("Invalid reply");
      this.pending = undefined;
      this.publish({
        messages: [...pending.messages, { role: "assistant", content: reply }],
        busy: false,
        error: "",
        retry: false,
      });
    } catch {
      if (generation !== this.generation) return;
      this.publish({
        ...this.state,
        busy: false,
        error:
          "Yunomi couldn’t reply. Check your connection and backend settings, then retry.",
        retry: true,
      });
    }
  }
  delete() {
    this.generation++;
    this.abort?.abort();
    this.pending = undefined;
    this.publish({ messages: [], busy: false, error: "", retry: false });
  }
}

export async function requestReply(
  url: string,
  token: string,
  request: Request,
  signal: AbortSignal,
) {
  if (!/^https:\/\/[^\s]+$/.test(url) || !token.trim())
    throw new Error("Configure an HTTPS backend and personal access token.");
  const controller = new AbortController();
  const cancel = () => controller.abort();
  signal.addEventListener("abort", cancel);
  if (signal.aborted) controller.abort();
  const timeout = setTimeout(cancel, 45000);
  try {
    const response = await fetch(`${url.replace(/\/$/, "")}/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token.trim()}`,
      },
      body: JSON.stringify(request),
      signal: controller.signal,
    });
    if (!response.ok) throw new Error("Backend request failed");
    const value: unknown = await response.json();
    if (
      !value ||
      typeof value !== "object" ||
      !("reply" in value) ||
      typeof value.reply !== "string"
    )
      throw new Error("Invalid response");
    return value.reply;
  } finally {
    clearTimeout(timeout);
    signal.removeEventListener("abort", cancel);
  }
}
