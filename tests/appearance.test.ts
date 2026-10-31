import assert from "node:assert/strict";
import test from "node:test";
import { runInNewContext } from "node:vm";
import {
  appearance,
  readableAccent,
  initializeAppearance,
  APPEARANCE_KEY,
} from "../src/core/browser/appearance-policy";
test("appearance validates stored values and restores explicit system mode over a legacy selection", () => {
  assert.deepEqual(
    appearance({ mode: "system", amoled: true, accent: "#AABBCC" }, "dark"),
    { mode: "system", amoled: true, accent: "#aabbcc" },
  );
  assert.equal(appearance(null, "dark").mode, "dark");
  assert.equal(
    appearance({ accent: "url(javascript:bad)", mode: "guess" }).accent,
    "#673bb7",
  );
  for (const [mode, expected] of [
    ["system", undefined],
    ["dark", "dark"],
  ]) {
    const root = {
      dataset: {} as Record<string, string>,
      style: { setProperty() {} },
    };
    runInNewContext(initializeAppearance, {
      document: { documentElement: root },
      localStorage: {
        getItem: (key: string) =>
          key === APPEARANCE_KEY
            ? JSON.stringify({ mode, amoled: true })
            : "light",
      },
    });
    assert.equal(root.dataset.theme, expected);
    assert.equal(root.dataset.amoled, "true");
  }
});
test("custom accent extremes remain readable in both themes", () => {
  function luminance(rgb: number[]) {
    const values = rgb
      .map((n) => n / 255)
      .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
    return values[0] * 0.2126 + values[1] * 0.7152 + values[2] * 0.0722;
  }
  for (const dark of [true, false])
    for (const input of [
      "#ffffff",
      "#000000",
      "#ffff00",
      "#673bb7",
      "#00ffff",
      "#2466bd",
      "#237768",
      "#bb4371",
      "#aa5925",
    ]) {
      const color = readableAccent(input, dark)
        .slice(1)
        .match(/../g)!
        .map((value) => parseInt(value, 16));
      const foreground = luminance(color);
      const mix = (base: number[], ratio: number) =>
        base.map((value, index) => value * (1 - ratio) + color[index] * ratio);
      const surface = mix(
        dark ? [29, 32, 40] : [252, 252, 253],
        dark ? 0.08 : 0.04,
      );
      const soft = mix(
        dark ? [34, 37, 46] : [248, 249, 252],
        dark ? 0.12 : 0.02,
      );
      for (const backdrop of [
        dark ? [36, 33, 50] : [245, 241, 251],
        surface,
        soft,
        mix(surface, 0.09),
      ]) {
        const background = luminance(backdrop);
        assert.ok(
          (Math.max(foreground, background) + 0.05) /
            (Math.min(foreground, background) + 0.05) >=
            4.5,
          `${input} on ${backdrop} (${dark ? "dark" : "light"})`,
        );
      }
    }
});
