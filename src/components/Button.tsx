import { Pressable, Text, View } from "react-native";
import { useTheme } from "../theme";
import { Icon, type IconName } from "../design/Icon";
export function Button({
  title,
  onPress,
  disabled = false,
  secondary = false,
  icon,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  secondary?: boolean;
  icon?: IconName;
}) {
  const { colors, styles, motionEnabled } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 52,
        paddingVertical: 14,
        paddingHorizontal: 20,
        borderRadius: 28,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: secondary ? colors.subtle : colors.primary,
        borderWidth: 1,
        borderColor: secondary ? colors.stroke : colors.primary,
        opacity: disabled ? 0.45 : pressed ? 0.8 : 1,
        transform: [{ scale: pressed && motionEnabled ? 0.98 : 1 }],
      })}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
          maxWidth: "100%",
        }}
      >
        <Text
          style={[
            styles.body,
            {
              fontSize: 13,
              color: secondary ? colors.text : colors.onPrimary,
              flexShrink: 1,
              textAlign: "center",
            },
          ]}
        >
          {title}
        </Text>
        {icon && (
          <Icon
            name={icon}
            size={18}
            color={secondary ? colors.text : colors.onPrimary}
          />
        )}
      </View>
    </Pressable>
  );
}
