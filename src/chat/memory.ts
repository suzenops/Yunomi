export interface MemoryStorage {
  getItemAsync(key: string): Promise<string | null>;
  setItemAsync(key: string, value: string): Promise<void>;
  deleteItemAsync(key: string): Promise<void>;
}
const KEY = "yunomi.memory";
export async function loadMemory(storage: MemoryStorage) {
  const value = await storage.getItemAsync(KEY);
  if (value !== null && value.length > 500)
    throw new Error(
      "Saved memory could not be read. Forget it before continuing.",
    );
  return value;
}
export async function saveMemory(storage: MemoryStorage, value: string) {
  const note = value.trim();
  if (note.length > 500) throw new Error("Use no more than 500 characters.");
  if (!note) await storage.deleteItemAsync(KEY);
  else await storage.setItemAsync(KEY, note);
}
export async function forgetMemory(storage: MemoryStorage) {
  await storage.deleteItemAsync(KEY);
}
