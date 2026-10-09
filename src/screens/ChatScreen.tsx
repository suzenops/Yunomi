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
import { Screen } from "../components/Screen";
import { Button } from "../components/Button";
import { useChat } from "../chat/ChatContext";
import { companionConfigured, resetConnection } from "../services/companionApi";
import { privacyText, type ConversationPath } from "../../shared/conversation";
import { colors, styles } from "../theme";
const choices: { path: ConversationPath; label: string }[] = [
  { path: "auto", label: "Follow my lead" },
  { path: "listen", label: "Just Listen" },
  { path: "encourage", label: "Encourage Me" },
  { path: "plan", label: "Help Me Plan" },
];
export function ChatScreen() {
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
  return (
    <Screen>
      <Text style={styles.eyebrow}>YOUR AI COMPANION</Text>
      <View style={{ gap: 10 }}>
        <Text style={styles.title}>A little room to talk.</Text>
        <Text style={styles.body}>
          I can listen, offer encouragement, or help you find a next step. You
          choose what you need.
        </Text>
      </View>
      {!companionConfigured && (
        <View style={[styles.card, { backgroundColor: colors.peach }]}>
          <Text style={styles.heading}>AI connection not configured</Text>
          <Text style={styles.body}>
            Chat needs a configured backend before Yunomi can reply. Your
            check-ins and habits still work.
          </Text>
        </View>
      )}
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {choices.map((choice) => (
          <Pressable
            key={choice.path}
            accessibilityRole="radio"
            accessibilityState={{
              selected: chat.path === choice.path,
              disabled: chat.busy,
            }}
            disabled={chat.busy}
            onPress={() => chat.setPath(choice.path)}
            style={{
              minHeight: 44,
              borderRadius: 22,
              padding: 12,
              backgroundColor:
                chat.path === choice.path ? colors.primary : colors.sage,
            }}
          >
            <Text
              style={{
                color: chat.path === choice.path ? colors.surface : colors.text,
              }}
            >
              {choice.label}
            </Text>
          </Pressable>
        ))}
      </View>
      {!chat.consent && (
        <View style={styles.card}>
          <Text style={styles.heading}>You decide what to share.</Text>
          <Text style={styles.body}>{privacyText}</Text>
          <Button title="Review and allow AI sharing" onPress={allow} />
        </View>
      )}
      {chat.state.messages.length === 0 && (
        <Text style={styles.body}>
          Start wherever you like. What would you like me to understand about
          your day?
        </Text>
      )}
      {chat.state.messages.map((message) => (
        <View
          key={message.id}
          style={[
            styles.card,
            {
              backgroundColor:
                message.role === "user" ? colors.sage : colors.surface,
            },
          ]}
        >
          <Text style={styles.eyebrow}>
            {message.role === "user"
              ? "YOU"
              : message.safety
                ? "SAFETY SUPPORT · NOT AN AI REPLY"
                : "YUNOMI · AI"}
          </Text>
          <Text selectable style={[styles.body, { color: colors.text }]}>
            {message.text}
          </Text>
        </View>
      ))}
      {chat.state.pending && (
        <View style={styles.card}>
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
        </View>
      )}
      {!!chat.state.error && (
        <View style={{ gap: 12 }}>
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
        </View>
      )}
      <View style={{ gap: 12 }}>
        <TextInput
          accessibilityLabel="Message to Yunomi"
          value={draft}
          onChangeText={setDraft}
          multiline
          maxLength={1500}
          editable={!chat.busy && !chat.state.pending}
          placeholder="What’s on your mind?"
          placeholderTextColor={colors.muted}
          style={[styles.input, { minHeight: 100, textAlignVertical: "top" }]}
        />
        <Button
          title={chat.busy ? "Waiting for Yunomi…" : "Send message"}
          disabled={
            !chat.consent || !draft.trim() || chat.busy || !!chat.state.pending
          }
          onPress={() => {
            const text = draft;
            setDraft("");
            void chat.send(text);
          }}
        />
      </View>
      <Button
        title={showPrivacy ? "Hide privacy and memory" : "Privacy and memory"}
        secondary
        onPress={() => setShowPrivacy(!showPrivacy)}
      />
      {showPrivacy && (
        <View style={styles.card}>
          <Text style={styles.heading}>Your words, your choice.</Text>
          <Text style={styles.body}>{privacyText}</Text>
          <Text style={styles.body}>
            Only the most recent 20 messages are included per request. Older
            messages drop out of context. Yunomi does not automatically extract
            memories or read other journal entries.
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
            Write only what you want remembered. Save replaces the previous
            detail and starts a fresh conversation.
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
                "This clears local sign-in credentials, stops sharing, and clears this chat. Your journal and saved memory remain. The next message creates a new anonymous session.",
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
        </View>
      )}
      <View style={{ gap: 10 }}>
        <Text style={styles.body}>
          Need urgent support? Contact local emergency services if you’re in
          immediate danger. US/Canada: call or text 988. Yunomi cannot monitor
          you or contact help.
        </Text>
        <Button
          title="Find real-world support"
          secondary
          onPress={() => {
            void Linking.openURL("https://findahelpline.com").catch(() =>
              Alert.alert(
                "Support link unavailable",
                "Visit findahelpline.com in your browser, or call local emergency services for immediate danger.",
              ),
            );
          }}
        />
      </View>
    </Screen>
  );
}
