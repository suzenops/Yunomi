import test from "node:test";
import assert from "node:assert/strict";
import {
  defaultAppearance,
  parseAppearance,
  resolveTheme,
} from "../src/design/appearance.ts";
import { rollingWeek } from "../src/design/rhythm.ts";
test("system appearance follows device changes and explicit preference overrides system", () => {
  assert.equal(resolveTheme("system", "dark"), "dark");
  assert.equal(resolveTheme("system", "light"), "light");
  assert.equal(resolveTheme("system", "unspecified"), "light");
  assert.equal(resolveTheme("light", "dark"), "light");
  assert.equal(resolveTheme("dark", "light"), "dark");
});
test("appearance persistence round trips and rejects invalid preferences", () => {
  const value = {
    ...defaultAppearance(),
    theme: "dark" as const,
    ambientMotion: false,
  };
  assert.deepEqual(parseAppearance(JSON.stringify(value)), value);
  for (const raw of [
    "not json",
    "{}",
    '{"version":1,"theme":"blue","ambientMotion":true}',
    '{"version":1,"theme":"dark","ambientMotion":"false"}',
    "null",
  ])
    assert.throws(() => parseAppearance(raw));
});
test("weekly habit display uses local calendar dates across month and year boundaries", () => {
  assert.deepEqual(rollingWeek("2027-01-03"), [
    "2026-12-28",
    "2026-12-29",
    "2026-12-30",
    "2026-12-31",
    "2027-01-01",
    "2027-01-02",
    "2027-01-03",
  ]);
  assert.equal(rollingWeek("2026-03-03")[0], "2026-02-25");
  assert.throws(() => rollingWeek("2026-02-30"));
});

import { palettes } from "../src/design/palette.ts";
function luminance(hex: string) {
  const channels = hex
    .slice(1)
    .match(/../g)!
    .map((v) => parseInt(v, 16) / 255)
    .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}
function contrast(a: string, b: string) {
  const values = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (values[0] + 0.05) / (values[1] + 0.05);
}
test("both palettes meet normal-text contrast on solid readable surfaces and buttons", () => {
  for (const palette of Object.values(palettes)) {
    for (const text of [palette.text, palette.muted, palette.danger])
      assert.ok(contrast(text, palette.surface) >= 4.5);
    assert.ok(contrast(palette.onPrimary, palette.primary) >= 4.5);
  }
});
