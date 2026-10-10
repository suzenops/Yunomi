import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import { Pressable, Text, View } from "react-native";
import type { TabParamList } from "../navigation/AppNavigator";
import { Screen } from "../components/Screen";
import { Button } from "../components/Button";
import { GlassCard } from "../design/GlassCard";
import { Icon } from "../design/Icon";
import { MoodSelector } from "../design/MoodSelector";
import { useWellness } from "../state/WellnessContext";
import { useTheme } from "../theme";
export function HomeScreen({
  navigation,
}: BottomTabScreenProps<TabParamList, "Home">) {
  const { colors, styles } = useTheme();
  const { data, today } = useWellness();
  const completed = data.habits.filter((h) =>
    h.completedDates.includes(today),
  ).length;
  return (
    <Screen background="coast">
      <View style={styles.row}>
        <Text style={[styles.eyebrow, { fontSize: 15, letterSpacing: 6 }]}>
          YUNOMI
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open settings"
          onPress={() => navigation.navigate("Settings")}
          style={{
            width: 44,
            height: 44,
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 22,
            backgroundColor: colors.subtle,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <Icon name="settings" color={colors.text} />
        </Pressable>
      </View>
      <View style={{ gap: 14, paddingTop: 18, paddingBottom: 56 }}>
        <Text style={styles.eyebrow}>
          {new Date(`${today}T12:00:00`)
            .toLocaleDateString(undefined, {
              weekday: "long",
              month: "long",
              day: "numeric",
            })
            .toUpperCase()}
        </Text>
        <Text style={[styles.title, { fontSize: 54, lineHeight: 57 }]}>
          A calmer you,{"\n"}today.
        </Text>
        <Text style={[styles.body, { maxWidth: 260 }]}>
          A moment to slow down. A little space to feel like yourself.
        </Text>
      </View>
      <GlassCard>
        <View style={styles.row}>
          <Text style={styles.eyebrow}>HOW ARE YOU FEELING?</Text>
          <Icon name="orb" size={18} color={colors.muted} />
        </View>
        <MoodSelector
          value={data.moods[today]?.mood ?? null}
          onChange={(initialMood) =>
            navigation.navigate("CheckIn", { initialMood })
          }
        />
        <Text style={[styles.body, { fontSize: 11 }]}>
          Choose a feeling to open your private check-in.
        </Text>
      </GlassCard>
      <GlassCard>
        <View style={styles.row}>
          <Text style={styles.eyebrow}>TODAY’S FOCUS</Text>
          <Icon name="sun" color={colors.accent} size={20} />
        </View>
        <Text style={styles.heading}>Make room for a pause.</Text>
        <Text style={styles.body}>
          Notice what you need today. A quiet reflection is a good place to
          begin.
        </Text>
        <Button
          title={data.moods[today] ? "Revisit your check-in" : "Take a moment"}
          icon="arrow"
          onPress={() => navigation.navigate("CheckIn")}
        />
      </GlassCard>
      <GlassCard>
        <View style={styles.row}>
          <Text style={styles.eyebrow}>YOUR DAILY RHYTHM</Text>
          <Text style={styles.body}>
            {completed} / {data.habits.length}
          </Text>
        </View>
        <Text style={styles.heading}>
          {completed ? "Small acts of care." : "Begin gently."}
        </Text>
        <View
          accessibilityRole="progressbar"
          accessibilityValue={{
            min: 0,
            max: data.habits.length || 1,
            now: completed,
          }}
          style={{ height: 3, backgroundColor: colors.stroke, borderRadius: 2 }}
        >
          <View
            style={{
              height: 3,
              width: `${data.habits.length ? (completed / data.habits.length) * 100 : 0}%`,
              backgroundColor: colors.primary,
              borderRadius: 2,
            }}
          />
        </View>
        <Button
          title="View your habits"
          secondary
          icon="arrow"
          onPress={() => navigation.navigate("Habits")}
        />
      </GlassCard>
      <Pressable
        accessibilityRole="button"
        onPress={() => navigation.navigate("Chat")}
        style={[styles.row, { padding: 6 }]}
      >
        <Text style={styles.body}>A space to talk, whenever you need.</Text>
        <Icon name="arrow" color={colors.text} />
      </Pressable>
      <Text
        style={[
          styles.body,
          { textAlign: "center", fontSize: 11, letterSpacing: 1 },
        ]}
      >
        LESS PRESSURE. MORE UNDERSTANDING.
      </Text>
    </Screen>
  );
}
