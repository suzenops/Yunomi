import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { ActivityIndicator, AppState, Text, View } from "react-native";
import {
  initialData,
  localDateKey,
  parseData,
  saveMood,
  toggleHabit,
  type MoodId,
  type WellnessData,
} from "../utils/wellness";
import { useTheme } from "../theme";
import { Button } from "../components/Button";

const STORAGE_KEY = "@yunomi/wellness/v1";
type WellnessContextValue = {
  data: WellnessData;
  today: string;
  checkIn: (mood: MoodId, note: string) => Promise<void>;
  toggle: (id: string) => Promise<void>;
  addHabit: (name: string) => Promise<void>;
  removeHabit: (id: string) => Promise<void>;
};
const WellnessContext = createContext<WellnessContextValue | null>(null);

export function WellnessProvider({ children }: { children: ReactNode }) {
  const { colors, styles } = useTheme();
  const [data, setData] = useState(initialData);
  const current = useRef(data);
  const queue = useRef<Promise<void>>(Promise.resolve());
  const [today, setToday] = useState(localDateKey);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState(false);

  async function load() {
    setLoadError(false);
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      const loaded = raw === null ? initialData() : parseData(raw);
      current.current = loaded;
      setData(loaded);
      setReady(true);
    } catch {
      setLoadError(true);
    }
  }
  useEffect(() => {
    void load();
  }, []);
  useEffect(() => {
    const refresh = () => setToday(localDateKey());
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") refresh();
    });
    const timer = setInterval(refresh, 30_000);
    return () => {
      subscription.remove();
      clearInterval(timer);
    };
  }, []);

  // Serialize writes so fast taps cannot lose updates. Publish only after saving succeeds.
  function update(
    change: (previous: WellnessData) => WellnessData,
  ): Promise<void> {
    const pending = queue.current.then(async () => {
      const next = change(current.current);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      current.current = next;
      setData(next);
      setToday(localDateKey());
    });
    queue.current = pending.catch(() => {});
    return pending;
  }

  if (!ready)
    return (
      <View
        style={{
          flex: 1,
          padding: 32,
          justifyContent: "center",
          gap: 20,
          backgroundColor: colors.background,
        }}
      >
        {loadError ? (
          <>
            <Text style={styles.heading}>Your journal couldn’t be opened</Text>
            <Text style={styles.body}>
              Your saved data has been left untouched. Try opening it again.
            </Text>
            <Button title="Try again" onPress={() => void load()} />
          </>
        ) : (
          <ActivityIndicator
            color={colors.primary}
            accessibilityLabel="Opening your journal"
          />
        )}
      </View>
    );

  return (
    <WellnessContext.Provider
      value={{
        data,
        today,
        checkIn: (mood, note) =>
          update((previous) => saveMood(previous, localDateKey(), mood, note)),
        toggle: (id) =>
          update((previous) => toggleHabit(previous, id, localDateKey())),
        addHabit: (name) =>
          update((previous) => {
            const trimmed = name.trim();
            if (!trimmed || trimmed.length > 60)
              throw new Error("Use a habit name between 1 and 60 characters.");
            if (
              previous.habits.some(
                (habit) => habit.name.toLowerCase() === trimmed.toLowerCase(),
              )
            )
              throw new Error("That habit is already in your list.");
            return {
              ...previous,
              habits: [
                ...previous.habits,
                {
                  id: `habit-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
                  name: trimmed,
                  completedDates: [],
                },
              ],
            };
          }),
        removeHabit: (id) =>
          update((previous) => ({
            ...previous,
            habits: previous.habits.filter((habit) => habit.id !== id),
          })),
      }}
    >
      {children}
    </WellnessContext.Provider>
  );
}

export function useWellness() {
  const context = useContext(WellnessContext);
  if (!context) throw new Error("useWellness requires WellnessProvider");
  return context;
}
