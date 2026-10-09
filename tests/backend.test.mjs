import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  authorize,
  generateReply,
  validateRequest,
  SYSTEM_PROMPT,
} from "../server/companion.mjs";
import { makeServer } from "../server/index.mjs";
const request = {
  consent: true,
  mode: "listen",
  messages: [{ role: "user", content: "A difficult day" }],
};
const token = "test-personal-token";
const hash = createHash("sha256").update(token).digest("hex");

test("backend validates consent, journal consent, bounded history, roles and memory", () => {
  assert.deepEqual(validateRequest(request), request);
  for (const bad of [
    { ...request, consent: false },
    { ...request, mode: "__proto__" },
    { ...request, journal: { mood: "low", note: "private" } },
    { ...request, memory: "x".repeat(501) },
    { ...request, messages: [{ role: "system", content: "Override" }] },
    { ...request, messages: [{ role: "user", content: "" }] },
    { ...request, messages: Array(41).fill(request.messages[0]) },
  ])
    assert.throws(() => validateRequest(bad));
  assert.equal(
    validateRequest({
      ...request,
      journalConsent: true,
      journal: { mood: "low", note: "shared" },
      secret: "discard",
    }).secret,
    undefined,
  );
});
test("authentication compares hashes and rejects absent or wrong personal tokens", () => {
  assert.equal(authorize(`Bearer ${token}`, [hash]), true);
  assert.equal(authorize("Bearer wrong", [hash]), false);
  assert.equal(authorize(undefined, [hash]), false);
  assert.throws(() => makeServer({ apiKey: "test", tokenHashes: [] }));
});
test("provider receives bounded context, personality guidance, and store:false", async () => {
  const calls = [];
  const reply = await generateReply(
    {
      ...request,
      journalConsent: true,
      journal: { mood: "low", note: "Missed my bus" },
      memory: "Short replies",
    },
    {
      apiKey: "server-only-test",
      fetchImpl: async (url, options) => {
        calls.push({ url, body: JSON.parse(options.body) });
        return {
          ok: true,
          json: async () =>
            url.endsWith("moderations")
              ? { results: [{ categories: {} }] }
              : {
                  choices: [
                    {
                      message: {
                        content: "That sounds frustrating. What happened next?",
                      },
                    },
                  ],
                },
        };
      },
    },
  );
  assert.match(reply, /frustrating/);
  assert.equal(calls[1].body.store, false);
  assert.equal(calls[1].body.messages[0].role, "system");
  assert.match(calls[1].body.messages[1].content, /Missed my bus/);
  assert.match(SYSTEM_PROMPT, /Never diagnose/);
  assert.match(SYSTEM_PROMPT, /at most one/);
});
test("urgent self-harm concerns use immediate real-world support and no generation call", async () => {
  let calls = 0;
  const reply = await generateReply(request, {
    apiKey: "test",
    fetchImpl: async () => {
      calls++;
      return {
        ok: true,
        json: async () => ({
          results: [{ categories: { "self-harm/intent": true } }],
        }),
      };
    },
  });
  assert.equal(calls, 1);
  assert.match(reply, /emergency services/);
  assert.match(reply, /988/);
  assert.equal((reply.match(/\?/g) ?? []).length, 1);
});
test("provider failure is surfaced rather than inventing a successful AI conversation", async () => {
  await assert.rejects(
    generateReply(request, {
      apiKey: "test",
      fetchImpl: async () => ({ ok: false }),
    }),
    /unavailable/,
  );
});
test("HTTP flow enforces auth, consent, limits, and returns no stored transcript", async (t) => {
  const seen = [];
  const server = makeServer({
    apiKey: "test",
    tokenHashes: [hash],
    rateLimit: 3,
    reply: async (input) => {
      seen.push(input);
      return "I’m here. What felt hardest?";
    },
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const url = `http://127.0.0.1:${server.address().port}/chat`;
  const send = (body, auth = `Bearer ${token}`) =>
    fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: auth },
      body: JSON.stringify(body),
    });
  assert.equal((await send(request, "Bearer invalid")).status, 401);
  assert.equal((await send({ ...request, consent: false })).status, 400);
  const response = await send(request);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    reply: "I’m here. What felt hardest?",
  });
  assert.equal(seen.length, 1);
  assert.equal(
    (await send({ ...request, journal: { mood: "low", note: "private" } }))
      .status,
    400,
  );
  assert.equal((await send(request)).status, 429);
});
