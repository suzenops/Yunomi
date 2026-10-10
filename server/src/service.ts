import { createHash } from "node:crypto";
import {
  obviousUrgency,
  urgentReply,
  validateReply,
  validateRequest,
  type ChatReply,
  type ChatRequest,
} from "../../shared/conversation.ts";
import { companionInstructions, providerInput, replySchema } from "./prompt.ts";
export type Config = {
  apiKey: string;
  model: string;
  supabaseUrl: string;
  anonKey: string;
  maxDaily: number;
};
export type Dependencies = {
  authenticate: (token: string) => Promise<string | null>;
  generate: (request: ChatRequest, user: string) => Promise<ChatReply>;
  now?: () => number;
};
export class ProviderError extends Error {
  code: string;
  constructor(code: string) {
    super("AI provider request failed");
    this.code = code;
  }
}
const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
export function makeHandler(deps: Dependencies, maxDaily = 1000) {
  const counters = new Map<string, { count: number; until: number }>();
  const active = new Set<string>();
  let day = "";
  let used = 0;
  return async function handle(request: Request): Promise<Response> {
    const pathname = new URL(request.url).pathname;
    if (pathname === "/health" && request.method === "GET")
      return json(200, {
        status: "configuration-present",
        deviceVerified: false,
      });
    if (pathname !== "/chat" || request.method !== "POST")
      return json(404, { error: "Not found" });
    const token = request.headers
      .get("Authorization")
      ?.match(/^Bearer ([A-Za-z0-9._-]+)$/)?.[1];
    if (!token || token.length > 4096)
      return json(401, {
        code: "auth_failed",
        error: "A valid session is required.",
      });
    let user: string | null;
    try {
      user = await deps.authenticate(token);
    } catch {
      return json(503, {
        code: "auth_unavailable",
        error: "Sign-in is temporarily unavailable. Try again.",
      });
    }
    if (!user)
      return json(401, {
        code: "auth_failed",
        error: "Your session expired. Try again.",
      });
    const now = (deps.now ?? Date.now)();
    for (const [key, entry] of counters)
      if (entry.until <= now) counters.delete(key);
    if (!counters.has(user) && counters.size >= 10000)
      return json(503, {
        code: "backend_unavailable",
        error: "Yunomi is busy. Try again soon.",
      });
    const counter = counters.get(user) ?? { count: 0, until: now + 60000 };
    if (++counter.count > 10)
      return json(429, {
        code: "rate_limited",
        error: "Please pause a moment before trying again.",
      });
    counters.set(user, counter);
    const currentDay = new Date(now).toISOString().slice(0, 10);
    if (day !== currentDay) {
      day = currentDay;
      used = 0;
    }
    if (used >= maxDaily || active.size >= 20 || active.has(user))
      return json(429, {
        code: "rate_limited",
        error: "Yunomi is at its request limit. Please try later.",
      });
    if (!request.headers.get("Content-Type")?.startsWith("application/json"))
      return json(415, { code: "invalid_request", error: "JSON is required." });
    let body: ChatRequest;
    try {
      const raw = await request.text();
      if (new TextEncoder().encode(raw).length > 24000)
        return json(413, {
          code: "invalid_request",
          error: "Message is too large.",
        });
      body = validateRequest(JSON.parse(raw));
    } catch {
      return json(400, {
        code: "invalid_request",
        error: "Check the message and sharing consent, then try again.",
      });
    }
    used++;
    active.add(user);
    try {
      const latest = body.messages.at(-1)?.text ?? "";
      if (obviousUrgency(latest + " " + (body.journal?.note ?? "")))
        return json(200, urgentReply);
      return json(200, await deps.generate(body, user));
    } catch (error) {
      return json(502, {
        code:
          error instanceof ProviderError
            ? error.code
            : "provider_invalid_response",
        error: "Yunomi couldn’t reply right now. Please try again.",
      });
    } finally {
      active.delete(user);
    }
  };
}
export function liveDependencies(
  config: Config,
  fetcher: typeof fetch = fetch,
): Dependencies {
  async function provider(path: string, body: unknown) {
    let response: Response;
    try {
      response = await fetcher(`https://api.openai.com/v1/${path}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(20000),
      });
    } catch {
      throw new ProviderError("provider_unavailable");
    }
    if (!response.ok) {
      if (response.status === 401 || response.status === 403)
        throw new ProviderError("provider_auth");
      if (response.status === 429) throw new ProviderError("provider_limit");
      if (response.status === 400 || response.status === 404)
        throw new ProviderError("provider_configuration");
      throw new ProviderError("provider_unavailable");
    }
    try {
      return await response.json();
    } catch {
      throw new ProviderError("provider_invalid_response");
    }
  }
  return {
    async authenticate(token) {
      const response = await fetcher(`${config.supabaseUrl}/auth/v1/user`, {
        headers: { apikey: config.anonKey, Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(5000),
      });
      if (response.status === 401 || response.status === 403) return null;
      if (!response.ok) throw new Error("Auth unavailable");
      const user = await response.json();
      return typeof user.id === "string" && /^[0-9a-f-]{36}$/i.test(user.id)
        ? user.id
        : null;
    },
    async generate(request, user) {
      const input =
        (request.messages.at(-1)?.text ?? "") +
        "\n" +
        (request.journal?.note ?? "");
      const moderation = await provider("moderations", {
        model: "omni-moderation-latest",
        input,
      });
      const categories = moderation.results?.[0]?.categories;
      if (
        !categories ||
        typeof categories["self-harm/intent"] !== "boolean" ||
        typeof categories["self-harm/instructions"] !== "boolean"
      )
        throw new Error("Safety check unavailable");
      if (
        categories["self-harm/intent"] ||
        categories["self-harm/instructions"]
      )
        return urgentReply;
      const result = await provider("responses", {
        model: config.model,
        store: false,
        safety_identifier: createHash("sha256").update(user).digest("hex"),
        instructions: companionInstructions,
        input: providerInput(request),
        max_output_tokens: 450,
        text: {
          format: {
            type: "json_schema",
            name: "companion_reply",
            strict: true,
            schema: replySchema,
          },
        },
      });
      if (result.status !== "completed") throw new Error("Incomplete response");
      const text = result.output
        ?.flatMap(
          (item: { content?: { type: string; text?: string }[] }) =>
            item.content ?? [],
        )
        .filter((part: { type: string }) => part.type === "output_text")
        .map((part: { text: string }) => part.text)
        .join("");
      const reply = validateReply(JSON.parse(text ?? ""));
      if (reply.safety === "urgent") return urgentReply;
      const outputCheck = await provider("moderations", {
        model: "omni-moderation-latest",
        input: reply.reply,
      });
      if (
        typeof outputCheck.results?.[0]?.flagged !== "boolean" ||
        outputCheck.results[0].flagged
      )
        throw new Error("Unsafe response withheld");
      return reply;
    },
  };
}
