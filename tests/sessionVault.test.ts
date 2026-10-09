import test from "node:test";
import assert from "node:assert/strict";
import { createSessionVault } from "../src/services/sessionVault.ts";
test("reset rejects late auth credentials and clears an in-flight write", async () => {
  let stored: string | null = null;
  let release: (() => void) | undefined;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const vault = createSessionVault({
    read: async () => stored,
    write: async (value) => {
      await gate;
      stored = value;
    },
    remove: async () => {
      stored = null;
    },
  });
  const version = vault.version();
  const saving = vault.write(
    "credential",
    version,
    new AbortController().signal,
  );
  await new Promise((resolve) => setTimeout(resolve, 0));
  const resetting = vault.reset();
  release?.();
  await saving;
  await resetting;
  assert.equal(stored, null);
  await assert.rejects(
    vault.write("late credential", version, new AbortController().signal),
  );
  assert.equal(stored, null);
});
test("aborted auth never persists a token", async () => {
  let writes = 0;
  const vault = createSessionVault({
    read: async () => null,
    write: async () => {
      writes++;
    },
    remove: async () => {},
  });
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(
    vault.write("credential", vault.version(), controller.signal),
  );
  assert.equal(writes, 0);
});
