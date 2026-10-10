import { Animated, Image, StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Svg, {
  Defs,
  LinearGradient as SvgGradient,
  Stop,
  Path,
} from "react-native-svg";
import { useTheme } from "../theme";
import { useAmbientMotion } from "./motion";
export function Background({
  variant = "quiet",
}: {
  variant?: "coast" | "liquid" | "quiet";
}) {
  const { colors, mode } = useTheme();
  const drift = useAmbientMotion();
  return (
    <View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        StyleSheet.absoluteFill,
        { backgroundColor: colors.background, overflow: "hidden" },
      ]}
    >
      {variant === "coast" ? (
        <>
          <Animated.View
            style={[
              StyleSheet.absoluteFill,
              {
                transform: [
                  {
                    scale: drift.interpolate({
                      inputRange: [0, 1],
                      outputRange: [1.04, 1.08],
                    }),
                  },
                  {
                    translateY: drift.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, -8],
                    }),
                  },
                ],
              },
            ]}
          >
            <Image
              source={
                mode === "dark"
                  ? require("../../assets/backgrounds/midnight.jpg")
                  : require("../../assets/backgrounds/ethereal.jpg")
              }
              resizeMode="cover"
              style={{ width: "100%", height: "100%" }}
            />
          </Animated.View>
          <LinearGradient
            colors={colors.scrim}
            locations={[0, 0.64, 1]}
            style={StyleSheet.absoluteFill}
          />
        </>
      ) : (
        <>
          <LinearGradient
            colors={
              mode === "dark"
                ? ["#142735", "#0C1721", "#1C2934"]
                : ["#F4F0E7", "#E4E6DF", "#F6F1E9"]
            }
            style={StyleSheet.absoluteFill}
          />
          <Animated.View
            style={[
              StyleSheet.absoluteFill,
              {
                opacity: variant === "liquid" ? 0.75 : 0.3,
                transform: [
                  {
                    translateY: drift.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, 14],
                    }),
                  },
                ],
              },
            ]}
          >
            <Svg
              width="100%"
              height="100%"
              viewBox="0 0 400 850"
              preserveAspectRatio="xMidYMid slice"
            >
              <Defs>
                <SvgGradient id="flow" x1="0" y1="0" x2="1" y2="1">
                  <Stop
                    offset="0"
                    stopColor={mode === "dark" ? "#7796AB" : "#FFFDF6"}
                    stopOpacity="0.55"
                  />
                  <Stop
                    offset="0.55"
                    stopColor={mode === "dark" ? "#1E3647" : "#D2D6D0"}
                    stopOpacity="0.1"
                  />
                  <Stop
                    offset="1"
                    stopColor={mode === "dark" ? "#A3B9C4" : "#FFFFFF"}
                    stopOpacity="0.5"
                  />
                </SvgGradient>
              </Defs>
              <Path
                d="M-160-30C440-90 480 150 140 245S-30 600 460 460L560 700C40 910-200 490 95 280S220 60-160 80Z"
                fill="url(#flow)"
                stroke={colors.border}
                strokeWidth="1"
              />
              <Path
                d="M-80 490C10 330 120 260 280 300S460 440 260 550 340 870 530 710"
                fill="none"
                stroke={colors.border}
                strokeWidth="1.2"
              />
            </Svg>
          </Animated.View>
        </>
      )}
    </View>
  );
}
