import { Pressable, Text, View } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";
import { moods, type MoodId } from "../utils/wellness";
import { useTheme } from "../theme";
export function MoodSelector({
  value,
  onChange,
  disabled = false,
}: {
  value: MoodId | null;
  onChange: (mood: MoodId) => void;
  disabled?: boolean;
}) {
  const { colors, styles } = useTheme();
  return (
    <View
      style={{
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "space-between",
        gap: 6,
      }}
    >
      {moods.map((mood, index) => {
        const selected = value === mood.id;
        return (
          <Pressable
            key={mood.id}
            accessibilityRole="radio"
            accessibilityLabel={mood.label}
            accessibilityState={{ selected, disabled }}
            aria-checked={selected}
            disabled={disabled}
            onPress={() => onChange(mood.id)}
            style={({ pressed }) => ({
              minWidth: 48,
              flex: 1,
              alignItems: "center",
              paddingVertical: 8,
              gap: 8,
              opacity: disabled ? 0.5 : pressed ? 0.7 : 1,
            })}
          >
            <View
              style={{
                width: 42,
                height: 42,
                borderRadius: 21,
                backgroundColor: selected ? colors.primary : colors.subtle,
                borderWidth: 1,
                borderColor: selected ? colors.primary : colors.stroke,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Svg
                width="27"
                height="27"
                viewBox="0 0 28 28"
                fill="none"
                stroke={selected ? colors.onPrimary : colors.text}
                strokeWidth="1"
              >
                <Circle cx="14" cy="14" r="9" opacity="0.5" />
                <Path d={`M5 14Q14 ${[26, 21, 14, 7, 2][index]} 23 14`} />
                <Circle cx="14" cy="14" r={2 + index * 0.6} opacity="0.7" />
              </Svg>
            </View>
            <Text
              style={[
                styles.body,
                {
                  fontSize: 10,
                  lineHeight: 16,
                  color: selected ? colors.text : colors.muted,
                },
              ]}
            >
              {mood.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
