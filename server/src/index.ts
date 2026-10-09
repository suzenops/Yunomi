import { makeIngressLimiter } from "./ingress.ts";
import { createServer } from "node:http";
import { liveDependencies, makeHandler, type Config } from "./service.ts";
const { OPENAI_API_KEY, SUPABASE_URL, SUPABASE_ANON_KEY } = process.env;
if (!OPENAI_API_KEY || !SUPABASE_URL || !SUPABASE_ANON_KEY)
  throw new Error(
    "Configure server .env: OPENAI_API_KEY, SUPABASE_URL, SUPABASE_ANON_KEY",
  );
const authUrl = new URL(SUPABASE_URL);
if (
  authUrl.protocol !== "https:" ||
  authUrl.username ||
  authUrl.password ||
  authUrl.pathname !== "/"
)
  throw new Error("SUPABASE_URL must be an HTTPS origin");
const maxDaily = Number(process.env.MAX_DAILY_REQUESTS ?? 1000);
if (!Number.isSafeInteger(maxDaily) || maxDaily < 1)
  throw new Error("Invalid daily request limit");
const config: Config = {
  apiKey: OPENAI_API_KEY,
  model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
  supabaseUrl: authUrl.origin,
  anonKey: SUPABASE_ANON_KEY,
  maxDaily,
};
const handle = makeHandler(liveDependencies(config), maxDaily);
// No body, token, prompt, response, or user identifier is logged or stored.
const ingress = makeIngressLimiter();
const server = createServer(async (incoming, outgoing) => {
  if (!ingress(incoming.socket.remoteAddress ?? "unknown")) {
    outgoing.writeHead(429, {
      "Cache-Control": "no-store",
      "Content-Type": "application/json",
    });
    outgoing.end('{"error":"Please try again later."}');
    incoming.resume();
    return;
  }
  try {
    let bytes = 0;
    const chunks: Buffer[] = [];
    for await (const chunk of incoming) {
      bytes += chunk.length;
      if (bytes > 24000) {
        outgoing.writeHead(413, { "Cache-Control": "no-store" });
        outgoing.end('{"error":"Message is too large."}');
        incoming.resume();
        return;
      }
      chunks.push(chunk);
    }
    // The path and host are fixed locally; never trust forwarded host headers.
    const request = new Request(`http://localhost${incoming.url ?? "/"}`, {
      method: incoming.method,
      headers: {
        authorization: incoming.headers.authorization ?? "",
        "content-type": incoming.headers["content-type"] ?? "",
      },
      ...(incoming.method === "POST"
        ? { body: Buffer.concat(chunks).toString("utf8") }
        : {}),
    });
    const response = await handle(request);
    outgoing.writeHead(response.status, Object.fromEntries(response.headers));
    outgoing.end(await response.text());
  } catch {
    outgoing.writeHead(500, { "Cache-Control": "no-store" });
    outgoing.end('{"error":"Request could not be completed."}');
  }
});
server.requestTimeout = 15000;
server.headersTimeout = 10000;
server.maxConnections = 100;
server.listen(
  Number(process.env.PORT ?? 8787),
  process.env.HOST ?? "127.0.0.1",
  () =>
    console.log(
      "Companion backend started; live device verification still required.",
    ),
);
