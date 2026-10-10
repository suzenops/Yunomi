import { useState } from "react";
import { Alert, Pressable, Text, TextInput, View } from "react-native";
import { GlassCard } from "../design/GlassCard";
import { PageHeading } from "../design/Typography";
import { Icon } from "../design/Icon";
import { rollingWeek } from "../design/rhythm";
import { Screen } from "../components/Screen";
import { Button } from "../components/Button";
import { useWellness } from "../state/WellnessContext";
import { useTheme } from "../theme";
import type { Habit } from "../utils/wellness";

export function HabitsScreen() {
  const { colors, styles } = useTheme();
  const { data, today, toggle, addHabit, removeHabit } = useWellness();
  const [view, setView] = useState<"daily" | "weekly">("daily");
  const week = rollingWeek(today);
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
      <PageHeading
        eyebrow="Your daily rhythm"
        title={"Small rituals.\nA softer life."}
        subtitle="The things that bring you back to yourself, one day at a time."
      />
      <GlassCard>
        <View style={styles.row}>
          <Text style={styles.eyebrow}>TODAY’S PROGRESS</Text>
          <Text style={[styles.heading, { fontSize: 35 }]}>
            {completed}
            <Text style={{ fontSize: 20, color: colors.muted }}>
              {" "}
              / {data.habits.length}
            </Text>
          </Text>
        </View>
        <View
          accessibilityRole="progressbar"
          accessibilityValue={{
            min: 0,
            max: data.habits.length || 1,
            now: completed,
          }}
          style={{ height: 4, borderRadius: 2, backgroundColor: colors.stroke }}
        >
          <View
            style={{
              height: 4,
              borderRadius: 2,
              backgroundColor: colors.primary,
              width: `${data.habits.length ? (completed / data.habits.length) * 100 : 0}%`,
            }}
          />
        </View>
        <Text style={styles.body}>
          {data.habits.length && completed === data.habits.length
            ? "You made time for yourself. Let that be enough."
            : "A little care goes a long way."}
        </Text>
      </GlassCard>
      <View style={{ flexDirection: "row", gap: 12 }}>
        {(
          [
            ["daily", "Today"],
            ["weekly", "Last 7 days"],
          ] as const
        ).map(([id, label]) => (
          <Pressable
            key={id}
            accessibilityRole="tab"
            accessibilityState={{ selected: view === id }}
            aria-selected={view === id}
            onPress={() => setView(id)}
            style={{
              flex: 1,
              minHeight: 46,
              padding: 12,
              borderRadius: 24,
              alignItems: "center",
              backgroundColor: view === id ? colors.primary : colors.subtle,
            }}
          >
            <Text
              style={[
                styles.body,
                { color: view === id ? colors.onPrimary : colors.text },
              ]}
            >
              {label}
            </Text>
          </Pressable>
        ))}
      </View>
      {view === "weekly" && (
        <Text style={styles.body}>
          Your recorded rhythm over the last seven days. Check off today in the
          Today view.
        </Text>
      )}
      {data.habits.length === 0 && (
        <GlassCard>
          <Text style={styles.heading}>Make a little room.</Text>
          <Text style={styles.body}>
            Add something small that helps you feel like yourself.
          </Text>
        </GlassCard>
      )}
      {data.habits.map((habit) => {
        const done = habit.completedDates.includes(today);
        return (
          <GlassCard key={habit.id} padding={18} blur={false}>
            <View style={styles.row}>
              <View style={{ flex: 1, gap: 5 }}>
                <Text
                  style={[styles.body, { color: colors.text, fontSize: 17 }]}
                >
                  {habit.name}
                </Text>
                <Text style={[styles.body, { fontSize: 11 }]}>
                  {habit.completedDates.length}{" "}
                  {habit.completedDates.length === 1 ? "day" : "days"} cared for
                </Text>
              </View>
              {view === "daily" && (
                <Pressable
                  disabled={busy}
                  onPress={() => void perform(() => toggle(habit.id))}
                  accessibilityRole="checkbox"
                  accessibilityLabel={habit.name}
                  accessibilityState={{ checked: done, disabled: busy }}
                  aria-checked={done}
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 24,
                    borderWidth: 1,
                    borderColor: colors.stroke,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: done ? colors.primary : colors.subtle,
                  }}
                >
                  {done && (
                    <Icon name="check" color={colors.onPrimary} size={20} />
                  )}
                </Pressable>
              )}
            </View>
            {view === "weekly" && (
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  gap: 4,
                }}
              >
                {week.map((day) => (
                  <View
                    key={day}
                    accessibilityLabel={`${habit.name}, ${day}: ${habit.completedDates.includes(day) ? "completed" : "not completed"}`}
                    style={{ alignItems: "center", gap: 8 }}
                  >
                    <Text style={[styles.body, { fontSize: 10 }]}>
                      {new Date(`${day}T12:00:00`).toLocaleDateString(
                        undefined,
                        { weekday: "narrow" },
                      )}
                    </Text>
                    <View
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 14,
                        borderWidth: 1,
                        borderColor: colors.stroke,
                        backgroundColor: habit.completedDates.includes(day)
                          ? colors.primary
                          : colors.subtle,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {habit.completedDates.includes(day) && (
                        <Icon name="check" size={15} color={colors.onPrimary} />
                      )}
                    </View>
                  </View>
                ))}
              </View>
            )}
            <Pressable
              disabled={busy}
              accessibilityRole="button"
              accessibilityLabel={`Remove ${habit.name}`}
              onPress={() => confirmRemove(habit)}
              style={{
                minHeight: 44,
                justifyContent: "center",
                alignSelf: "flex-start",
              }}
            >
              <Text
                style={[styles.body, { fontSize: 10, color: colors.muted }]}
              >
                REMOVE HABIT
              </Text>
            </Pressable>
          </GlassCard>
        );
      })}
      <GlassCard>
        <Text style={styles.heading}>A new ritual.</Text>
        <TextInput
          accessibilityLabel="New habit name"
          value={name}
          onChangeText={setName}
          editable={!busy}
          maxLength={60}
          placeholder="Something small, just for you…"
          placeholderTextColor={colors.muted}
          style={styles.input}
          returnKeyType="done"
        />
        <Button
          title={busy ? "Saving…" : "Add a habit"}
          disabled={busy || !name.trim()}
          secondary
          icon="plus"
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
      </GlassCard>
    </Screen>
  );
}
