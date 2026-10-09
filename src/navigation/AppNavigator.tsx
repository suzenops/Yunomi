import { DefaultTheme, NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Text } from "react-native";
import { HomeScreen } from "../screens/HomeScreen";
import { MoodScreen } from "../screens/MoodScreen";
import { HabitsScreen } from "../screens/HabitsScreen";
import { colors } from "../theme";

export type TabParamList = {
  Home: undefined;
  CheckIn: undefined;
  Habits: undefined;
};
const Tab = createBottomTabNavigator<TabParamList>();
const icons = { Home: "⌂", CheckIn: "◐", Habits: "✓" };

export function AppNavigator() {
  return (
    <NavigationContainer
      theme={{
        ...DefaultTheme,
        colors: {
          ...DefaultTheme.colors,
          primary: colors.primary,
          background: colors.background,
          card: colors.surface,
          text: colors.text,
          border: colors.border,
        },
      }}
    >
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          animation: "fade",
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.muted,
          tabBarStyle: {
            backgroundColor: colors.surface,
            borderTopColor: colors.border,
          },
          tabBarLabelStyle: { fontSize: 12, fontWeight: "600" },
          tabBarIcon: ({ color }) => (
            <Text
              accessibilityElementsHidden
              importantForAccessibility="no"
              style={{ color, fontSize: 25 }}
            >
              {icons[route.name]}
            </Text>
          ),
        })}
      >
        <Tab.Screen
          name="Home"
          component={HomeScreen}
          options={{ title: "Home" }}
        />
        <Tab.Screen
          name="CheckIn"
          component={MoodScreen}
          options={{ title: "Check-in" }}
        />
        <Tab.Screen
          name="Habits"
          component={HabitsScreen}
          options={{ title: "Habits" }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
