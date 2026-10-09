import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { WellnessProvider } from "./src/state/WellnessContext";
import { AppNavigator } from "./src/navigation/AppNavigator";

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <WellnessProvider>
        <AppNavigator />
      </WellnessProvider>
    </SafeAreaProvider>
  );
}
