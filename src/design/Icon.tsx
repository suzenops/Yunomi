import Svg, { Circle, Path } from "react-native-svg";
export type IconName =
  | "home"
  | "chat"
  | "orb"
  | "habits"
  | "journal"
  | "settings"
  | "arrow"
  | "plus"
  | "check"
  | "sun"
  | "moon"
  | "bell"
  | "lock";
const paths: Partial<Record<IconName, string>> = {
  home: "M3 10L12 3l9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z",
  chat: "M21 11a8 8 0 0 1-8 8H8l-5 3v-7a8 8 0 1 1 18-4Z",
  habits: "M9 6h12M9 12h12M9 18h12M3 5l1 1 2-2M3 11l1 1 2-2M3 17l1 1 2-2",
  journal:
    "M5 3h13a1 1 0 0 1 1 1v17H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2ZM5 17h14M8 7h7M8 11h5",
  settings: "M4 7h16M4 17h16M8 4v6M16 14v6",
  arrow: "M5 12h14M13 6l6 6-6 6",
  plus: "M12 5v14M5 12h14",
  check: "M5 12l4 4L19 6",
  moon: "M20 15a9 9 0 0 1-11-11 9 9 0 1 0 11 11Z",
  sun: "M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1 1M18 18l1 1M5 19l1-1M18 6l1-1",
  bell: "M5 17h14l-2-3V9a5 5 0 0 0-10 0v5ZM10 21h4",
  lock: "M5 10h14v11H5ZM8 10V6a4 4 0 0 1 8 0v4",
};
export function Icon({
  name,
  size = 22,
  color = "currentColor",
}: {
  name: IconName;
  size?: number;
  color?: string;
}) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={1.3}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {name === "orb" ? (
        <>
          <Circle cx="12" cy="12" r="8" />
          <Path d="M7 7c4 1 5 5 10 10M8 16c4-5 4-7 8-8" />
        </>
      ) : (
        <Path d={paths[name]} />
      )}
      {name === "sun" && <Circle cx="12" cy="12" r="4" />}
    </Svg>
  );
}
