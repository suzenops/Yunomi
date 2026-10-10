import { Platform, StyleSheet } from "react-native";
import { palettes, type Palette } from "./design/palette";
export { palettes, type Palette } from "./design/palette";
export function createStyles(colors: Palette, fontsLoaded: boolean) {
  const editorial = fontsLoaded
    ? "CormorantGaramond_400Regular"
    : Platform.select({ ios: "Georgia", android: "serif", default: "Georgia" });
  const sans = fontsLoaded ? "Manrope_400Regular" : undefined;
  return StyleSheet.create({
    title: {
      fontFamily: editorial,
      fontSize: 44,
      lineHeight: 49,
      color: colors.text,
      letterSpacing: -1.1,
    },
    heading: {
      fontFamily: editorial,
      fontSize: 28,
      lineHeight: 33,
      color: colors.text,
    },
    body: {
      fontFamily: sans,
      fontSize: 14,
      lineHeight: 23,
      color: colors.muted,
    },
    eyebrow: {
      fontFamily: sans,
      fontSize: 10,
      fontWeight: "600",
      letterSpacing: 2.6,
      color: colors.text,
    },
    card: {
      backgroundColor: colors.glass,
      padding: 22,
      borderRadius: 26,
      gap: 14,
      borderWidth: 1,
      borderColor: colors.border,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
    },
    input: {
      fontFamily: sans,
      backgroundColor: colors.subtle,
      borderWidth: 1,
      borderColor: colors.stroke,
      borderRadius: 22,
      padding: 17,
      fontSize: 15,
      lineHeight: 23,
      color: colors.text,
    },
    error: {
      fontFamily: sans,
      color: colors.danger,
      fontSize: 13,
      lineHeight: 21,
    },
  });
}
export { useTheme } from "./design/ThemeProvider";
