import test from "node:test";
import assert from "node:assert/strict";
import {
  connectionConfig,
  httpsOrigin,
} from "../src/services/connectionConfig.ts";
import {
  createCompanionClient,
  ConnectionError,
} from "../src/services/companionClient.ts";
import { createSessionVault } from "../src/services/sessionVault.ts";
import {
  liveDependencies,
  makeHandler,
  type Config,
} from "../server/src/service.ts";
import {
  completeTurn,
  emptyConversation,
  prepareTurn,
} from "../src/chat/flow.ts";
const config = connectionConfig({
  backend: "https://backend.example/",
  auth: "https://auth.example/",
  publicKey: "public-test-key",
});
const request = {
  consent: true as const,
  path: "listen" as const,
  messages: [{ role: "user" as const, text: "I finished a short walk." }],
};
const reply = {
  reply: "You made time for that walk. How was it?",
  safety: "none",
  source: "ai",
};
const signal = () => new AbortController().signal;
function credentials(initial: string | null = null) {
  let stored = initial;
  return {
    vault: createSessionVault({
      read: async () => stored,
      write: async (v) => {
        stored = v;
      },
      remove: async () => {
        stored = null;
      },
    }),
    stored: () => stored,
  };
}
const session = (token = "session-token") => ({
  access_token: token,
  refresh_token: "refresh-token",
  expires_in: 3600,
});

test("configuration normalizes HTTPS origins, reports all missing fields and supports only safe URL shapes", () => {
  assert.equal(
    httpsOrigin("  https://backend.example/ "),
    "https://backend.example",
  );
  for (const url of [
    "http://backend.example",
    "https://user:pass@backend.example",
    "https://backend.example/chat",
    "https://backend.example/?key=secret",
    "https://backend.example/#fragment",
    "invalid",
  ])
    assert.equal(httpsOrigin(url), null);
  assert.equal(connectionConfig({}).issues.length, 3);
  assert.match(
    connectionConfig({ backend: "http://localhost:8787" }).issues[0],
    /HTTPS tunnel/,
  );
  assert.deepEqual(config.issues, []);
});
test("legacy public-key spelling works with migration guidance; conflicting or secret keys fail closed", () => {
  const legacy = connectionConfig({
    backend: config.backend,
    auth: config.auth,
    legacyPublicKey: " old-key ",
  });
  assert.equal(legacy.publicKey, "old-key");
  assert.equal(legacy.issues.length, 0);
  assert.equal(legacy.warnings.length, 1);
  assert.ok(
    connectionConfig({ publicKey: "one", legacyPublicKey: "two" }).issues.some(
      (v) => v.includes("conflict"),
    ),
  );
  assert.ok(
    connectionConfig({ publicKey: "sb_secret_not-public" }).issues.some((v) =>
      v.includes("never a secret"),
    ),
  );
});
test("missing configuration makes no authentication/backend requests and identifies the variable", async () => {
  const client = createCompanionClient(
    connectionConfig({}),
    credentials().vault,
    async () => {
      throw new Error("Must not fetch");
    },
  );
  await assert.rejects(
    client.requestReply(request, signal()),
    (e) =>
      e instanceof ConnectionError &&
      e.kind === "configuration" &&
      e.message.includes("EXPO_PUBLIC_COMPANION_URL"),
  );
});
test("anonymous signup, session authorization, OpenAI structured replies and next-turn context compose end to end (stub transports)", async () => {
  const storage = credentials();
  const providerInputs: unknown[] = [];
  const serverConfig: Config = {
    apiKey: "server-only-fixture",
    model: "test-model",
    supabaseUrl: config.auth,
    anonKey: config.publicKey,
    maxDaily: 100,
  };
  const backend = makeHandler(
    liveDependencies(serverConfig, async (url, init) => {
      const endpoint = String(url);
      const headers = init?.headers as Record<string, string>;
      if (endpoint.endsWith("/auth/v1/user")) {
        assert.equal(headers.apikey, config.publicKey);
        assert.equal(headers.Authorization, "Bearer session-token");
        return Response.json({ id: "00000000-0000-0000-0000-000000000001" });
      }
      assert.equal(headers.Authorization, "Bearer server-only-fixture");
      if (endpoint.endsWith("/moderations"))
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
      assert.equal(endpoint, "https://api.openai.com/v1/responses");
      const body = JSON.parse(init?.body as string);
      assert.equal(body.store, false);
      providerInputs.push(body.input);
      return Response.json({
        status: "completed",
        output: [
          {
            content: [
              {
                type: "output_text",
                text: JSON.stringify({ reply: reply.reply, safety: "none" }),
              },
            ],
          },
        ],
      });
    }),
  );
  let signups = 0;
  const client = createCompanionClient(
    config,
    storage.vault,
    async (url, init) => {
      if (String(url).endsWith("/signup")) {
        signups++;
        assert.equal(
          (init?.headers as Record<string, string>).apikey,
          config.publicKey,
        );
        assert.deepEqual(JSON.parse(init?.body as string), { data: {} });
        return Response.json(session());
      }
      assert.equal(String(url), "https://backend.example/chat");
      assert.doesNotMatch(init?.body as string, /server-only-fixture/);
      return backend(new Request(String(url), init));
    },
  );
  let state = emptyConversation();
  const turn = prepareTurn(state, {
    id: "first",
    text: request.messages[0].text,
    consent: true,
    path: "listen",
  });
  state = { ...state, pending: turn };
  state = completeTurn(
    state,
    turn,
    await client.requestReply(turn.request, signal()),
    state.generation,
  );
  const next = prepareTurn(state, {
    id: "second",
    text: "What did I do?",
    consent: true,
    path: "listen",
  });
  assert.deepEqual(await client.requestReply(next.request, signal()), reply);
  assert.equal(signups, 1);
  assert.ok(storage.stored());
  assert.equal(next.request.messages.length, 3);
  assert.match(JSON.stringify(providerInputs[1]), /finished a short walk/);
});
test("expired credentials refresh and backend 401 retries only once with a renewed session", async () => {
  const storage = credentials(
    JSON.stringify({
      access_token: "old",
      refresh_token: "refresh",
      expires_at: Date.now() / 1000 + 3600,
    }),
  );
  const calls: string[] = [];
  const client = createCompanionClient(
    config,
    storage.vault,
    async (url, init) => {
      calls.push(String(url));
      if (String(url).includes("grant_type=refresh_token"))
        return Response.json(session("renewed"));
      const token = (init?.headers as Record<string, string>).Authorization;
      return token === "Bearer old"
        ? Response.json({ code: "auth_failed" }, { status: 401 })
        : Response.json(reply);
    },
  );
  assert.deepEqual(await client.requestReply(request, signal()), reply);
  assert.equal(calls.filter((v) => v.endsWith("/chat")).length, 2);
  assert.equal(calls.filter((v) => v.includes("refresh_token")).length, 1);
});
test("invalid refresh credential creates a new anonymous identity, but an auth outage never clears the old session", async () => {
  const expired = JSON.stringify({
    access_token: "old",
    refresh_token: "refresh",
    expires_at: 1,
  });
  const storage = credentials(expired);
  const client = createCompanionClient(config, storage.vault, async (url) => {
    if (String(url).includes("refresh_token"))
      return Response.json({}, { status: 400 });
    if (String(url).endsWith("/signup")) return Response.json(session());
    return Response.json(reply);
  });
  await client.requestReply(request, signal());
  assert.notEqual(storage.stored(), expired);
  const outage = credentials(expired);
  const unavailable = createCompanionClient(config, outage.vault, async () =>
    Response.json({}, { status: 503 }),
  );
  await assert.rejects(
    unavailable.requestReply(request, signal()),
    /Supabase sign-in is unavailable/,
  );
  assert.equal(outage.stored(), expired);
});
test("missing anonymous auth, transport, backend and provider failures are distinct and do not echo server secrets", async () => {
  const valid = JSON.stringify({
    access_token: "token",
    refresh_token: "refresh",
    expires_at: Date.now() / 1000 + 3600,
  });
  const denied = createCompanionClient(config, credentials().vault, async () =>
    Response.json({ error: "SECRET" }, { status: 422 }),
  );
  await assert.rejects(
    denied.requestReply(request, signal()),
    /enable anonymous sign-ins/,
  );
  for (const [status, code, kind, fragment] of [
    [502, "provider_auth", "provider", "OPENAI_API_KEY"],
    [502, "provider_limit", "provider", "quota"],
    [503, "auth_unavailable", "authentication", "Supabase"],
    [500, "backend_unavailable", "backend", "HTTP 500"],
    [429, "rate_limited", "rate_limit", "limit"],
  ] as const) {
    const client = createCompanionClient(
      config,
      credentials(valid).vault,
      async () => Response.json({ code, error: "SECRET" }, { status }),
    );
    await assert.rejects(
      client.requestReply(request, signal()),
      (e) =>
        e instanceof ConnectionError &&
        e.kind === kind &&
        e.message.includes(fragment) &&
        !e.message.includes("SECRET"),
    );
  }
  const offline = createCompanionClient(
    config,
    credentials(valid).vault,
    async () => {
      throw new Error("SECRET");
    },
  );
  await assert.rejects(
    offline.requestReply(request, signal()),
    (e) => e instanceof ConnectionError && e.kind === "network",
  );
});
test("aborting/resetting while authentication is pending cannot save a late session", async () => {
  const storage = credentials();
  let release!: () => void;
  const ready = new Promise<void>((resolve) => {
    release = resolve;
  });
  let started!: () => void;
  const entered = new Promise<void>((resolve) => {
    started = resolve;
  });
  const client = createCompanionClient(config, storage.vault, async () => {
    started();
    await ready;
    return Response.json(session());
  });
  const abort = new AbortController();
  const result = client.requestReply(request, abort.signal);
  await entered;
  await client.resetConnection();
  abort.abort();
  release();
  await assert.rejects(result, /Cancelled/);
  assert.equal(storage.stored(), null);
});
test("malformed backend reply and repeated session rejection are actionable rather than success", async () => {
  const client = createCompanionClient(
    config,
    credentials().vault,
    async (url) =>
      String(url).includes("auth/v1")
        ? Response.json(session())
        : Response.json({ reply: "synthetic", source: "other" }),
  );
  await assert.rejects(client.requestReply(request, signal()), /invalid reply/);
  let attempts = 0;
  const rejected = createCompanionClient(
    config,
    credentials().vault,
    async (url) => {
      if (String(url).includes("auth/v1")) return Response.json(session());
      attempts++;
      return Response.json({ code: "auth_failed" }, { status: 401 });
    },
  );
  await assert.rejects(
    rejected.requestReply(request, signal()),
    /same Supabase project/,
  );
  assert.equal(attempts, 2);
});

test("a service-role JWT is rejected as public Expo configuration", () => {
  const jwt = `header.${btoa(JSON.stringify({ role: "service_role" }))}.signature`;
  assert.ok(
    connectionConfig({
      backend: config.backend,
      auth: config.auth,
      publicKey: jwt,
    }).issues.some((v) => v.includes("never a secret")),
  );
});

test("unknown server error codes and non-JSON proxy errors stay backend failures", async () => {
  const valid = JSON.stringify({
    access_token: "token",
    refresh_token: "refresh",
    expires_at: Date.now() / 1000 + 3600,
  });
  for (const response of [
    Response.json({ code: "__proto__" }, { status: 500 }),
    new Response("<html>proxy error</html>", { status: 503 }),
  ]) {
    const client = createCompanionClient(
      config,
      credentials(valid).vault,
      async () => response,
    );
    await assert.rejects(
      client.requestReply(request, signal()),
      (e) => e instanceof ConnectionError && e.kind === "backend",
    );
  }
});
