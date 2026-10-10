export type ConnectionConfig = {
  backend: string;
  auth: string;
  publicKey: string;
  issues: string[];
  warnings: string[];
};
// Accept origins only: paths, credentials and query strings can send tokens to the wrong endpoint.
export function httpsOrigin(value: string): string | null {
  try {
    const url = new URL(value.trim());
    return url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      url.pathname === "/" &&
      !url.search &&
      !url.hash
      ? url.origin
      : null;
  } catch {
    return null;
  }
}
export function connectionConfig(values: {
  backend?: string;
  auth?: string;
  publicKey?: string;
  legacyPublicKey?: string;
}): ConnectionConfig {
  const issues: string[] = [];
  const warnings: string[] = [];
  const backend = httpsOrigin(values.backend ?? "");
  const auth = httpsOrigin(values.auth ?? "");
  if (!values.backend?.trim())
    issues.push("Set EXPO_PUBLIC_COMPANION_URL in the root .env.");
  else if (!backend)
    issues.push(
      "EXPO_PUBLIC_COMPANION_URL must be an HTTPS origin with no path. For a local backend, use an HTTPS tunnel to port 8787; a phone cannot use your computer’s localhost.",
    );
  if (!values.auth?.trim())
    issues.push(
      "Set EXPO_PUBLIC_SUPABASE_URL to your Supabase project’s HTTPS origin.",
    );
  else if (!auth)
    issues.push(
      "EXPO_PUBLIC_SUPABASE_URL must be an HTTPS origin with no path.",
    );
  const canonical = values.publicKey?.trim() ?? "";
  const legacy = values.legacyPublicKey?.trim() ?? "";
  const publicKey = canonical || legacy;
  if (!publicKey)
    issues.push(
      "Set EXPO_PUBLIC_SUPABASE_ANON_KEY to the public anon or publishable key from the same Supabase project as the backend.",
    );
  if (canonical && legacy && canonical !== legacy)
    issues.push(
      "EXPO_PUBLIC_SUPABASE_ANON_KEY and the older EXPO_PUBLIC_SUPABASE_KEY conflict. Remove the older variable.",
    );
  if (!canonical && legacy)
    warnings.push(
      "EXPO_PUBLIC_SUPABASE_KEY is supported for compatibility. Rename it to EXPO_PUBLIC_SUPABASE_ANON_KEY and restart Expo with --clear.",
    );
  let serviceRole = false;
  try {
    const encoded = publicKey
      .split(".")[1]
      ?.replace(/-/g, "+")
      .replace(/_/g, "/");
    if (encoded)
      serviceRole = JSON.parse(atob(encoded)).role === "service_role";
  } catch {
    /* This is a configuration warning, not JWT verification. */
  }
  if (publicKey.startsWith("sb_secret_") || serviceRole)
    issues.push(
      "Use a public anon/publishable Supabase key, never a secret key, in Expo configuration.",
    );
  return {
    backend: backend ?? "",
    auth: auth ?? "",
    publicKey,
    issues,
    warnings,
  };
}
