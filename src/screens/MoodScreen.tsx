import { useEffect, useState } from "react";
import { Alert, Text, TextInput, View } from "react-native";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import type { TabParamList } from "../navigation/AppNavigator";
import { useChat } from "../chat/ChatContext";
import { privacyText } from "../../shared/conversation";
import { GlassCard } from "../design/GlassCard";
import { Orb } from "../design/Orb";
import { MoodSelector } from "../design/MoodSelector";
import { PageHeading } from "../design/Typography";
import { Screen } from "../components/Screen";
import { Button } from "../components/Button";
import { useWellness } from "../state/WellnessContext";
import { moods, type MoodId } from "../utils/wellness";
import { useTheme } from "../theme";

export function MoodScreen({
  navigation,
  route,
}: BottomTabScreenProps<TabParamList, "CheckIn">) {
  const { colors, styles } = useTheme();
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
  useEffect(() => {
    const initialMood = route.params?.initialMood;
    if (initialMood) {
      setSelected(initialMood);
      setMessage("");
      navigation.setParams({ initialMood: undefined });
    }
  }, [route.params?.initialMood, navigation]);
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
    <Screen
      background="liquid"
      footer={
        <Button
          title={
            busy
              ? "Saving…"
              : entry
                ? "Update today’s check-in"
                : "Save this moment"
          }
          disabled={!selected || busy}
          onPress={() => void save()}
          icon="arrow"
        />
      }
    >
      <PageHeading
        eyebrow="A moment for you"
        title={"How do you feel,\nright now?"}
        subtitle="There’s room for every feeling. Let this moment be yours."
      />
      <Orb />
      <GlassCard padding={18}>
        <MoodSelector
          value={selected}
          disabled={busy}
          onChange={(mood) => {
            setSelected(mood);
            setMessage("");
          }}
        />
      </GlassCard>
      <GlassCard>
        <Text style={styles.eyebrow}>A PRIVATE REFLECTION</Text>
        <Text style={styles.heading}>What’s on your mind?</Text>
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
          placeholder="A thought, a feeling, a little of today…"
          placeholderTextColor={colors.muted}
          style={[styles.input, { minHeight: 128, textAlignVertical: "top" }]}
        />
        <Text style={[styles.body, { fontSize: 10, textAlign: "right" }]}>
          {note.length}/500 · ONLY SHARED IF YOU CHOOSE
        </Text>
      </GlassCard>
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
      {!!entry && (
        <GlassCard>
          <Text style={styles.heading}>A little perspective.</Text>
          <Text style={styles.body}>
            If you’d like a response, choose to share this saved moment with
            Yunomi.
          </Text>
          <Button
            title="Talk to Yunomi"
            secondary
            icon="arrow"
            disabled={busy || chat.busy}
            onPress={talk}
          />
        </GlassCard>
      )}
      {recent.length > 0 && (
        <GlassCard>
          <View style={styles.row}>
            <Text style={styles.eyebrow}>RECENT MOMENTS</Text>
            <Button
              title="Journal"
              secondary
              onPress={() => navigation.navigate("Journal")}
            />
          </View>
          {recent.map(([day, saved]) => (
            <View key={day} style={{ gap: 4, paddingVertical: 6 }}>
              <Text style={[styles.body, { color: colors.text }]}>
                {day === today
                  ? "Today"
                  : new Date(`${day}T12:00:00`).toLocaleDateString()}{" "}
                · {moods.find((mood) => mood.id === saved.mood)?.label}
              </Text>
              {!!saved.note && (
                <Text selectable style={styles.body}>
                  {saved.note}
                </Text>
              )}
            </View>
          ))}
        </GlassCard>
      )}
    </Screen>
  );
}
