export type ThemePreference = "light" | "dark" | "system";
export type AppearancePreferences = {
  version: 1;
  theme: ThemePreference;
  ambientMotion: boolean;
};
export const defaultAppearance = (): AppearancePreferences => ({
  version: 1,
  theme: "system",
  ambientMotion: true,
});
export function parseAppearance(raw: string): AppearancePreferences {
  const value = JSON.parse(raw);
  if (
    !value ||
    value.version !== 1 ||
    !["light", "dark", "system"].includes(value.theme) ||
    typeof value.ambientMotion !== "boolean"
  )
    throw new Error(
      "Your appearance preference could not be read. Select a theme to save a new preference.",
    );
  return { version: 1, theme: value.theme, ambientMotion: value.ambientMotion };
}
export function resolveTheme(
  preference: ThemePreference,
  system: "light" | "dark" | "unspecified" | null | undefined,
) {
  return preference === "system"
    ? system === "dark"
      ? "dark"
      : "light"
    : preference;
}
