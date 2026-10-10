import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AccessibilityInfo, Platform, useColorScheme } from "react-native";
import { useFonts } from "expo-font";
import { CormorantGaramond_400Regular } from "@expo-google-fonts/cormorant-garamond/400Regular";
import { Manrope_400Regular } from "@expo-google-fonts/manrope/400Regular";
import { palettes, createStyles } from "../theme";
import {
  defaultAppearance,
  parseAppearance,
  resolveTheme,
  type AppearancePreferences,
  type ThemePreference,
} from "./appearance";
const KEY = "@yunomi/appearance/v1";
function useAppearanceState() {
  const system = useColorScheme();
  const [preferences, setPreferences] = useState(defaultAppearance);
  const current = useRef(preferences);
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [reduceMotion, setReduceMotion] = useState(true);
  const [reduceTransparency, setReduceTransparency] = useState(false);
  const [fontsLoaded] = useFonts({
    CormorantGaramond_400Regular,
    Manrope_400Regular,
  });
  useEffect(() => {
    let alive = true;
    void AsyncStorage.getItem(KEY)
      .then((raw) => {
        if (!alive) return;
        const value = raw === null ? defaultAppearance() : parseAppearance(raw);
        current.current = value;
        setPreferences(value);
      })
      .catch(() => {
        if (alive)
          setError(
            "Appearance settings couldn’t be opened. Choosing a theme will replace only those settings.",
          );
      })
      .finally(() => {
        if (alive) setReady(true);
      });
    void AccessibilityInfo.isReduceMotionEnabled()
      .then((v) => {
        if (alive) setReduceMotion(v);
      })
      .catch(() => {});
    if (Platform.OS === "ios")
      void AccessibilityInfo.isReduceTransparencyEnabled()
        .then((v) => {
          if (alive) setReduceTransparency(v);
        })
        .catch(() => {});
    const motion = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      setReduceMotion,
    );
    const transparency =
      Platform.OS === "ios"
        ? AccessibilityInfo.addEventListener(
            "reduceTransparencyChanged",
            setReduceTransparency,
          )
        : null;
    return () => {
      alive = false;
      motion.remove();
      transparency?.remove();
    };
  }, []);
  function update(change: Partial<AppearancePreferences>) {
    const next = queue.current.then(async () => {
      if (!ready) return;
      const value = { ...current.current, ...change };
      try {
        await AsyncStorage.setItem(KEY, JSON.stringify(value));
        current.current = value;
        setPreferences(value);
        setError("");
      } catch {
        setError("Appearance settings couldn’t be saved. Please try again.");
      }
    });
    queue.current = next.catch(() => {});
    return next;
  }
  const mode = resolveTheme(preferences.theme, system);
  const colors = palettes[mode];
  const styles = useMemo(
    () => createStyles(colors, fontsLoaded),
    [colors, fontsLoaded],
  );
  return {
    colors,
    styles,
    mode,
    preferences,
    ready,
    error,
    reduceTransparency,
    motionEnabled: ready && preferences.ambientMotion && !reduceMotion,
    setPreference: (theme: ThemePreference) => update({ theme }),
    setAmbientMotion: (ambientMotion: boolean) => update({ ambientMotion }),
  };
}
type Theme = ReturnType<typeof useAppearanceState>;
const Context = createContext<Theme | null>(null);
export function ThemeProvider({ children }: { children: ReactNode }) {
  const value = useAppearanceState();
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useTheme() {
  const value = useContext(Context);
  if (!value) throw new Error("ThemeProvider is required");
  return value;
}
