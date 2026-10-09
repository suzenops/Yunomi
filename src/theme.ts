import { StyleSheet } from "react-native";

export const colors = {
  background: "#F7F8F2",
  surface: "#FFFFFF",
  text: "#253D35",
  muted: "#63736C",
  primary: "#426A57",
  sage: "#E4EDE3",
  lavender: "#EEE9F4",
  peach: "#F9E9DA",
  border: "#DDE5DA",
  danger: "#963B38",
};

export const styles = StyleSheet.create({
  title: {
    fontSize: 32,
    fontWeight: "700",
    color: colors.text,
    letterSpacing: -0.8,
  },
  heading: { fontSize: 21, fontWeight: "600", color: colors.text },
  body: { fontSize: 16, lineHeight: 25, color: colors.muted },
  eyebrow: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 2,
    color: colors.primary,
  },
  card: {
    backgroundColor: colors.surface,
    padding: 24,
    borderRadius: 24,
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
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 16,
    fontSize: 16,
    color: colors.text,
  },
  error: { color: colors.danger, fontSize: 14, lineHeight: 21 },
});
