export const moods = [
  { id: "low", label: "Low", symbol: "☁" },
  { id: "heavy", label: "Heavy", symbol: "☂" },
  { id: "okay", label: "Okay", symbol: "◐" },
  { id: "good", label: "Good", symbol: "☀" },
  { id: "bright", label: "Bright", symbol: "✧" },
] as const;
export type MoodId = (typeof moods)[number]["id"];
export type MoodEntry = { mood: MoodId; note: string; updatedAt: string };
export type Habit = { id: string; name: string; completedDates: string[] };
export type WellnessData = {
  version: 1;
  moods: Record<string, MoodEntry>;
  habits: Habit[];
};

// Use the device's calendar date; UTC would reset the day at the wrong local time.
export function localDateKey(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
export function initialData(): WellnessData {
  return {
    version: 1,
    moods: {},
    habits: [
      { id: "water", name: "Drink a glass of water", completedDates: [] },
      { id: "outside", name: "Spend a moment outside", completedDates: [] },
      { id: "pause", name: "Take a mindful pause", completedDates: [] },
    ],
  };
}
export function toggleHabit(
  data: WellnessData,
  id: string,
  day: string,
): WellnessData {
  return {
    ...data,
    habits: data.habits.map((habit) =>
      habit.id !== id
        ? habit
        : {
            ...habit,
            completedDates: habit.completedDates.includes(day)
              ? habit.completedDates.filter((date) => date !== day)
              : [...habit.completedDates, day],
          },
    ),
  };
}
export function saveMood(
  data: WellnessData,
  day: string,
  mood: MoodId,
  note: string,
): WellnessData {
  return {
    ...data,
    moods: {
      ...data.moods,
      [day]: {
        mood,
        note: note.trim().slice(0, 500),
        updatedAt: new Date().toISOString(),
      },
    },
  };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function isDay(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value))
    return false;
  const date = new Date(`${value}T12:00:00`);
  return !Number.isNaN(date.getTime()) && localDateKey(date) === value;
}
// Validate stored data before using it. Invalid data is never silently overwritten.
export function parseData(raw: string): WellnessData {
  const value: unknown = JSON.parse(raw);
  if (
    !isObject(value) ||
    value.version !== 1 ||
    !isObject(value.moods) ||
    !Array.isArray(value.habits)
  )
    throw new Error("Invalid wellness data");
  for (const [day, entry] of Object.entries(value.moods)) {
    if (
      !isDay(day) ||
      !isObject(entry) ||
      !moods.some((mood) => mood.id === entry.mood) ||
      typeof entry.note !== "string" ||
      entry.note.length > 500 ||
      typeof entry.updatedAt !== "string" ||
      Number.isNaN(Date.parse(entry.updatedAt))
    )
      throw new Error("Invalid mood entry");
  }
  const ids = new Set<string>();
  for (const habit of value.habits) {
    if (
      !isObject(habit) ||
      typeof habit.id !== "string" ||
      !habit.id ||
      ids.has(habit.id) ||
      typeof habit.name !== "string" ||
      !habit.name.trim() ||
      habit.name.length > 60 ||
      !Array.isArray(habit.completedDates) ||
      !habit.completedDates.every(isDay)
    )
      throw new Error("Invalid habit");
    ids.add(habit.id);
  }
  return value as WellnessData;
}
