import * as SecureStore from "expo-secure-store";
import { createSessionVault } from "./sessionVault";
import { connectionConfig } from "./connectionConfig";
import { createCompanionClient } from "./companionClient";
const sessionKey = "yunomi.auth.v1";
const vault = createSessionVault({
  read: () => SecureStore.getItemAsync(sessionKey),
  write: (value) => SecureStore.setItemAsync(sessionKey, value),
  remove: () => SecureStore.deleteItemAsync(sessionKey),
});
// Direct property access is required for Expo to inline EXPO_PUBLIC variables.
const config = connectionConfig({
  backend: process.env.EXPO_PUBLIC_COMPANION_URL,
  auth: process.env.EXPO_PUBLIC_SUPABASE_URL,
  publicKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  legacyPublicKey: process.env.EXPO_PUBLIC_SUPABASE_KEY,
});
export const companionConfigured = config.issues.length === 0;
export const companionConfigurationIssues = config.issues;
export const companionConfigurationWarnings = config.warnings;
const client = createCompanionClient(config, vault);
export const resetConnection = client.resetConnection;
export const requestReply = client.requestReply;
