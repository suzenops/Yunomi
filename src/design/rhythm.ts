import { localDateKey } from "../utils/wellness.ts";
export function rollingWeek(today: string) {
  const end = new Date(`${today}T12:00:00`);
  if (Number.isNaN(end.getTime()) || localDateKey(end) !== today)
    throw new Error("Invalid day");
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(end);
    date.setDate(end.getDate() - 6 + index);
    return localDateKey(date);
  });
}
