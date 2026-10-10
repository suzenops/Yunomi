import { useState } from "react";
import { Image, Pressable, Text, View } from "react-native";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import type { TabParamList } from "../navigation/AppNavigator";
import { Screen } from "../components/Screen";
import { Button } from "../components/Button";
import { GlassCard } from "../design/GlassCard";
import { PageHeading } from "../design/Typography";
import { Icon } from "../design/Icon";
import { useTheme } from "../theme";
import { useWellness } from "../state/WellnessContext";
import { moods } from "../utils/wellness";
export function JournalScreen({
  navigation,
}: BottomTabScreenProps<TabParamList, "Journal">) {
  const { colors, styles, mode } = useTheme();
  const { data, today } = useWellness();
  const [page, setPage] = useState(0);
  const entries = Object.entries(data.moods).sort(([a], [b]) =>
    b.localeCompare(a),
  );
  const pages = Math.max(1, Math.ceil(entries.length / 10));
  const currentPage = Math.min(page, pages - 1);
  const visibleEntries = entries.slice(currentPage * 10, currentPage * 10 + 10);
  return (
    <Screen
      footer={
        <Button
          title="Write today’s reflection"
          icon="plus"
          onPress={() => navigation.navigate("CheckIn")}
        />
      }
    >
      <PageHeading
        eyebrow="Your inner landscape"
        title={"The moments\nyou keep."}
        subtitle="A quiet record of how life feels. Private, and entirely yours."
      />
      <View style={styles.row}>
        <Text style={styles.eyebrow}>
          {entries.length} SAVED {entries.length === 1 ? "MOMENT" : "MOMENTS"}
        </Text>
        <Icon name="lock" color={colors.muted} size={17} />
      </View>
      {entries.length === 0 && (
        <GlassCard>
          <Text style={styles.heading}>A fresh page.</Text>
          <Text style={styles.body}>
            Your check-ins and reflections will appear here. Start with today,
            exactly as it is.
          </Text>
        </GlassCard>
      )}
      {visibleEntries.map(([day, entry]) => (
        <GlassCard key={day} padding={18} blur={false}>
          <View style={{ flexDirection: "row", gap: 16 }}>
            <Image
              accessibilityIgnoresInvertColors
              source={
                mode === "dark"
                  ? require("../../assets/backgrounds/midnight.jpg")
                  : require("../../assets/backgrounds/ethereal.jpg")
              }
              style={{ width: 62, height: 78, borderRadius: 16 }}
            />
            <View style={{ flex: 1, gap: 7 }}>
              <Text style={styles.eyebrow}>
                {new Date(`${day}T12:00:00`)
                  .toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })
                  .toUpperCase()}
              </Text>
              <Text style={styles.heading}>
                {moods.find((m) => m.id === entry.mood)?.label}
              </Text>
              <Text selectable style={styles.body}>
                {entry.note || "A feeling, without words. That’s enough."}
              </Text>
            </View>
          </View>
          {day === today && (
            <Pressable
              accessibilityRole="button"
              onPress={() => navigation.navigate("CheckIn")}
              style={[styles.row, { paddingVertical: 8 }]}
            >
              <Text style={styles.body}>Edit today’s reflection</Text>
              <Icon name="arrow" color={colors.text} size={18} />
            </Pressable>
          )}
        </GlassCard>
      ))}
      {pages > 1 && (
        <View style={{ gap: 12 }}>
          <Text style={styles.body}>
            Page {currentPage + 1} of {pages}
          </Text>
          {currentPage > 0 && (
            <Button
              title="More recent moments"
              secondary
              onPress={() => setPage(currentPage - 1)}
            />
          )}
          {currentPage < pages - 1 && (
            <Button
              title="Earlier moments"
              secondary
              onPress={() => setPage(currentPage + 1)}
            />
          )}
        </View>
      )}
      <Text style={[styles.body, { fontSize: 11 }]}>
        These are your existing daily check-ins. Writing today updates today’s
        entry. Journal content stays on your device unless you explicitly share
        a check-in with the AI companion.
      </Text>
    </Screen>
  );
}
