import { Pressable, Text } from "react-native";
import { colors } from "../theme";

export function Button({
  title,
  onPress,
  disabled = false,
  secondary = false,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  secondary?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 52,
        padding: 16,
        borderRadius: 16,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: secondary ? colors.sage : colors.primary,
        opacity: disabled ? 0.5 : pressed ? 0.8 : 1,
      })}
    >
      <Text
        style={{
          fontSize: 16,
          fontWeight: "600",
          color: secondary ? colors.text : colors.surface,
        }}
      >
        {title}
      </Text>
    </Pressable>
  );
}
