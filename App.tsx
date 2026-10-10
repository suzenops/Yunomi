import { ThemeProvider, useTheme } from "./src/design/ThemeProvider";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { WellnessProvider } from "./src/state/WellnessContext";
import { ChatProvider } from "./src/chat/ChatContext";
import { AppNavigator } from "./src/navigation/AppNavigator";

function ThemedApp() {
  const { mode } = useTheme();
  return (
    <SafeAreaProvider>
      <StatusBar style={mode === "dark" ? "light" : "dark"} />
      <WellnessProvider>
        <ChatProvider>
          <AppNavigator />
        </ChatProvider>
      </WellnessProvider>
    </SafeAreaProvider>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <ThemedApp />
    </ThemeProvider>
  );
}
