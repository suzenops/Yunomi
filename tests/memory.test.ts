import test from "node:test";
import assert from "node:assert/strict";
import { loadMemory, saveMemory, forgetMemory } from "../src/chat/memory.ts";
test("memory stores only user-selected text and forget removes it", async () => {
  const items = new Map<string, string>();
  const storage = {
    getItemAsync: async (key: string) => items.get(key) ?? null,
    setItemAsync: async (key: string, value: string) => {
      items.set(key, value);
    },
    deleteItemAsync: async (key: string) => {
      items.delete(key);
    },
  };
  assert.equal(await loadMemory(storage), null);
  await saveMemory(storage, "  Prefer listening  ");
  assert.equal(await loadMemory(storage), "Prefer listening");
  await assert.rejects(saveMemory(storage, "x".repeat(501)));
  assert.equal(await loadMemory(storage), "Prefer listening");
  await forgetMemory(storage);
  assert.equal(await loadMemory(storage), null);
  await saveMemory(storage, "");
  assert.equal(items.size, 0);
});
test("memory storage failures surface without claiming deletion or saving succeeded", async () => {
  const fail = async () => {
    throw new Error("storage unavailable");
  };
  const storage = {
    getItemAsync: fail,
    setItemAsync: fail,
    deleteItemAsync: fail,
  };
  await assert.rejects(loadMemory(storage));
  await assert.rejects(saveMemory(storage, "Preference"));
  await assert.rejects(forgetMemory(storage));
});
