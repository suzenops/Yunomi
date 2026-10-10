import { Animated, View } from "react-native";
import Svg, {
  Circle,
  Defs,
  Ellipse,
  RadialGradient,
  LinearGradient,
  Stop,
  Path,
} from "react-native-svg";
import { useTheme } from "../theme";
import { useAmbientMotion } from "./motion";
export function Orb({ size = 230 }: { size?: number }) {
  const { mode } = useTheme();
  const drift = useAmbientMotion();
  const dark = mode === "dark";
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ alignItems: "center", paddingVertical: 8 }}
    >
      <Animated.View
        style={{
          width: size,
          height: size,
          transform: [
            {
              translateY: drift.interpolate({
                inputRange: [0, 1],
                outputRange: [0, -6],
              }),
            },
          ],
        }}
      >
        <Svg width="100%" height="100%" viewBox="0 0 260 260">
          <Defs>
            <RadialGradient id="lens" cx="35%" cy="25%" r="75%">
              <Stop
                offset="0"
                stopColor={dark ? "#B0CCD7" : "#FFFFFF"}
                stopOpacity="0.85"
              />
              <Stop
                offset="0.28"
                stopColor={dark ? "#6A8E9E" : "#F4F5EF"}
                stopOpacity="0.3"
              />
              <Stop
                offset="0.7"
                stopColor={dark ? "#193749" : "#B7C9C8"}
                stopOpacity="0.38"
              />
              <Stop
                offset="1"
                stopColor={dark ? "#91AEB8" : "#E3CFAF"}
                stopOpacity="0.8"
              />
            </RadialGradient>
            <LinearGradient id="ribbon" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0.78" />
              <Stop
                offset="0.5"
                stopColor={dark ? "#446F85" : "#B2C7CC"}
                stopOpacity="0.15"
              />
              <Stop offset="1" stopColor="#FFFFFF" stopOpacity="0.9" />
            </LinearGradient>
          </Defs>
          <Ellipse
            cx="130"
            cy="244"
            rx="65"
            ry="5"
            fill={dark ? "#030D15" : "#758780"}
            opacity="0.12"
          />
          <Circle
            cx="130"
            cy="122"
            r="108"
            fill="url(#lens)"
            stroke={dark ? "#8AA5B5" : "#FFFFFF"}
            strokeWidth="1.4"
          />
          <Path
            d="M37 72C155 25 192 84 138 135S75 191 218 169C187 232 98 250 51 184S36 101 37 72Z"
            fill="url(#ribbon)"
            opacity="0.6"
          />
          <Path
            d="M40 85C108 33 157 48 179 69M71 205C140 232 183 214 207 191"
            fill="none"
            stroke="white"
            strokeWidth="1.6"
            opacity="0.75"
          />
          <Ellipse
            cx="82"
            cy="64"
            rx="28"
            ry="9"
            fill="white"
            opacity="0.55"
            transform="rotate(-27 82 64)"
          />
        </Svg>
      </Animated.View>
    </View>
  );
}
