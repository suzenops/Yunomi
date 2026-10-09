export type MemorySnapshot = {
  text: string;
  enabled: boolean;
  ready: boolean;
  error: string;
};
export type MemoryStorage = {
  read: () => Promise<string | null>;
  write: (text: string) => Promise<void>;
  remove: () => Promise<void>;
};
// Serialize storage changes and ignore superseded results (for example Save then Forget).
export function createMemoryManager(
  storage: MemoryStorage,
  changed: (snapshot: MemorySnapshot) => void,
) {
  let snapshot: MemorySnapshot = {
    text: "",
    enabled: false,
    ready: false,
    error: "",
  };
  let queue = Promise.resolve();
  let revision = 0;
  function publish(next: MemorySnapshot) {
    snapshot = next;
    changed(next);
  }
  function schedule(action: () => Promise<void>) {
    const task = queue.then(action);
    queue = task.catch(() => {});
    return task;
  }
  return {
    load() {
      const version = revision;
      return schedule(async () => {
        try {
          const text = await storage.read();
          if (version === revision)
            publish({
              text: text?.slice(0, 500) ?? "",
              enabled: false,
              ready: true,
              error: "",
            });
        } catch {
          if (version === revision)
            publish({
              ...snapshot,
              ready: true,
              error:
                "Saved memory couldn’t be opened. Memory will not be sent.",
            });
        }
      });
    },
    save(value: string) {
      const version = ++revision;
      const text = value.trim().slice(0, 500);
      publish({ ...snapshot, enabled: false, error: "" });
      return schedule(async () => {
        try {
          if (text) await storage.write(text);
          else await storage.remove();
          if (version === revision)
            publish({ text, enabled: !!text, ready: true, error: "" });
        } catch {
          if (version === revision)
            publish({
              ...snapshot,
              enabled: false,
              ready: true,
              error: "Memory couldn’t be saved. Memory is off; please retry.",
            });
        }
      });
    },
    forget() {
      const version = ++revision;
      publish({ ...snapshot, enabled: false, error: "" });
      return schedule(async () => {
        try {
          await storage.remove();
          if (version === revision)
            publish({ text: "", enabled: false, ready: true, error: "" });
        } catch {
          if (version === revision)
            publish({
              ...snapshot,
              enabled: false,
              ready: true,
              error:
                "Memory is off, but the saved copy couldn’t be removed. Please retry Forget memory.",
            });
        }
      });
    },
  };
}
