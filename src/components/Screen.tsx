import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../theme";
import { Background } from "../design/Background";
export function useKeyboardVisible() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const show = Keyboard.addListener("keyboardDidShow", () =>
      setVisible(true),
    );
    const hide = Keyboard.addListener("keyboardDidHide", () =>
      setVisible(false),
    );
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  return visible;
}
export function Screen({
  children,
  background = "quiet",
  footer,
  scrollRevision,
}: {
  children: ReactNode;
  background?: "coast" | "liquid" | "quiet";
  footer?: ReactNode;
  scrollRevision?: string;
}) {
  const { colors } = useTheme();
  const keyboard = useKeyboardVisible();
  const scroll = useRef<ScrollView>(null);
  useEffect(() => {
    if (scrollRevision === undefined) return;
    const frame = requestAnimationFrame(() => {
      if (scrollRevision) scroll.current?.scrollToEnd({ animated: false });
      else scroll.current?.scrollTo({ y: 0, animated: false });
    });
    return () => cancelAnimationFrame(frame);
  }, [scrollRevision]);
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Background variant={background} />
      <SafeAreaView edges={["top", "left", "right"]} style={{ flex: 1 }}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >
          <ScrollView
            ref={scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{
              padding: 24,
              paddingTop: 18,
              paddingBottom: footer ? 24 : 130,
              gap: 24,
              maxWidth: 620,
              width: "100%",
              alignSelf: "center",
            }}
          >
            {children}
          </ScrollView>
          {footer && (
            <View
              style={{
                paddingHorizontal: 18,
                paddingBottom: keyboard ? 12 : 100,
                maxWidth: 620,
                width: "100%",
                alignSelf: "center",
              }}
            >
              {footer}
            </View>
          )}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}
