import { useEffect, useState } from "react";
import { Alert, Pressable, Text, TextInput, View } from "react-native";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import type { TabParamList } from "../navigation/AppNavigator";
import { useChat } from "../chat/ChatContext";
import { privacyText } from "../../shared/conversation";
import { Screen } from "../components/Screen";
import { Button } from "../components/Button";
import { useWellness } from "../state/WellnessContext";
import { moods, type MoodId } from "../utils/wellness";
import { colors, styles } from "../theme";

export function MoodScreen({
  navigation,
}: BottomTabScreenProps<TabParamList, "CheckIn">) {
  const chat = useChat();
  function talk() {
    const saved = data.moods[today];
    if (!saved) return;
    const journal = { date: today, mood: saved.mood, note: saved.note };
    Alert.alert(
      "Share this check-in with AI?",
      `${journal.date} · ${journal.mood}\n${journal.note || "No note added."}\n\n${privacyText}\n\nThis starts a fresh conversation with this entry.`,
      [
        { text: "Keep it private", style: "cancel" },
        {
          text: "Share and talk",
          onPress: () => {
            chat.clear();
            chat.grantConsent();
            navigation.navigate("Chat");
            void chat.send(
              "Please acknowledge my check-in and help me talk about it.",
              journal,
            );
          },
        },
      ],
    );
  }
  const { data, today, checkIn } = useWellness();
  const entry = data.moods[today];
  const [selected, setSelected] = useState<MoodId | null>(entry?.mood ?? null);
  const [note, setNote] = useState(entry?.note ?? "");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  // A new local day starts a fresh form; saving keeps the confirmation visible.
  useEffect(() => {
    setSelected(entry?.mood ?? null);
    setNote(entry?.note ?? "");
    setMessage("");
    setError("");
  }, [today]);
  async function save() {
    if (!selected || busy) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await checkIn(selected, note);
      setMessage(
        "Your check-in is saved. Thank you for showing up for yourself.",
      );
    } catch {
      setError("Your check-in couldn’t be saved. Please try again.");
    } finally {
      setBusy(false);
    }
  }
  const recent = Object.entries(data.moods)
    .sort(([a], [b]) => b.localeCompare(a))
    .slice(0, 7);
  return (
    <Screen>
      <Text style={styles.eyebrow}>A MOMENT FOR YOU</Text>
      <View style={{ gap: 10 }}>
        <Text style={styles.title}>How do you feel?</Text>
        <Text style={styles.body}>
          There’s no right answer. Choose what feels closest to you today.
        </Text>
      </View>
      <View style={[styles.card, { backgroundColor: colors.lavender }]}>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
          {moods.map((mood) => (
            <Pressable
              key={mood.id}
              accessibilityRole="radio"
              accessibilityLabel={mood.label}
              accessibilityState={{
                selected: selected === mood.id,
                disabled: busy,
              }}
              disabled={busy}
              onPress={() => {
                setSelected(mood.id);
                setMessage("");
              }}
              style={({ pressed }) => ({
                flexGrow: 1,
                minWidth: 78,
                padding: 14,
                borderRadius: 18,
                alignItems: "center",
                gap: 8,
                backgroundColor:
                  selected === mood.id ? colors.primary : colors.surface,
                opacity: pressed ? 0.8 : 1,
              })}
            >
              <Text
                style={{
                  fontSize: 28,
                  color: selected === mood.id ? colors.surface : colors.primary,
                }}
              >
                {mood.symbol}
              </Text>
              <Text
                style={{
                  fontSize: 14,
                  color: selected === mood.id ? colors.surface : colors.text,
                }}
              >
                {mood.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
      <View style={{ gap: 10 }}>
        <Text style={styles.heading}>Want to say a little more?</Text>
        <Text style={styles.body}>An optional note, just for you.</Text>
        <TextInput
          accessibilityLabel="Optional mood note"
          multiline
          maxLength={500}
          editable={!busy}
          value={note}
          onChangeText={(value) => {
            setNote(value);
            setMessage("");
          }}
          placeholder="What’s on your mind?"
          placeholderTextColor={colors.muted}
          style={[styles.input, { minHeight: 130, textAlignVertical: "top" }]}
        />
        <Text style={[styles.body, { fontSize: 12, textAlign: "right" }]}>
          {note.length}/500
        </Text>
        <Button
          title={
            busy
              ? "Saving…"
              : entry
                ? "Update today’s check-in"
                : "Save today’s check-in"
          }
          disabled={!selected || busy}
          onPress={() => void save()}
        />
        {!!entry && (
          <View style={[styles.card, { backgroundColor: colors.sage }]}>
            <Text style={styles.body}>
              Want a response from Yunomi? You can choose to share this saved
              check-in with the AI companion.
            </Text>
            <Button
              title="Talk to Yunomi"
              secondary
              disabled={busy || chat.busy}
              onPress={talk}
            />
          </View>
        )}
        {!!message && (
          <Text accessibilityLiveRegion="polite" style={styles.body}>
            {message}
          </Text>
        )}
        {!!error && (
          <Text accessibilityRole="alert" style={styles.error}>
            {error}
          </Text>
        )}
      </View>
      {recent.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.heading}>Recent moments</Text>
          {recent.map(([day, saved]) => (
            <View key={day} style={{ gap: 4 }}>
              <Text style={{ color: colors.text, fontWeight: "600" }}>
                {day === today
                  ? "Today"
                  : new Date(`${day}T12:00:00`).toLocaleDateString()}{" "}
                · {moods.find((mood) => mood.id === saved.mood)?.label}
              </Text>
              {!!saved.note && <Text style={styles.body}>{saved.note}</Text>}
            </View>
          ))}
        </View>
      )}
    </Screen>
  );
}
