import {
  DefaultTheme,
  DarkTheme,
  NavigationContainer,
} from "@react-navigation/native";
import {
  createBottomTabNavigator,
  type BottomTabBarProps,
} from "@react-navigation/bottom-tabs";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { HomeScreen } from "../screens/HomeScreen";
import { MoodScreen } from "../screens/MoodScreen";
import { HabitsScreen } from "../screens/HabitsScreen";
import { ChatScreen } from "../screens/ChatScreen";
import { JournalScreen } from "../screens/JournalScreen";
import { SettingsScreen } from "../screens/SettingsScreen";
import { GlassCard } from "../design/GlassCard";
import { Icon, type IconName } from "../design/Icon";
import { useKeyboardVisible } from "../components/Screen";
import { useTheme } from "../theme";
import type { MoodId } from "../utils/wellness";
export type TabParamList = {
  Home: undefined;
  CheckIn: { initialMood?: MoodId } | undefined;
  Habits: undefined;
  Chat: undefined;
  Journal: undefined;
  Settings: undefined;
};
const Tab = createBottomTabNavigator<TabParamList>();
const icons: Record<string, IconName> = {
  Home: "home",
  Chat: "chat",
  CheckIn: "orb",
  Habits: "habits",
  Journal: "journal",
  Settings: "settings",
};
function FloatingTabs({ state, descriptors, navigation }: BottomTabBarProps) {
  const { colors, styles } = useTheme();
  const insets = useSafeAreaInsets();
  const keyboard = useKeyboardVisible();
  if (keyboard) return null;
  return (
    <View
      style={{
        position: "absolute",
        bottom: Math.max(insets.bottom, 14),
        left: 0,
        right: 0,
        paddingHorizontal: 16,
        alignItems: "center",
      }}
    >
      <GlassCard
        padding={8}
        style={{ borderRadius: 32, width: "100%", maxWidth: 560 }}
      >
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          {state.routes.map((route, index) => {
            const selected = state.index === index;
            const label = descriptors[route.key].options.title ?? route.name;
            return (
              <Pressable
                key={route.key}
                accessibilityRole="tab"
                accessibilityLabel={label}
                accessibilityState={{ selected }}
                aria-selected={selected}
                onPress={() => {
                  const event = navigation.emit({
                    type: "tabPress",
                    target: route.key,
                    canPreventDefault: true,
                  });
                  if (!selected && !event.defaultPrevented)
                    navigation.navigate(route.name, route.params);
                }}
                onLongPress={() =>
                  navigation.emit({ type: "tabLongPress", target: route.key })
                }
                style={{
                  flex: 1,
                  minHeight: 52,
                  paddingVertical: 6,
                  borderRadius: 23,
                  gap: 4,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: selected ? colors.subtle : "transparent",
                }}
              >
                <Icon
                  name={icons[route.name]}
                  size={20}
                  color={selected ? colors.text : colors.muted}
                />
                <Text
                  numberOfLines={1}
                  style={[
                    styles.body,
                    {
                      fontSize: 9,
                      lineHeight: 13,
                      color: selected ? colors.text : colors.muted,
                    },
                  ]}
                >
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </GlassCard>
    </View>
  );
}
export function AppNavigator() {
  const { colors, mode, motionEnabled } = useTheme();
  return (
    <NavigationContainer
      theme={{
        ...(mode === "dark" ? DarkTheme : DefaultTheme),
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
        tabBar={(props) => <FloatingTabs {...props} />}
        screenOptions={{
          headerShown: false,
          animation: motionEnabled ? "fade" : "none",
          sceneStyle: { backgroundColor: colors.background },
        }}
      >
        <Tab.Screen
          name="Home"
          component={HomeScreen}
          options={{ title: "Home" }}
        />
        <Tab.Screen
          name="Chat"
          component={ChatScreen}
          options={{ title: "Companion" }}
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
        <Tab.Screen
          name="Journal"
          component={JournalScreen}
          options={{ title: "Journal" }}
        />
        <Tab.Screen
          name="Settings"
          component={SettingsScreen}
          options={{ title: "Settings" }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
