import * as SecureStore from "expo-secure-store";
import {
  validateReply,
  type ChatReply,
  type ChatRequest,
} from "../../shared/conversation";
import { createSessionVault } from "./sessionVault";
const sessionKey = "yunomi.auth.v1";
const vault = createSessionVault({
  read: () => SecureStore.getItemAsync(sessionKey),
  write: (value) => SecureStore.setItemAsync(sessionKey, value),
  remove: () => SecureStore.deleteItemAsync(sessionKey),
});
const backend = process.env.EXPO_PUBLIC_COMPANION_URL ?? "";
const auth = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
const publicKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "";
function httpsOrigin(value: string) {
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      url.pathname === "/" &&
      !url.search &&
      !url.hash
    );
  } catch {
    return false;
  }
}
export const companionConfigured =
  httpsOrigin(backend) && httpsOrigin(auth) && !!publicKey;
type Session = {
  access_token: string;
  refresh_token: string;
  expires_at: number;
};
async function accessToken(signal: AbortSignal) {
  const version = vault.version();
  const raw = await vault.read();
  if (signal.aborted || version !== vault.version())
    throw new Error("Cancelled");
  let session: Session | null = null;
  try {
    session = raw ? JSON.parse(raw) : null;
  } catch {
    throw new Error(
      "Session could not be read. Use Reset connection and try again.",
    );
  }
  if (
    session &&
    typeof session.access_token === "string" &&
    session.expires_at > Date.now() / 1000 + 60
  )
    return session.access_token;
  if (signal.aborted) throw new Error("Cancelled");
  const response = await fetch(
    `${auth}/auth/v1/${session?.refresh_token ? "token?grant_type=refresh_token" : "signup"}`,
    {
      method: "POST",
      headers: { apikey: publicKey, "Content-Type": "application/json" },
      signal,
      body: JSON.stringify(
        session?.refresh_token
          ? { refresh_token: session.refresh_token }
          : { data: {} },
      ),
    },
  );
  if (!response.ok)
    throw new Error(
      "Couldn’t connect securely. Try again or reset the connection.",
    );
  const body = await response.json();
  if (
    typeof body.access_token !== "string" ||
    typeof body.refresh_token !== "string" ||
    typeof body.expires_in !== "number"
  )
    throw new Error("Sign-in returned an invalid session.");
  const next = {
    access_token: body.access_token,
    refresh_token: body.refresh_token,
    expires_at: Date.now() / 1000 + body.expires_in,
  };
  if (signal.aborted) throw new Error("Cancelled");
  await vault.write(JSON.stringify(next), version, signal);
  return next.access_token;
}
export async function resetConnection() {
  await vault.reset();
}
export async function requestReply(
  request: ChatRequest,
  signal: AbortSignal,
): Promise<ChatReply> {
  if (!companionConfigured)
    throw new Error(
      "Yunomi’s AI connection isn’t configured yet. Your journal is still saved locally.",
    );
  const token = await accessToken(signal);
  if (signal.aborted) throw new Error("Cancelled");
  const response = await fetch(`${backend.replace(/\/$/, "")}/chat`, {
    method: "POST",
    signal,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  });
  if (!response.ok) {
    if (response.status === 401) {
      await resetConnection();
      throw new Error("Your session expired. Retry to reconnect securely.");
    }
    if (response.status === 429)
      throw new Error(
        "Please pause a moment, then try again. Yunomi has a request limit.",
      );
    throw new Error(
      "Yunomi couldn’t reply right now. Check your connection and try again.",
    );
  }
  const body = await response.json();
  const reply = validateReply(body);
  if (body.source !== "ai" && body.source !== "safety")
    throw new Error("Invalid server reply");
  return { ...reply, source: body.source };
}
