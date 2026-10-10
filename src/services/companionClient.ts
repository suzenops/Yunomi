import {
  validateReply,
  type ChatReply,
  type ChatRequest,
} from "../../shared/conversation.ts";
import type { ConnectionConfig } from "./connectionConfig.ts";
import { createSessionVault } from "./sessionVault.ts";
export type FailureKind =
  | "configuration"
  | "authentication"
  | "network"
  | "backend"
  | "provider"
  | "rate_limit";
export class ConnectionError extends Error {
  kind: FailureKind;
  constructor(kind: FailureKind, message: string) {
    super(message);
    this.name = "ConnectionError";
    this.kind = kind;
  }
}
type Session = {
  access_token: string;
  refresh_token: string;
  expires_at: number;
};
function sessionValue(value: unknown): value is Session {
  if (!value || typeof value !== "object") return false;
  const s = value as Partial<Session>;
  return (
    typeof s.access_token === "string" &&
    !!s.access_token &&
    typeof s.refresh_token === "string" &&
    !!s.refresh_token &&
    typeof s.expires_at === "number" &&
    Number.isFinite(s.expires_at)
  );
}
const failureMessages: Record<string, [FailureKind, string]> = {
  auth_unavailable: [
    "authentication",
    "The backend couldn’t reach Supabase. Check the server’s Supabase URL and public key, then retry.",
  ],
  auth_failed: [
    "authentication",
    "The backend rejected your Supabase session. Make sure the app and backend use the same Supabase project, then reset the connection.",
  ],
  provider_auth: [
    "provider",
    "OpenAI rejected the server credentials. Check the server-only OPENAI_API_KEY and model access.",
  ],
  provider_configuration: [
    "provider",
    "OpenAI rejected the server’s model/request configuration. Check OPENAI_MODEL and Responses API model access.",
  ],
  provider_limit: [
    "provider",
    "OpenAI’s quota or rate limit was reached. Check the provider billing/limits, then retry later.",
  ],
  provider_unavailable: [
    "provider",
    "The AI provider is unavailable or timed out. Please retry.",
  ],
  provider_invalid_response: [
    "provider",
    "The AI provider didn’t return a usable reply. Please retry or check the server’s model configuration.",
  ],
  rate_limited: [
    "rate_limit",
    "Yunomi’s backend request limit was reached. Please pause before retrying.",
  ],
  invalid_request: [
    "backend",
    "The backend rejected the message or sharing consent. Update the app and backend together.",
  ],
};
export function createCompanionClient(
  config: ConnectionConfig,
  vault: ReturnType<typeof createSessionVault>,
  fetcher: typeof fetch = fetch,
) {
  async function fetchWithTimeout(
    url: string,
    init: RequestInit,
    signal: AbortSignal,
    milliseconds: number,
    kind: FailureKind,
  ) {
    const abort = new AbortController();
    const cancel = () => abort.abort();
    signal.addEventListener("abort", cancel);
    if (signal.aborted) cancel();
    const timer = setTimeout(cancel, milliseconds);
    try {
      const response = await fetcher(url, { ...init, signal: abort.signal });
      // Keep cancellation/timeout active while reading the response, not only its headers.
      const body = await response.text();
      return new Response(
        [204, 205, 304].includes(response.status) ? null : body,
        {
          status: response.status,
          headers: response.headers,
        },
      );
    } catch {
      if (signal.aborted) throw new Error("Cancelled");
      throw new ConnectionError(
        kind,
        kind === "authentication"
          ? "Couldn’t reach Supabase for sign-in. Check internet access and the Supabase project URL, then retry."
          : "Couldn’t reach the backend. Check its HTTPS tunnel, that the server is running on port 8787, and your phone’s connection.",
      );
    } finally {
      clearTimeout(timer);
      signal.removeEventListener("abort", cancel);
    }
  }
  async function accessToken(signal: AbortSignal, forceRefresh = false) {
    let version = vault.version();
    let raw: string | null;
    try {
      raw = await vault.read();
    } catch {
      throw new ConnectionError(
        "authentication",
        "Saved sign-in credentials could not be opened. Use Reset secure connection and try again.",
      );
    }
    if (signal.aborted || version !== vault.version())
      throw new Error("Cancelled");
    let session: Session | null = null;
    if (raw) {
      try {
        const parsed: unknown = JSON.parse(raw);
        if (!sessionValue(parsed)) throw new Error();
        session = parsed;
      } catch {
        throw new ConnectionError(
          "authentication",
          "Saved sign-in credentials could not be read. Use Reset secure connection and try again.",
        );
      }
    }
    if (!forceRefresh && session && session.expires_at > Date.now() / 1000 + 60)
      return session.access_token;
    async function signIn(refresh?: string) {
      return fetchWithTimeout(
        `${config.auth}/auth/v1/${refresh ? "token?grant_type=refresh_token" : "signup"}`,
        {
          method: "POST",
          headers: {
            apikey: config.publicKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(
            refresh ? { refresh_token: refresh } : { data: {} },
          ),
        },
        signal,
        10000,
        "authentication",
      );
    }
    let response = await signIn(session?.refresh_token);
    // Only a rejected refresh credential warrants replacing the anonymous identity.
    if (session && (response.status === 400 || response.status === 401)) {
      if (signal.aborted || version !== vault.version())
        throw new Error("Cancelled");
      await vault.reset();
      version = vault.version();
      response = await signIn();
    }
    if (!response.ok) {
      if (response.status === 429)
        throw new ConnectionError(
          "authentication",
          "Supabase sign-in is rate limited. Wait before retrying.",
        );
      if (response.status >= 500)
        throw new ConnectionError(
          "authentication",
          "Supabase sign-in is unavailable. Please retry.",
        );
      throw new ConnectionError(
        "authentication",
        "Supabase sign-in was rejected. Check the public key, enable anonymous sign-ins, and check whether CAPTCHA is required. Yunomi does not yet support a CAPTCHA sign-in challenge.",
      );
    }
    let body;
    try {
      body = await response.json();
    } catch {
      throw new ConnectionError(
        "authentication",
        "Supabase returned an unreadable sign-in response.",
      );
    }
    if (
      !body ||
      typeof body.access_token !== "string" ||
      !body.access_token ||
      typeof body.refresh_token !== "string" ||
      !body.refresh_token ||
      typeof body.expires_in !== "number" ||
      !Number.isFinite(body.expires_in) ||
      body.expires_in <= 0
    )
      throw new ConnectionError(
        "authentication",
        "Supabase returned an invalid session. Check anonymous authentication settings.",
      );
    const next = {
      access_token: body.access_token,
      refresh_token: body.refresh_token,
      expires_at: Date.now() / 1000 + body.expires_in,
    };
    if (signal.aborted || version !== vault.version())
      throw new Error("Cancelled");
    try {
      await vault.write(JSON.stringify(next), version, signal);
    } catch {
      if (signal.aborted || version !== vault.version())
        throw new Error("Cancelled");
      throw new ConnectionError(
        "authentication",
        "Sign-in succeeded, but credentials couldn’t be saved securely. Retry or reset the connection.",
      );
    }
    return next.access_token;
  }
  return {
    resetConnection: () => vault.reset(),
    async requestReply(
      request: ChatRequest,
      signal: AbortSignal,
    ): Promise<ChatReply> {
      if (config.issues.length)
        throw new ConnectionError(
          "configuration",
          `${config.issues.join(" ")} Restart Expo with --clear after editing .env.`,
        );
      let token = await accessToken(signal);
      async function send() {
        if (signal.aborted) throw new Error("Cancelled");
        return fetchWithTimeout(
          `${config.backend}/chat`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(request),
          },
          signal,
          65000,
          "network",
        );
      }
      let response = await send();
      if (response.status === 401) {
        token = await accessToken(signal, true);
        response = await send();
      }
      if (!response.ok) {
        let code: unknown;
        try {
          code = (await response.json())?.code;
        } catch {
          /* Proxy errors need not be JSON. */
        }
        const known =
          typeof code === "string" && Object.hasOwn(failureMessages, code)
            ? failureMessages[code]
            : undefined;
        if (known) throw new ConnectionError(...known);
        if (response.status === 401 || response.status === 403)
          throw new ConnectionError(...failureMessages.auth_failed);
        if (response.status === 429)
          throw new ConnectionError(...failureMessages.rate_limited);
        if (response.status === 502)
          throw new ConnectionError(...failureMessages.provider_unavailable);
        throw new ConnectionError(
          "backend",
          `The backend returned HTTP ${response.status}. Check the backend deployment and configuration, then retry.`,
        );
      }
      try {
        const body = await response.json();
        if (body.source !== "ai" && body.source !== "safety") throw new Error();
        return { ...validateReply(body), source: body.source };
      } catch {
        throw new ConnectionError(
          "backend",
          "The backend returned an invalid reply. Check that the tunnel points to Yunomi’s backend and the app/server versions match.",
        );
      }
    },
  };
}
