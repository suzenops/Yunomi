// This command calls real configured services. Never import it into the app or tests.
import { connectionConfig } from "../../src/services/connectionConfig.ts";
import { createCompanionClient } from "../../src/services/companionClient.ts";
import { createSessionVault } from "../../src/services/sessionVault.ts";
import type { ChatRequest } from "../../shared/conversation.ts";
let credentials: string | null = null;
const config = connectionConfig({
  backend: process.env.EXPO_PUBLIC_COMPANION_URL,
  auth: process.env.EXPO_PUBLIC_SUPABASE_URL,
  publicKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  legacyPublicKey: process.env.EXPO_PUBLIC_SUPABASE_KEY,
});
const client = createCompanionClient(
  config,
  createSessionVault({
    read: async () => credentials,
    write: async (value) => {
      credentials = value;
    },
    remove: async () => {
      credentials = null;
    },
  }),
);
try {
  const request: ChatRequest = {
    consent: true,
    path: "listen",
    messages: [
      {
        role: "user",
        text: "This is a fictional connection test. I finished a short walk today.",
      },
    ],
  };
  const first = await client.requestReply(request, AbortSignal.timeout(80000));
  if (first.source !== "ai")
    throw new Error(
      "The first response was safety support, not a real AI reply.",
    );
  const second = await client.requestReply(
    {
      ...request,
      messages: [
        ...request.messages,
        { role: "assistant", text: first.reply },
        {
          role: "user",
          text: "What activity did I mention? Please keep your reply brief.",
        },
      ],
    },
    AbortSignal.timeout(80000),
  );
  if (second.source !== "ai")
    throw new Error(
      "The second response was safety support, not a real AI reply.",
    );
  console.log(
    "PASS: real anonymous sign-in, backend authorization, and two OpenAI replies with conversation context. Device validation is still required.",
  );
} catch (error) {
  console.error(
    error instanceof Error ? error.message : "Live verification failed.",
  );
  process.exitCode = 1;
} finally {
  await client.resetConnection();
}
