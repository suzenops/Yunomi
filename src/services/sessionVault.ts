export type CredentialStorage = {
  read: () => Promise<string | null>;
  write: (value: string) => Promise<void>;
  remove: () => Promise<void>;
};
export function createSessionVault(storage: CredentialStorage) {
  let revision = 0;
  let queue: Promise<unknown> = Promise.resolve();
  function schedule<T>(operation: () => Promise<T>): Promise<T> {
    const result = queue.then(operation);
    queue = result.catch(() => {});
    return result;
  }
  return {
    version: () => revision,
    read: () => schedule(storage.read),
    write(value: string, expected: number, signal: AbortSignal) {
      return schedule(async () => {
        if (expected !== revision || signal.aborted)
          throw new Error("Cancelled");
        await storage.write(value);
      });
    },
    reset() {
      revision++;
      return schedule(storage.remove);
    },
  };
}
