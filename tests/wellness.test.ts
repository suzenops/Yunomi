import test from "node:test";
import assert from "node:assert/strict";
import {
  initialData,
  localDateKey,
  parseData,
  saveMood,
  toggleHabit,
} from "../src/utils/wellness.ts";

test("calendar keys follow local dates, including year boundaries", () => {
  assert.equal(localDateKey(new Date(2026, 11, 31, 23, 59)), "2026-12-31");
  assert.equal(localDateKey(new Date(2027, 0, 1, 0, 1)), "2027-01-01");
});
test("habit completion is reversible and preserves other days without mutation", () => {
  const original = initialData();
  const yesterday = toggleHabit(original, "water", "2026-10-08");
  const today = toggleHabit(yesterday, "water", "2026-10-09");
  assert.deepEqual(original.habits[0].completedDates, []);
  assert.deepEqual(today.habits[0].completedDates, [
    "2026-10-08",
    "2026-10-09",
  ]);
  assert.deepEqual(
    toggleHabit(today, "water", "2026-10-09").habits[0].completedDates,
    ["2026-10-08"],
  );
});
test("editing a mood replaces only that day and trims notes", () => {
  const first = saveMood(initialData(), "2026-10-08", "good", "First");
  const second = saveMood(first, "2026-10-09", "low", "  A pause  ");
  const edited = saveMood(second, "2026-10-09", "okay", "Better");
  assert.equal(second.moods["2026-10-09"].note, "A pause");
  assert.equal(edited.moods["2026-10-08"].note, "First");
  assert.equal(edited.moods["2026-10-09"].mood, "okay");
  assert.equal(Object.keys(edited.moods).length, 2);
});
test("storage round trips and rejects malformed records", () => {
  const data = saveMood(initialData(), "2026-10-09", "bright", "Hello");
  assert.deepEqual(parseData(JSON.stringify(data)), data);
  for (const raw of [
    "no json",
    "{}",
    '{"version":2}',
    JSON.stringify({
      ...data,
      moods: { "2026-02-30": data.moods["2026-10-09"] },
    }),
    JSON.stringify({ ...data, habits: [data.habits[0], data.habits[0]] }),
    JSON.stringify({
      ...data,
      moods: {
        "2026-10-09": {
          mood: "invalid",
          note: "",
          updatedAt: new Date().toISOString(),
        },
      },
    }),
  ]) {
    assert.throws(() => parseData(raw));
  }
});
