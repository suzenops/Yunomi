import { useEffect, useRef } from "react";
import { Animated, AppState } from "react-native";
import { useIsFocused } from "@react-navigation/native";
import { useTheme } from "../theme";
// Only the focused, foreground screen animates. No layout or JS-frame animation.
export function useAmbientMotion() {
  const { motionEnabled } = useTheme();
  const focused = useIsFocused();
  const value = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(value, {
          toValue: 1,
          duration: 14000,
          useNativeDriver: true,
          isInteraction: false,
        }),
        Animated.timing(value, {
          toValue: 0,
          duration: 14000,
          useNativeDriver: true,
          isInteraction: false,
        }),
      ]),
    );
    const start = () => {
      if (motionEnabled && focused && AppState.currentState === "active")
        animation.start();
    };
    start();
    const subscription = AppState.addEventListener("change", (state) => {
      animation.stop();
      if (state === "active") start();
    });
    return () => {
      animation.stop();
      value.setValue(0);
      subscription.remove();
    };
  }, [motionEnabled, focused, value]);
  return value;
}
