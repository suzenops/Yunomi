import test from "node:test";
import assert from "node:assert/strict";
import { liveDependencies, makeHandler, type Config } from "../src/service.ts";
import { companionInstructions, providerInput } from "../src/prompt.ts";
import { urgentReply, type ChatRequest } from "../../shared/conversation.ts";
const body: ChatRequest = {
  consent: true,
  path: "listen",
  messages: [
    { role: "user", text: "I got through my work today, but feel drained." },
  ],
};
const answer = {
  reply:
    "That sounds like a lot to carry. What would you like me to understand?",
  safety: "none" as const,
  source: "ai" as const,
};
function request(value: unknown = body, token = "valid") {
  return new Request("https://backend.example/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(value),
  });
}
test("authentication and consent are required before invoking provider", async () => {
  let calls = 0;
  const handler = makeHandler({
    authenticate: async (token) => (token === "valid" ? "user" : null),
    generate: async () => {
      calls++;
      return answer;
    },
  });
  assert.equal((await handler(request(body, "invalid"))).status, 401);
  assert.equal(
    (await handler(request({ ...body, consent: false }))).status,
    400,
  );
  assert.equal(
    (
      await handler(
        request({
          ...body,
          journal: { date: "2026-10-09", mood: "low", note: "Private" },
        }),
      )
    ).status,
    400,
  );
  assert.equal(
    (await handler(request({ ...body, memory: "Private" }))).status,
    400,
  );
  assert.equal(calls, 0);
});
test("two-way flow and failures return safe, retryable errors without content", async () => {
  const handler = makeHandler({
    authenticate: async () => "user",
    generate: async (input) => {
      assert.equal(input.path, "listen");
      return answer;
    },
  });
  const response = await handler(request());
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), answer);
  const failed = makeHandler({
    authenticate: async () => "user",
    generate: async () => {
      throw new Error("SECRET provider details");
    },
  });
  const error = await failed(request());
  assert.equal(error.status, 502);
  assert.equal((await error.text()).includes("SECRET"), false);
});
test("immediate danger gets real-world safety support without model inference", async () => {
  let calls = 0;
  const handler = makeHandler({
    authenticate: async () => "user",
    generate: async () => {
      calls++;
      return answer;
    },
  });
  const response = await handler(
    request({
      ...body,
      messages: [{ role: "user", text: "I am about to kill myself" }],
    }),
  );
  assert.deepEqual(await response.json(), urgentReply);
  assert.equal(calls, 0);
});
test("rate and payload limits protect the endpoint", async () => {
  const handler = makeHandler({
    authenticate: async () => "user",
    generate: async () => answer,
    now: () => 10000,
  });
  for (let i = 0; i < 10; i++)
    assert.equal((await handler(request())).status, 200);
  assert.equal((await handler(request())).status, 429);
  const large = makeHandler({
    authenticate: async () => "user",
    generate: async () => answer,
  });
  assert.equal((await large(request({ data: "x".repeat(25000) }))).status, 413);
});
test("concurrent turns are rejected while the first is pending", async () => {
  let release: (() => void) | undefined;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const handler = makeHandler({
    authenticate: async () => "user",
    generate: async () => {
      await gate;
      return answer;
    },
  });
  const first = handler(request());
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal((await handler(request())).status, 429);
  release?.();
  assert.equal((await first).status, 200);
});
const config: Config = {
  apiKey: "server-only-test-key",
  model: "test-model",
  supabaseUrl: "https://auth.example",
  anonKey: "public-key",
  maxDaily: 1000,
};
test("provider calls use server key, store:false, approved context, and output moderation", async () => {
  const calls: { url: string; options: RequestInit }[] = [];
  const fetcher: typeof fetch = async (input, options) => {
    calls.push({ url: String(input), options: options! });
    const url = String(input);
    if (url.endsWith("/moderations"))
      return Response.json({
        results: [
          {
            flagged: false,
            categories: {
              "self-harm/intent": false,
              "self-harm/instructions": false,
            },
          },
        ],
      });
    return Response.json({
      status: "completed",
      output: [
        { content: [{ type: "output_text", text: JSON.stringify(answer) }] },
      ],
    });
  };
  const deps = liveDependencies(config, fetcher);
  assert.deepEqual(await deps.generate(body, "user-id"), answer);
  assert.equal(calls.length, 3);
  const providerCall = calls[1];
  const payload = JSON.parse(providerCall.options.body as string);
  assert.equal(payload.store, false);
  assert.equal(payload.previous_response_id, undefined);
  assert.equal(payload.instructions, companionInstructions);
  assert.equal(payload.text.format.strict, true);
  assert.deepEqual(payload.input, providerInput(body));
  assert.equal(
    (providerCall.options.headers as Record<string, string>).Authorization,
    "Bearer server-only-test-key",
  );
});
test("moderation outages fail closed and urgent flags skip generation", async () => {
  const unavailable = liveDependencies(config, async () =>
    Response.json({ results: [] }),
  );
  await assert.rejects(unavailable.generate(body, "user"));
  let calls = 0;
  const urgent = liveDependencies(config, async () => {
    calls++;
    return Response.json({
      results: [
        {
          categories: {
            "self-harm/intent": true,
            "self-harm/instructions": false,
          },
        },
      ],
    });
  });
  assert.deepEqual(await urgent.generate(body, "user"), urgentReply);
  assert.equal(calls, 1);
});
test("backend validates sessions with trusted auth origin", async () => {
  let seen = "";
  const deps = liveDependencies(config, async (input, options) => {
    seen = String(input);
    assert.equal(
      (options?.headers as Record<string, string>).Authorization,
      "Bearer session-token",
    );
    return Response.json({ id: "00000000-0000-0000-0000-000000000001" });
  });
  assert.equal(
    await deps.authenticate("session-token"),
    "00000000-0000-0000-0000-000000000001",
  );
  assert.equal(seen, "https://auth.example/auth/v1/user");
});

test("ingress limits anonymous traffic before authentication", async () => {
  const { makeIngressLimiter } = await import("../src/ingress.ts");
  let now = 1000;
  const allow = makeIngressLimiter(() => now);
  for (let i = 0; i < 30; i++) assert.equal(allow("one-address"), true);
  assert.equal(allow("one-address"), false);
  now += 60001;
  assert.equal(allow("one-address"), true);
});

test("provider credential, quota, model, and availability errors have safe machine-readable codes", async () => {
  for (const [status, code] of [
    [401, "provider_auth"],
    [403, "provider_auth"],
    [429, "provider_limit"],
    [404, "provider_configuration"],
    [500, "provider_unavailable"],
  ] as const) {
    const live = liveDependencies(config, async () =>
      Response.json({ error: "PRIVATE KEY OR PROVIDER DETAILS" }, { status }),
    );
    const handler = makeHandler({
      authenticate: async () => "user",
      generate: live.generate,
    });
    const response = await handler(request());
    assert.equal(response.status, 502);
    const body = await response.json();
    assert.equal(body.code, code);
    assert.doesNotMatch(JSON.stringify(body), /PRIVATE/);
  }
});
test("Supabase outages differ from expired sessions and do not call OpenAI", async () => {
  const invalid = makeHandler({
    authenticate: async () => null,
    generate: async () => {
      throw new Error("Must not generate");
    },
  });
  assert.equal((await (await invalid(request())).json()).code, "auth_failed");
  const failed = makeHandler({
    authenticate: async () => {
      throw new Error("PRIVATE");
    },
    generate: async () => {
      throw new Error("Must not generate");
    },
  });
  const response = await failed(request());
  assert.equal(response.status, 503);
  assert.equal((await response.json()).code, "auth_unavailable");
});
