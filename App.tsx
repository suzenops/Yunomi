import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { WellnessProvider } from "./src/state/WellnessContext";
import { ChatProvider } from "./src/chat/ChatContext";
import { AppNavigator } from "./src/navigation/AppNavigator";

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <WellnessProvider>
        <ChatProvider>
          <AppNavigator />
        </ChatProvider>
      </WellnessProvider>
    </SafeAreaProvider>
  );
}
