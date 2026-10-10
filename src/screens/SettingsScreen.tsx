import {
  Alert,
  Image,
  Linking,
  Pressable,
  Switch,
  Text,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Screen } from "../components/Screen";
import { Button } from "../components/Button";
import { PageHeading } from "../design/Typography";
import { GlassCard } from "../design/GlassCard";
import { Icon } from "../design/Icon";
import { useTheme } from "../theme";
import { useChat } from "../chat/ChatContext";
import { resetConnection } from "../services/companionApi";
import { privacyText } from "../../shared/conversation";
import type { ThemePreference } from "../design/appearance";
export function SettingsScreen() {
  const theme = useTheme();
  const { colors, styles } = theme;
  const chat = useChat();
  const choices: { value: ThemePreference; title: string; subtitle: string }[] =
    [
      { value: "light", title: "Ethereal Light", subtitle: "Light" },
      { value: "dark", title: "Midnight Flow", subtitle: "Dark" },
    ];
  return (
    <Screen>
      <PageHeading
        eyebrow="Make yourself at home"
        title={"Your space,\nyour way."}
        subtitle="A few thoughtful details to make Yunomi feel right for you."
      />
      <Text style={styles.eyebrow}>APPEARANCE</Text>
      <View style={{ flexDirection: "row", gap: 12 }}>
        {choices.map((choice) => (
          <Pressable
            key={choice.value}
            accessibilityRole="radio"
            accessibilityLabel={choice.title}
            accessibilityState={{
              selected: theme.preferences.theme === choice.value,
              disabled: !theme.ready,
            }}
            aria-checked={theme.preferences.theme === choice.value}
            disabled={!theme.ready}
            onPress={() => void theme.setPreference(choice.value)}
            style={{
              flex: 1,
              borderRadius: 24,
              overflow: "hidden",
              borderWidth: 2,
              borderColor:
                theme.preferences.theme === choice.value
                  ? colors.primary
                  : colors.border,
            }}
          >
            <View style={{ height: 156 }}>
              <Image
                source={
                  choice.value === "dark"
                    ? require("../../assets/backgrounds/midnight.jpg")
                    : require("../../assets/backgrounds/ethereal.jpg")
                }
                style={{ width: "100%", height: "100%" }}
              />
              <LinearGradient
                colors={[
                  "transparent",
                  choice.value === "dark"
                    ? "rgba(8,18,27,0.9)"
                    : "rgba(248,242,230,0.9)",
                ]}
                style={{ position: "absolute", inset: 0 }}
              />
              <View
                style={{
                  position: "absolute",
                  bottom: 16,
                  left: 14,
                  right: 14,
                  gap: 4,
                }}
              >
                <Text
                  style={[
                    styles.eyebrow,
                    {
                      fontSize: 8,
                      color: choice.value === "dark" ? "#F0F1EA" : "#26363A",
                    },
                  ]}
                >
                  {choice.subtitle.toUpperCase()}
                </Text>
                <Text
                  style={[
                    styles.heading,
                    {
                      fontSize: 21,
                      lineHeight: 24,
                      color: choice.value === "dark" ? "#F0F1EA" : "#26363A",
                    },
                  ]}
                >
                  {choice.title}
                </Text>
              </View>
            </View>
          </Pressable>
        ))}
      </View>
      <Button
        title={`${theme.preferences.theme === "system" ? "✓ " : ""}Use device appearance`}
        secondary
        disabled={!theme.ready}
        onPress={() => void theme.setPreference("system")}
      />
      <Text style={[styles.body, { fontSize: 11 }]}>
        System follows your phone’s Light or Dark appearance automatically.
      </Text>
      {!!theme.error && (
        <Text accessibilityRole="alert" style={styles.error}>
          {theme.error}
        </Text>
      )}
      <GlassCard>
        <View style={styles.row}>
          <View style={{ flex: 1, gap: 5 }}>
            <Text style={styles.heading}>A softer pace.</Text>
            <Text style={styles.body}>Slow ambient motion</Text>
          </View>
          <Switch
            accessibilityLabel="Slow ambient motion"
            value={theme.preferences.ambientMotion}
            disabled={!theme.ready}
            onValueChange={(v) => void theme.setAmbientMotion(v)}
            trackColor={{ true: colors.primary, false: colors.stroke }}
            thumbColor={colors.onPrimary}
          />
        </View>
        <Text style={[styles.body, { fontSize: 11 }]}>
          Your device’s Reduce Motion setting always takes priority. Reduce
          Transparency uses solid surfaces.
        </Text>
      </GlassCard>
      <GlassCard>
        <View style={styles.row}>
          <Icon name="bell" color={colors.text} />
          <Text style={[styles.heading, { flex: 1 }]}>Notifications</Text>
        </View>
        <Text style={styles.body}>
          Yunomi does not schedule notifications yet. There’s nothing to enable
          here.
        </Text>
        <Button
          title="Open device settings"
          secondary
          onPress={() =>
            void Linking.openSettings().catch(() =>
              Alert.alert(
                "Settings unavailable",
                "Open your device’s Settings app to manage Yunomi.",
              ),
            )
          }
        />
      </GlassCard>
      <GlassCard>
        <View style={styles.row}>
          <Icon name="lock" color={colors.text} />
          <Text style={[styles.heading, { flex: 1 }]}>Privacy, by choice.</Text>
        </View>
        <Text style={styles.body}>{privacyText}</Text>
        <Button
          title="Delete current conversation"
          secondary
          onPress={() =>
            Alert.alert(
              "Delete conversation?",
              "Your journal and saved memory remain. Provider records cannot be erased here.",
              [
                { text: "Cancel", style: "cancel" },
                { text: "Delete", style: "destructive", onPress: chat.clear },
              ],
            )
          }
        />
        <Button
          title="Stop AI sharing"
          secondary
          onPress={chat.revokeConsent}
        />
        <Button
          title="Forget companion memory"
          secondary
          onPress={() => void chat.forgetMemory()}
        />
        {!!chat.privacyError && (
          <Text style={styles.error}>{chat.privacyError}</Text>
        )}
        <Button
          title="Reset secure connection"
          secondary
          onPress={() =>
            Alert.alert(
              "Reset connection?",
              "This clears local sign-in credentials and the current chat, but preserves your journal and memory.",
              [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Reset",
                  onPress: () => {
                    chat.revokeConsent();
                    void resetConnection().catch(() =>
                      Alert.alert("Couldn’t reset", "Please try again."),
                    );
                  },
                },
              ],
            )
          }
        />
      </GlassCard>
      <Text style={[styles.body, { textAlign: "center", fontSize: 11 }]}>
        YUNOMI · LESS PRESSURE. MORE UNDERSTANDING.
      </Text>
    </Screen>
  );
}
