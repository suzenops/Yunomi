import test from "node:test";
import assert from "node:assert/strict";
import {
  createMemoryManager,
  type MemorySnapshot,
} from "../src/chat/memory.ts";
test("memory is opt-in at every launch and saved text is exactly user-controlled", async () => {
  let stored: string | null = "Previously approved detail";
  let snapshot: MemorySnapshot | undefined;
  const manager = createMemoryManager(
    {
      read: async () => stored,
      write: async (value) => {
        stored = value;
      },
      remove: async () => {
        stored = null;
      },
    },
    (value) => {
      snapshot = value;
    },
  );
  await manager.load();
  assert.equal(snapshot!.enabled, false);
  assert.equal(snapshot!.text, stored);
  await manager.save("  I prefer small steps.  ");
  assert.equal(stored, "I prefer small steps.");
  assert.equal(snapshot!.enabled, true);
  await manager.forget();
  assert.equal(stored, null);
  assert.equal(snapshot!.text, "");
  assert.equal(snapshot!.enabled, false);
});
test("forget wins over an in-flight save and never re-enables old memory", async () => {
  let stored: string | null = null;
  let snapshot: MemorySnapshot | undefined;
  let release: (() => void) | undefined;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const manager = createMemoryManager(
    {
      read: async () => stored,
      write: async (value) => {
        await gate;
        stored = value;
      },
      remove: async () => {
        stored = null;
      },
    },
    (value) => {
      snapshot = value;
    },
  );
  const saving = manager.save("Private");
  const forgetting = manager.forget();
  release?.();
  await saving;
  assert.equal(snapshot!.enabled, false);
  await forgetting;
  assert.equal(stored, null);
  assert.equal(snapshot!.text, "");
});
test("deletion failure turns sharing off and exposes a retryable error", async () => {
  let fail = true;
  let snapshot: MemorySnapshot | undefined;
  const manager = createMemoryManager(
    {
      read: async () => "Private",
      write: async () => {},
      remove: async () => {
        if (fail) throw new Error("Disk failure");
      },
    },
    (value) => {
      snapshot = value;
    },
  );
  await manager.load();
  await manager.save("Private");
  await manager.forget();
  assert.equal(snapshot!.enabled, false);
  assert.match(snapshot!.error, /couldn’t be removed/);
  fail = false;
  await manager.forget();
  assert.equal(snapshot!.text, "");
  assert.equal(snapshot!.error, "");
});
