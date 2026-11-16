import assert from "node:assert/strict";
import test from "node:test";
import { hexColor, hexToHsv, hsvToHex } from "../src/core/colors";

test("the palette retains exact RGB colors and handles neutral shades", () => {
  for (const hex of [
    "#000000",
    "#ffffff",
    "#888888",
    "#1278ae",
    "#ffd591",
    "#f00047",
  ])
    assert.equal(hsvToHex(hexToHsv(hex)), hex);
  assert.equal(hsvToHex({ hue: 120, saturation: 1, value: 1 }), "#00ff00");
  assert.equal(hexColor("#AbC"), "#aabbcc");
  assert.equal(hexColor("inherit"), undefined);
});
