import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import { Text, View } from "react-native";
import type { TabParamList } from "../navigation/AppNavigator";
import { Screen } from "../components/Screen";
import { Button } from "../components/Button";
import { useWellness } from "../state/WellnessContext";
import { colors, styles } from "../theme";
import { moods } from "../utils/wellness";

export function HomeScreen({
  navigation,
}: BottomTabScreenProps<TabParamList, "Home">) {
  const { data, today } = useWellness();
  const mood = moods.find((item) => item.id === data.moods[today]?.mood);
  const completed = data.habits.filter((habit) =>
    habit.completedDates.includes(today),
  ).length;
  return (
    <Screen>
      <Text style={styles.eyebrow}>Y U N O M I</Text>
      <View style={{ gap: 10 }}>
        <Text style={styles.body}>
          {new Date(`${today}T12:00:00`).toLocaleDateString(undefined, {
            weekday: "long",
            month: "long",
            day: "numeric",
          })}
        </Text>
        <Text style={styles.title}>A little space{"\n"}for yourself.</Text>
        <Text style={styles.body}>
          Welcome back. Take a breath, check in, and find your rhythm. One small
          moment at a time.
        </Text>
      </View>
      <View style={[styles.card, { backgroundColor: colors.sage }]}>
        <Text style={styles.eyebrow}>YOUR DAILY PAUSE</Text>
        <Text style={styles.heading}>
          {mood
            ? `Today feels ${mood.label.toLowerCase()}.`
            : "How are you, really?"}
        </Text>
        <Text style={styles.body}>
          {mood
            ? "There’s room for every feeling. You can revisit your check-in whenever you need."
            : "You don’t have to have it all figured out. Start with how you feel right now."}
        </Text>
        <Button
          title={mood ? "Revisit your check-in" : "Check in with yourself"}
          onPress={() => navigation.navigate("CheckIn")}
        />
      </View>
      <View style={styles.card}>
        <View style={styles.row}>
          <Text style={styles.heading}>Your rhythm</Text>
          <Text style={styles.eyebrow}>
            {completed} / {data.habits.length}
          </Text>
        </View>
        <Text style={styles.body}>
          {data.habits.length
            ? `${completed} of ${data.habits.length} habits cared for today. Small steps count.`
            : "Make room for something that helps you feel like yourself."}
        </Text>
        <Button
          title="Visit your habits"
          secondary
          onPress={() => navigation.navigate("Habits")}
        />
      </View>
      <Text style={[styles.body, { textAlign: "center", fontStyle: "italic" }]}>
        Less pressure. More understanding.
      </Text>
    </Screen>
  );
}
