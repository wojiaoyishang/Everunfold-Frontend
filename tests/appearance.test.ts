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
  function luminance(hex: string) {
    const values = hex
      .slice(1)
      .match(/../g)!
      .map((pair) => parseInt(pair, 16) / 255)
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
    ]) {
      const foreground = luminance(readableAccent(input, dark));
      const background = luminance(dark ? "#242132" : "#f5f1fb");
      assert.ok(
        (Math.max(foreground, background) + 0.05) /
          (Math.min(foreground, background) + 0.05) >=
          4.5,
      );
    }
});
