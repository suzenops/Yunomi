import test from "node:test";
import assert from "node:assert/strict";
import {
  Conversation,
  requestReply,
  type Request,
} from "../src/chat/conversation.ts";

const input = {
  text: "I finished my project",
  mode: "adapt" as const,
  consent: true,
};
test("no content is sent before explicit consent, including separate journal consent", async () => {
  let calls = 0;
  const chat = new Conversation(
    async () => {
      calls++;
      return "Hello";
    },
    () => {},
  );
  await assert.rejects(chat.send({ ...input, consent: false }));
  await assert.rejects(
    chat.send({ ...input, journal: { mood: "good", note: "private" } }),
  );
  assert.equal(calls, 0);
  assert.deepEqual(chat.state.messages, []);
});
test("ongoing turns preserve two-way context and selected path; no implicit journal/memory", async () => {
  const sent: Request[] = [];
  const chat = new Conversation(
    async (request) => {
      sent.push(request);
      return "That took effort. How did it feel?";
    },
    () => {},
  );
  await chat.send(input);
  await chat.send({ ...input, text: "I feel relieved", mode: "listen" });
  assert.equal(sent[1].messages.length, 3);
  assert.equal(sent[1].mode, "listen");
  assert.equal(sent[0].journal, undefined);
  assert.equal(sent[0].memory, undefined);
  assert.equal(chat.state.messages.length, 4);
});
test("only explicitly selected journal and memory are included", async () => {
  let captured: Request | undefined;
  const chat = new Conversation(
    async (request) => {
      captured = request;
      return "I hear you.";
    },
    () => {},
  );
  await chat.send({
    ...input,
    journal: { mood: "low", note: "Difficult commute" },
    journalConsent: true,
    memory: "  Prefer short replies  ",
  });
  assert.equal(captured?.journal?.note, "Difficult commute");
  assert.equal(captured?.journalConsent, true);
  assert.equal(captured?.memory, "Prefer short replies");
});
test("retry reuses failed turn without duplication or overlapping submissions", async () => {
  let calls = 0;
  const chat = new Conversation(
    async () => {
      if (++calls === 1) throw new Error("offline");
      return "Welcome back";
    },
    () => {},
  );
  await chat.send(input);
  assert.equal(chat.state.retry, true);
  await assert.rejects(chat.send(input));
  await chat.retry();
  assert.equal(chat.state.messages.length, 2);
  assert.equal(chat.state.error, "");
});
test("deletion aborts in-flight work and prevents late replies from restoring content", async () => {
  let resolve!: (reply: string) => void;
  let signal!: AbortSignal;
  const chat = new Conversation(
    async (_, s) => {
      signal = s;
      return new Promise((r) => {
        resolve = r;
      });
    },
    () => {},
  );
  const pending = chat.send(input);
  await chat.send(input); // Busy: no second request.
  chat.delete();
  assert.equal(signal.aborted, true);
  resolve("Late reply");
  await pending;
  assert.deepEqual(chat.state.messages, []);
  await chat.retry();
  assert.equal(chat.state.retry, false);
});
test("HTTPS and personal authentication are required before transport", async () => {
  const signal = new AbortController().signal;
  const request: Request = {
    messages: [{ role: "user", content: "Hello" }],
    mode: "adapt",
    consent: true,
  };
  await assert.rejects(
    requestReply("http://example.com", "token", request, signal),
  );
  await assert.rejects(
    requestReply("https://example.com", "", request, signal),
  );
});

test("explicitly shared journal stays in two-way context until deletion", async () => {
  const sent: Request[] = [];
  const chat = new Conversation(
    async (request) => {
      sent.push(request);
      return "I hear you.";
    },
    () => {},
  );
  await chat.send({
    ...input,
    journal: { mood: "heavy", note: "Lost my keys" },
    journalConsent: true,
  });
  await chat.send({ ...input, text: "What did I share?" });
  assert.match(sent[1].messages[0].content, /Lost my keys/);
  chat.delete();
  await chat.send(input);
  assert.doesNotMatch(JSON.stringify(sent[2]), /Lost my keys/);
});
