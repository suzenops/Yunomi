import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { GlassCard } from "../design/GlassCard";
import { Orb } from "../design/Orb";
import { Icon } from "../design/Icon";
import { PageHeading } from "../design/Typography";
import { Screen } from "../components/Screen";
import { Button } from "../components/Button";
import { useChat } from "../chat/ChatContext";
import {
  companionConfigured,
  companionConfigurationIssues,
  companionConfigurationWarnings,
  resetConnection,
} from "../services/companionApi";
import { privacyText, type ConversationPath } from "../../shared/conversation";
import { useTheme } from "../theme";
const choices: { path: ConversationPath; label: string }[] = [
  { path: "auto", label: "Follow my lead" },
  { path: "listen", label: "Just Listen" },
  { path: "encourage", label: "Encourage Me" },
  { path: "plan", label: "Help Me Plan" },
];
export function ChatScreen() {
  const { colors, styles } = useTheme();
  const chat = useChat();
  const [draft, setDraft] = useState("");
  const [memoryDraft, setMemoryDraft] = useState("");
  const [showPrivacy, setShowPrivacy] = useState(false);
  function allow() {
    Alert.alert("Share with Yunomi’s AI?", privacyText, [
      { text: "Not now", style: "cancel" },
      { text: "Allow for this session", onPress: chat.grantConsent },
    ]);
  }
  function remove() {
    Alert.alert(
      "Delete this conversation?",
      "This clears this session’s chat, shared check-ins, and pending replies. It does not erase your journal, saved memory, or provider logs.",
      [
        { text: "Keep it", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            chat.clear();
            setDraft("");
          },
        },
      ],
    );
  }
  function saveMemory() {
    const text = memoryDraft.trim();
    if (!text) return;
    Alert.alert(
      "Save and use this memory?",
      `Only this detail will be saved on this device and included in future AI requests when sharing is allowed:\n\n${text}\n\nSaving memory starts a fresh conversation.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Save and use",
          onPress: () => {
            void chat.saveMemory(text);
          },
        },
      ],
    );
  }
  const disabled =
    !chat.consent || !draft.trim() || chat.busy || !!chat.state.pending;
  const composer = (
    <GlassCard padding={12} style={{ borderRadius: 30 }}>
      <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 10 }}>
        <TextInput
          accessibilityLabel="Message to Yunomi"
          value={draft}
          onChangeText={setDraft}
          multiline
          maxLength={1500}
          editable={!chat.busy && !chat.state.pending}
          placeholder="What’s on your mind?"
          placeholderTextColor={colors.muted}
          style={[
            styles.body,
            {
              flex: 1,
              minHeight: 44,
              maxHeight: 120,
              padding: 10,
              color: colors.text,
            },
          ]}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={chat.busy ? "Waiting for Yunomi" : "Send message"}
          accessibilityState={{ disabled }}
          disabled={disabled}
          onPress={() => {
            const text = draft;
            setDraft("");
            void chat.send(text);
          }}
          style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: colors.primary,
            opacity: disabled ? 0.4 : 1,
          }}
        >
          <View style={{ transform: [{ rotate: "-90deg" }] }}>
            <Icon name="arrow" color={colors.onPrimary} size={20} />
          </View>
        </Pressable>
      </View>
    </GlassCard>
  );
  return (
    <Screen
      background="liquid"
      footer={composer}
      scrollRevision={`${chat.state.pending?.id ?? chat.state.messages.at(-1)?.id ?? ""}${chat.state.error}`}
    >
      <View style={styles.row}>
        <Text style={styles.eyebrow}>YUNOMI · YOUR AI COMPANION</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Privacy and memory"
          onPress={() => setShowPrivacy(!showPrivacy)}
          style={{
            minWidth: 44,
            minHeight: 44,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon name="settings" color={colors.text} />
        </Pressable>
      </View>
      {chat.state.messages.length === 0 && !chat.state.pending && (
        <>
          <Orb size={130} />
          <PageHeading
            eyebrow="A space to be heard"
            title="Let it out."
            subtitle="A thought, a feeling, a little of your day. I’m here to follow your lead."
          />
        </>
      )}
      {!companionConfigured && (
        <GlassCard>
          <Text style={styles.heading}>AI connection not configured</Text>
          <Text style={styles.body}>
            {companionConfigurationIssues.join("\n\n")}
            {
              "\n\nRestart Expo with --clear after editing the root .env. Your check-ins and habits still work."
            }
          </Text>
        </GlassCard>
      )}
      {companionConfigurationWarnings.map((warning) => (
        <Text key={warning} style={styles.body}>
          {warning}
        </Text>
      ))}
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 7 }}>
        {choices.map((choice) => (
          <Pressable
            key={choice.path}
            accessibilityRole="radio"
            accessibilityState={{
              selected: chat.path === choice.path,
              disabled: chat.busy,
            }}
            aria-checked={chat.path === choice.path}
            disabled={chat.busy}
            onPress={() => chat.setPath(choice.path)}
            style={{
              minHeight: 44,
              borderRadius: 24,
              paddingHorizontal: 15,
              paddingVertical: 11,
              backgroundColor:
                chat.path === choice.path ? colors.primary : colors.subtle,
              borderWidth: 1,
              borderColor: colors.stroke,
            }}
          >
            <Text
              style={[
                styles.body,
                {
                  fontSize: 11,
                  color:
                    chat.path === choice.path ? colors.onPrimary : colors.text,
                },
              ]}
            >
              {choice.label}
            </Text>
          </Pressable>
        ))}
      </View>
      {!chat.consent && (
        <GlassCard>
          <Text style={styles.heading}>Your words. Your choice.</Text>
          <Text style={styles.body}>
            Chat content goes through Yunomi’s backend to OpenAI only after you
            allow sharing. Your journal stays private unless you choose to share
            a check-in.
          </Text>
          <Button
            title="Review and allow AI sharing"
            icon="arrow"
            onPress={allow}
          />
        </GlassCard>
      )}
      {showPrivacy && (
        <GlassCard>
          <Text style={styles.heading}>Your space, protected.</Text>
          <Text style={styles.body}>{privacyText}</Text>
          <Text style={styles.body}>
            Only the most recent 20 messages are included per request. Yunomi
            does not automatically extract memories or read other journal
            entries.
          </Text>
          <Button title="Delete conversation" secondary onPress={remove} />
          {chat.consent && (
            <Button
              title="Stop AI sharing and clear chat"
              secondary
              onPress={() => {
                chat.revokeConsent();
                setDraft("");
              }}
            />
          )}
          <Text style={styles.heading}>
            Optional memory · {chat.memoryEnabled ? "on" : "off"}
          </Text>
          {!!chat.memory && (
            <>
              <Text selectable style={styles.body}>
                Saved detail: {chat.memory}
              </Text>
              {!chat.memoryEnabled && (
                <Button
                  title="Review and use saved detail"
                  secondary
                  onPress={() =>
                    Alert.alert(
                      "Use saved memory?",
                      `This detail will be included with future AI messages:\n\n${chat.memory}`,
                      [
                        { text: "Cancel", style: "cancel" },
                        {
                          text: "Use memory",
                          onPress: () => void chat.saveMemory(chat.memory),
                        },
                      ],
                    )
                  }
                />
              )}
            </>
          )}
          <Text style={styles.body}>
            Save only what you want remembered. Saving starts a fresh
            conversation.
          </Text>
          <TextInput
            accessibilityLabel="Optional memory detail"
            value={memoryDraft}
            onChangeText={setMemoryDraft}
            multiline
            maxLength={500}
            style={styles.input}
            placeholder="For example: I prefer small, practical steps."
            placeholderTextColor={colors.muted}
          />
          <Button
            title="Review, save, and use memory"
            secondary
            disabled={!memoryDraft.trim() || !chat.memoryReady || chat.busy}
            onPress={saveMemory}
          />
          <Button
            title="Turn off and forget memory"
            secondary
            onPress={() => {
              void chat.forgetMemory();
              setMemoryDraft("");
            }}
          />
          {!!chat.privacyError && (
            <Text accessibilityRole="alert" style={styles.error}>
              {chat.privacyError}
            </Text>
          )}
          <Button
            title="Reset secure connection"
            secondary
            onPress={() =>
              Alert.alert(
                "Reset connection?",
                "This clears local sign-in credentials, stops sharing, and clears this chat. Your journal and saved memory remain.",
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
      )}
      <Text style={[styles.body, { fontSize: 11 }]}>
        Yunomi is AI, not a therapist or emergency service. For immediate
        danger, contact local emergency services. US/Canada: call or text 988.
      </Text>
      <Button
        title="Find real-world support"
        secondary
        onPress={() =>
          void Linking.openURL("https://findahelpline.com").catch(() =>
            Alert.alert(
              "Support link unavailable",
              "Visit findahelpline.com in your browser, or call local emergency services for immediate danger.",
            ),
          )
        }
      />
      {chat.state.messages.map((message) => (
        <View
          key={message.id}
          style={[
            styles.card,
            {
              maxWidth: "94%",
              alignSelf: message.role === "user" ? "flex-end" : "flex-start",
              backgroundColor:
                message.role === "user" ? colors.sage : colors.glass,
              borderBottomRightRadius: message.role === "user" ? 8 : 26,
              borderBottomLeftRadius: message.role === "assistant" ? 8 : 26,
            },
          ]}
        >
          <Text style={[styles.eyebrow, { fontSize: 8 }]}>
            {message.role === "user"
              ? "YOU"
              : message.safety
                ? "SAFETY SUPPORT · NOT AN AI REPLY"
                : "YUNOMI · AI"}
          </Text>
          <Text
            selectable
            style={[styles.body, { color: colors.text, fontSize: 15 }]}
          >
            {message.text}
          </Text>
        </View>
      ))}
      {chat.state.pending && (
        <GlassCard>
          <Text style={styles.eyebrow}>
            {chat.busy ? "SENDING" : "REPLY NOT RECEIVED"}
          </Text>
          <Text style={styles.body}>
            {chat.state.pending.request.journal
              ? `Shared check-in: ${chat.state.pending.request.journal.note || chat.state.pending.request.journal.mood}`
              : chat.state.pending.text}
          </Text>
          {chat.busy && (
            <ActivityIndicator
              color={colors.primary}
              accessibilityLabel="Yunomi is preparing a reply"
            />
          )}
        </GlassCard>
      )}
      {!!chat.state.error && (
        <GlassCard>
          <Text accessibilityRole="alert" style={styles.error}>
            {chat.state.error}
          </Text>
          {chat.state.pending && (
            <>
              <Button
                title="Retry previous message"
                disabled={chat.busy || !chat.consent}
                onPress={() => void chat.retry()}
              />
              <Button
                title="Discard and start fresh"
                secondary
                onPress={chat.clear}
              />
            </>
          )}
        </GlassCard>
      )}
    </Screen>
  );
}
