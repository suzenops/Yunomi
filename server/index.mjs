import { createServer } from "node:http";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import {
  authorize,
  generateReply,
  HttpError,
  validateRequest,
} from "./companion.mjs";

export function makeServer({
  apiKey,
  tokenHashes,
  model,
  reply = generateReply,
  rateLimit = 20,
}) {
  if (
    !apiKey ||
    !tokenHashes?.length ||
    tokenHashes.some((h) => !/^[a-f0-9]{64}$/.test(h))
  )
    throw new Error(
      "Set server-only YUNOMI_OPENAI_API_KEY and YUNOMI_ACCESS_TOKEN_HASHES.",
    );
  const rates = new Map();
  let active = 0;
  return createServer(
    { requestTimeout: 10000, headersTimeout: 10000, maxHeaderSize: 8192 },
    async (req, res) => {
      const send = (status, body) => {
        if (!res.destroyed)
          res
            .writeHead(status, {
              "Content-Type": "application/json",
              "Cache-Control": "no-store",
              "X-Content-Type-Options": "nosniff",
            })
            .end(JSON.stringify(body));
      };
      if (req.method === "GET" && req.url === "/health")
        return send(200, {
          status: "configured",
          deviceValidation: "required",
        });
      if (req.method !== "POST" || req.url !== "/chat")
        return send(404, { error: "Not found." });
      if (!authorize(req.headers.authorization, tokenHashes))
        return send(401, { error: "Unauthorized." });
      if (!req.headers["content-type"]?.startsWith("application/json"))
        return send(415, { error: "JSON required." });
      const now = Date.now();
      for (const [key, value] of rates)
        if (value.expires <= now) rates.delete(key);
      const key = createHash("sha256")
        .update(req.headers.authorization)
        .digest("hex");
      const rate = rates.get(key) ?? { count: 0, expires: now + 60000 };
      if (rate.count >= rateLimit || active >= 8)
        return send(429, { error: "Please wait before retrying." });
      rate.count++;
      rates.set(key, rate);
      active++;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 35000);
      const disconnected = () => {
        if (!res.writableEnded) controller.abort();
      };
      res.on("close", disconnected);
      try {
        let length = 0;
        const chunks = [];
        for await (const chunk of req) {
          length += chunk.length;
          if (length > 128000) throw new HttpError(413, "Request too large.");
          chunks.push(chunk);
        }
        let input;
        try {
          input = JSON.parse(Buffer.concat(chunks).toString("utf8"));
        } catch {
          throw new HttpError(400, "Invalid JSON.");
        }
        const request = validateRequest(input);
        const result = await reply(request, {
          apiKey,
          model,
          signal: controller.signal,
        });
        send(200, { reply: result });
      } catch (error) {
        send(error instanceof HttpError ? error.status : 503, {
          error:
            error instanceof HttpError
              ? error.message
              : "Yunomi is unavailable. Please retry.",
        });
      } finally {
        clearTimeout(timeout);
        active--;
        res.off("close", disconnected);
      }
    },
  );
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const server = makeServer({
    apiKey: process.env.YUNOMI_OPENAI_API_KEY,
    tokenHashes: process.env.YUNOMI_ACCESS_TOKEN_HASHES?.split(",").map((s) =>
      s.trim(),
    ),
    model: process.env.YUNOMI_MODEL,
  });
  server.listen(
    Number(process.env.PORT ?? 3000),
    process.env.HOST ?? "127.0.0.1",
    () =>
      console.log(
        "Yunomi backend listening. Put behind HTTPS; no conversation logging enabled.",
      ),
  );
}
