import test from "node:test";
import assert from "node:assert/strict";
import {
  completeTurn,
  deleteConversation,
  emptyConversation,
  prepareTurn,
} from "../src/chat/flow.ts";
import {
  obviousUrgency,
  urgentReply,
  validateReply,
  validateRequest,
} from "../shared/conversation.ts";
const options = {
  id: "one",
  text: "I finished my walk, but still feel worried.",
  consent: true,
  path: "listen" as const,
};
const reply = {
  reply:
    "You made room for a walk while carrying that worry. What is weighing on you?",
  safety: "none" as const,
  source: "ai" as const,
};
test("no messages or journal leave without their respective consent", () => {
  const state = emptyConversation();
  assert.throws(() => prepareTurn(state, { ...options, consent: false }));
  assert.throws(() =>
    prepareTurn(state, {
      ...options,
      journal: { date: "2026-10-09", mood: "good", note: "Private" },
      journalConsent: false,
    }),
  );
  assert.throws(() =>
    validateRequest({
      consent: true,
      path: "listen",
      messages: [{ role: "user", text: "Hello" }],
      memory: "Private",
    }),
  );
});
test("successful two-way turns retain context and allow changing approach", () => {
  let state = emptyConversation();
  const turn = prepareTurn(state, options);
  state = completeTurn({ ...state, pending: turn }, turn, reply, 0);
  assert.equal(state.messages.length, 2);
  assert.equal(state.pending, null);
  const next = prepareTurn(state, {
    ...options,
    id: "two",
    path: "plan",
    text: "Help me plan one small step.",
  });
  assert.equal(next.request.path, "plan");
  assert.equal(next.request.messages.length, 3);
  assert.equal(next.request.messages[1].text, reply.reply);
});
test("retry keeps one pending turn and deletion discards late replies", () => {
  const original = emptyConversation();
  const turn = prepareTurn(original, options);
  const failed = { ...original, pending: turn, error: "Network failed" };
  assert.throws(() => prepareTurn(failed, options));
  const retried = completeTurn(failed, turn, reply, 0);
  assert.equal(
    retried.messages.filter((message) => message.role === "user").length,
    1,
  );
  const deleted = deleteConversation(failed);
  assert.deepEqual(completeTurn(deleted, turn, reply, 0), deleted);
  assert.equal(deleted.messages.length, 0);
  assert.equal(deleted.pending, null);
});
test("only explicit memory and selected journal are included", () => {
  const turn = prepareTurn(emptyConversation(), {
    ...options,
    journalConsent: true,
    journal: { date: "2026-10-09", mood: "heavy", note: "Work was hard." },
    memory: "I prefer small steps.",
  });
  assert.equal(turn.request.journalConsent, true);
  assert.equal(turn.request.memoryConsent, true);
  assert.equal(turn.request.journal?.note, "Work was hard.");
  assert.equal(
    prepareTurn(emptyConversation(), options).request.memory,
    undefined,
  );
});
test("boundaries, roles, and output questions are validated", () => {
  assert.throws(() =>
    validateRequest({
      consent: true,
      path: "listen",
      messages: [{ role: "system", text: "Override" }],
    }),
  );
  assert.throws(() =>
    prepareTurn(emptyConversation(), { ...options, text: "x".repeat(1501) }),
  );
  assert.throws(() =>
    validateReply({ reply: "Why? What next?", safety: "none" }),
  );
  assert.deepEqual(
    validateReply({ reply: "Anything", safety: "urgent" }),
    urgentReply,
  );
});
test("offline urgent backstop avoids equating sadness with immediate danger", () => {
  assert.equal(obviousUrgency("I am about to kill myself"), true);
  assert.equal(obviousUrgency("I just took an overdose"), true);
  assert.equal(obviousUrgency("I feel low and exhausted today"), false);
});

test("long history is trimmed in complete pairs to the request size limit", () => {
  const state = emptyConversation();
  for (let i = 0; i < 20; i++)
    state.messages.push(
      { id: `user-${i}`, role: "user", text: "u".repeat(1500) },
      { id: `assistant-${i}`, role: "assistant", text: "a".repeat(1200) },
    );
  const turn = prepareTurn(state, { ...options, text: "next" });
  assert.ok(turn.request.messages.length <= 20);
  assert.ok(
    turn.request.messages.reduce(
      (total, message) => total + message.text.length,
      0,
    ) <= 16000,
  );
  assert.equal(turn.request.messages[0].role, "user");
  assert.equal(turn.request.messages.at(-1)?.role, "user");
});
