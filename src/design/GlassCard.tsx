import type { ReactNode } from "react";
import {
  Platform,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "../theme";
export function GlassCard({
  children,
  style,
  padding = 22,
  blur = true,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  padding?: number;
  blur?: boolean;
}) {
  const { colors, mode, reduceTransparency } = useTheme();
  return (
    <View
      style={[
        {
          borderRadius: 28,
          overflow: "hidden",
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: reduceTransparency ? colors.surface : colors.glass,
          shadowColor: "#0C1C26",
          shadowOpacity: mode === "dark" ? 0.14 : 0.06,
          shadowRadius: 20,
          shadowOffset: { width: 0, height: 9 },
        },
        style,
      ]}
    >
      {!reduceTransparency && blur && Platform.OS !== "android" && (
        <BlurView
          intensity={25}
          tint={mode}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
      )}
      {!reduceTransparency && (
        <LinearGradient
          colors={
            mode === "dark"
              ? ["rgba(234,245,251,0.07)", "rgba(9,21,30,0.16)"]
              : ["rgba(255,255,255,0.48)", "rgba(255,251,240,0.15)"]
          }
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
      )}
      <View style={{ padding, gap: 14 }}>{children}</View>
    </View>
  );
}
