import { useState } from "react";
import { Alert, Pressable, Text, TextInput, View } from "react-native";
import { Screen } from "../components/Screen";
import { Button } from "../components/Button";
import { useWellness } from "../state/WellnessContext";
import { colors, styles } from "../theme";
import type { Habit } from "../utils/wellness";

export function HabitsScreen() {
  const { data, today, toggle, addHabit, removeHabit } = useWellness();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const completed = data.habits.filter((habit) =>
    habit.completedDates.includes(today),
  ).length;
  async function perform(action: () => Promise<void>, onSuccess?: () => void) {
    setBusy(true);
    setError("");
    try {
      await action();
      onSuccess?.();
    } catch (failure) {
      setError(
        failure instanceof Error && /habit/.test(failure.message)
          ? failure.message
          : "Your changes couldn’t be saved. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  function confirmRemove(habit: Habit) {
    Alert.alert(
      "Remove habit?",
      `“${habit.name}” and its completion history will be removed.`,
      [
        { text: "Keep it", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => void perform(() => removeHabit(habit.id)),
        },
      ],
    );
  }
  return (
    <Screen>
      <Text style={styles.eyebrow}>FIND YOUR RHYTHM</Text>
      <View style={{ gap: 10 }}>
        <Text style={styles.title}>Small steps count.</Text>
        <Text style={styles.body}>
          Build a day that feels good to you. No perfect streaks required.
        </Text>
      </View>
      <View style={[styles.card, { backgroundColor: colors.peach }]}>
        <Text style={styles.heading}>
          {completed} of {data.habits.length} today
        </Text>
        <Text style={styles.body}>
          {data.habits.length && completed === data.habits.length
            ? "You made time for yourself. Let that be enough."
            : "Every little act of care is a step in your own direction."}
        </Text>
        <View
          accessibilityRole="progressbar"
          accessibilityValue={{
            min: 0,
            max: data.habits.length || 1,
            now: completed,
          }}
          style={{
            height: 8,
            borderRadius: 4,
            backgroundColor: colors.surface,
            overflow: "hidden",
          }}
        >
          <View
            style={{
              height: 8,
              borderRadius: 4,
              backgroundColor: colors.primary,
              width: `${data.habits.length ? (completed / data.habits.length) * 100 : 0}%`,
            }}
          />
        </View>
      </View>
      <View style={{ gap: 12 }}>
        {data.habits.length === 0 && (
          <Text style={styles.body}>
            Your list is a fresh start. Add your first habit below.
          </Text>
        )}
        {data.habits.map((habit) => {
          const done = habit.completedDates.includes(today);
          return (
            <View key={habit.id} style={[styles.card, { padding: 16, gap: 8 }]}>
              <Pressable
                disabled={busy}
                onPress={() => void perform(() => toggle(habit.id))}
                accessibilityRole="checkbox"
                accessibilityLabel={habit.name}
                accessibilityState={{ checked: done, disabled: busy }}
                style={styles.row}
              >
                <View style={{ flex: 1, gap: 4 }}>
                  <Text
                    style={{
                      color: colors.text,
                      fontSize: 17,
                      fontWeight: "600",
                    }}
                  >
                    {habit.name}
                  </Text>
                  <Text style={[styles.body, { fontSize: 13 }]}>
                    {habit.completedDates.length} day
                    {habit.completedDates.length === 1 ? "" : "s"} cared for
                  </Text>
                </View>
                <View
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 24,
                    alignItems: "center",
                    justifyContent: "center",
                    borderWidth: 1,
                    borderColor: colors.primary,
                    backgroundColor: done ? colors.primary : colors.surface,
                  }}
                >
                  <Text style={{ color: colors.surface, fontSize: 24 }}>
                    {done ? "✓" : ""}
                  </Text>
                </View>
              </Pressable>
              <Pressable
                disabled={busy}
                accessibilityRole="button"
                accessibilityLabel={`Remove ${habit.name}`}
                onPress={() => confirmRemove(habit)}
                style={{
                  minHeight: 44,
                  justifyContent: "center",
                  alignSelf: "flex-start",
                  paddingHorizontal: 8,
                }}
              >
                <Text style={{ color: colors.muted, fontSize: 13 }}>
                  Remove habit
                </Text>
              </Pressable>
            </View>
          );
        })}
      </View>
      <View style={{ gap: 12 }}>
        <Text style={styles.heading}>Make room for something new</Text>
        <TextInput
          accessibilityLabel="New habit name"
          value={name}
          onChangeText={setName}
          editable={!busy}
          maxLength={60}
          placeholder="Read a few pages, stretch, slow down…"
          placeholderTextColor={colors.muted}
          style={styles.input}
          returnKeyType="done"
        />
        <Button
          title={busy ? "Saving…" : "Add a habit"}
          disabled={busy || !name.trim()}
          secondary
          onPress={() =>
            void perform(
              () => addHabit(name),
              () => setName(""),
            )
          }
        />
        {!!error && (
          <Text accessibilityRole="alert" style={styles.error}>
            {error}
          </Text>
        )}
      </View>
    </Screen>
  );
}
