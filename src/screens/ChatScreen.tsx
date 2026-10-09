import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import * as SecureStore from "expo-secure-store";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import type { TabParamList } from "../navigation/AppNavigator";
import { Screen } from "../components/Screen";
import { Button } from "../components/Button";
import { loadMemory, saveMemory, forgetMemory } from "../chat/memory";
import { useChat } from "../chat/ChatContext";
import type { Mode } from "../chat/conversation";
import { styles, colors } from "../theme";

export function ChatScreen({
  route,
  navigation,
}: BottomTabScreenProps<TabParamList, "Chat">) {
  const { conversation, state } = useChat();
  const [text, setText] = useState("");
  const [mode, setMode] = useState<Mode>("adapt");
  const [consent, setConsent] = useState(false);
  const [memory, setMemory] = useState("");
  const [memoryEnabled, setMemoryEnabled] = useState(false);
  const [memoryLoaded, setMemoryLoaded] = useState(false);
  const [token, setToken] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const journal = route.params?.journal;
  async function act(action: () => Promise<void>) {
    setNotice("");
    try {
      await action();
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : "That couldn’t be saved. Try again.",
      );
    }
  }
  async function send(share = false) {
    await act(async () => {
      await conversation.send({
        text: share ? "Please respond to my check-in." : text,
        mode,
        consent,
        ...(share && journal ? { journal, journalConsent: true } : {}),
        ...(memoryEnabled ? { memory } : {}),
      });
      setText("");
      if (share) navigation.setParams({ journal: undefined });
    });
  }
  function clear() {
    Alert.alert(
      "Delete conversation?",
      "This clears the chat and pending check-in on this device. It cannot erase data already sent to the provider. Your journal stays saved.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            conversation.delete();
            setText("");
            setConsent(false);
            setNotice("");
            navigation.setParams({ journal: undefined });
          },
        },
      ],
    );
  }
  return (
    <Screen>
      <Text style={styles.eyebrow}>HERE WITH YOU</Text>
      <Text style={styles.title}>Talk to Yunomi</Text>
      <Text style={styles.body}>
        A little space to be heard. Yunomi is AI, not a therapist or an
        emergency service.
      </Text>
      <View style={styles.card}>
        <Text style={styles.heading}>Before we talk</Text>
        <Text style={styles.body}>
          Messages you send, recent conversation context, and any enabled memory
          go through our backend to OpenAI. Your journal stays private unless
          you tap “Share this check-in”.
        </Text>
        <Text style={styles.body}>
          Chats stay in this session until the app is fully closed or you delete
          them. Our backend stores no chats. OpenAI may retain abuse-monitoring
          data for up to 30 days under its standard API policy. Deleting here
          does not delete provider records. Saved memory stays in device secure
          storage until you forget it; device backups may retain copies.
        </Text>
        <View style={styles.row}>
          <Text style={[styles.body, { flex: 1 }]}>
            I agree to send my chat messages to OpenAI.
          </Text>
          <Switch
            accessibilityLabel="Consent to AI chat sharing"
            value={consent}
            disabled={state.busy}
            onValueChange={(value) => {
              if (!value) {
                conversation.delete();
                setText("");
              }
              setConsent(value);
            }}
          />
        </View>
      </View>
      {journal && (
        <View style={[styles.card, { backgroundColor: colors.lavender }]}>
          <Text style={styles.heading}>Your check-in · {journal.mood}</Text>
          <Text style={styles.body}>
            {journal.note || "No journal note added."}
          </Text>
          <Text style={styles.body}>
            Share only this check-in with OpenAI to get a personal response. No
            other journal entries are sent.
          </Text>
          <Button
            title="Share this check-in with OpenAI"
            disabled={!consent || state.busy || state.retry}
            onPress={() => void send(true)}
          />
          <Button
            secondary
            title="Keep my check-in private"
            onPress={() => navigation.setParams({ journal: undefined })}
          />
        </View>
      )}
      <View style={styles.card}>
        <Text style={styles.heading}>What would help?</Text>
        {(
          [
            ["adapt", "Go with the flow"],
            ["listen", "Just Listen"],
            ["encourage", "Encourage Me"],
            ["plan", "Help Me Plan"],
          ] as const
        ).map(([id, label]) => (
          <Button
            key={id}
            title={`${mode === id ? "✓ " : ""}${label}`}
            secondary={mode !== id}
            disabled={state.busy}
            onPress={() => setMode(id)}
          />
        ))}
        <Text style={styles.body}>Change direction whenever you like.</Text>
      </View>
      {state.messages.map((message, index) => (
        <View
          key={index}
          style={[
            styles.card,
            {
              backgroundColor:
                message.role === "user" ? colors.sage : colors.surface,
            },
          ]}
        >
          <Text style={styles.eyebrow}>
            {message.role === "user" ? "YOU" : "YUNOMI"}
          </Text>
          <Text selectable style={styles.body}>
            {message.content}
          </Text>
        </View>
      ))}
      {state.busy && (
        <View accessibilityLiveRegion="polite">
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.body}>Yunomi is thinking…</Text>
        </View>
      )}
      {!!state.error && (
        <Text accessibilityRole="alert" style={styles.error}>
          {state.error}
        </Text>
      )}
      {state.retry && (
        <Button
          title="Retry response"
          disabled={state.busy || !consent}
          onPress={() => void act(() => conversation.retry())}
        />
      )}
      <TextInput
        accessibilityLabel="Message Yunomi"
        placeholder="What’s on your mind?"
        placeholderTextColor={colors.muted}
        multiline
        maxLength={2000}
        value={text}
        onChangeText={setText}
        editable={!state.busy && !state.retry}
        style={[styles.input, { minHeight: 100 }]}
      />
      <Button
        title="Send message"
        disabled={!consent || !text.trim() || state.busy || state.retry}
        onPress={() => void send()}
      />
      <Button title="Delete conversation" secondary onPress={clear} />
      <Button
        title={
          settingsOpen
            ? "Close memory & connection settings"
            : "Memory & connection settings"
        }
        secondary
        onPress={() => setSettingsOpen(!settingsOpen)}
      />
      {settingsOpen && (
        <>
          <View style={styles.card}>
            <Text style={styles.heading}>Memory you control</Text>
            <Text style={styles.body}>
              Optional: write a preference you want Yunomi to know. No automatic
              memories or saved transcripts. Turning memory off deletes the
              saved note; it does not retract earlier sharing.
            </Text>
            {!memoryLoaded && (
              <Button
                secondary
                title="Load my saved memory"
                onPress={() =>
                  void act(async () => {
                    const saved = await loadMemory(SecureStore);
                    setMemory(saved ?? "");
                    setMemoryEnabled(saved !== null);
                    setMemoryLoaded(true);
                  })
                }
              />
            )}
            <Button
              title="Forget saved memory"
              secondary
              disabled={state.busy}
              onPress={() =>
                void act(async () => {
                  await forgetMemory(SecureStore);
                  setMemory("");
                  setMemoryEnabled(false);
                  setMemoryLoaded(true);
                  conversation.delete();
                  setNotice("Memory forgotten and conversation cleared.");
                })
              }
            />
            <Switch
              accessibilityLabel="Use optional memory"
              value={memoryEnabled}
              disabled={state.busy || !memoryLoaded}
              onValueChange={(value) =>
                void act(async () => {
                  if (!value) {
                    await forgetMemory(SecureStore);
                    setMemory("");
                    conversation.delete();
                  }
                  setMemoryEnabled(value);
                })
              }
            />
            {memoryEnabled && (
              <>
                <TextInput
                  accessibilityLabel="Memory note"
                  value={memory}
                  onChangeText={setMemory}
                  maxLength={500}
                  multiline
                  style={styles.input}
                  editable={!state.busy}
                />
                <Button
                  title="Save memory on this device"
                  disabled={state.busy}
                  onPress={() =>
                    void act(async () => {
                      await saveMemory(SecureStore, memory);
                      setNotice(
                        "Memory saved. It will be shared with future messages while enabled.",
                      );
                    })
                  }
                />
              </>
            )}
          </View>
          <View style={styles.card}>
            <Text style={styles.heading}>Backend connection</Text>
            <Text style={styles.body}>
              Enter your personal backend access token from your administrator.
              Never enter an OpenAI API key here. The backend URL is set at
              build time.
            </Text>
            <TextInput
              accessibilityLabel="Personal backend access token"
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              value={token}
              onChangeText={setToken}
              style={styles.input}
            />
            <Button
              title="Save access token securely"
              disabled={!token.trim() || state.busy}
              onPress={() =>
                void act(async () => {
                  await SecureStore.setItemAsync(
                    "yunomi.backend.token",
                    token.trim(),
                  );
                  setToken("");
                  setNotice("Access token saved securely.");
                })
              }
            />
            <Button
              title="Disconnect backend"
              secondary
              disabled={state.busy}
              onPress={() =>
                void act(async () => {
                  await SecureStore.deleteItemAsync("yunomi.backend.token");
                  conversation.delete();
                  setConsent(false);
                  setNotice("Disconnected.");
                })
              }
            />
          </View>
        </>
      )}
      {!!notice && (
        <Text accessibilityLiveRegion="polite" style={styles.body}>
          {notice}
        </Text>
      )}
      <Text style={styles.body}>
        If you may hurt yourself or someone else, or are in immediate danger,
        contact local emergency services now and reach someone you trust. In the
        US or Canada, call or text 988 for crisis support.
      </Text>
    </Screen>
  );
}
