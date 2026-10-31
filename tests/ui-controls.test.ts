import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { parseDocument, DomUtils } from "htmlparser2";
import { Select } from "../src/themes/argon/components/ui/select";
import {
  matchOption,
  moveOption,
  placePopover,
} from "../src/themes/argon/components/ui/select-model";

const options = [
  { value: "all", label: "全部内容" },
  { value: "disabled", label: "不可用", disabled: true },
  { value: "article", label: "文章" },
  { value: "page", label: "页面" },
];
test("selection navigation wraps, skips disabled choices and handles empty options", () => {
  assert.equal(moveOption(options, 0, 1), 2);
  assert.equal(moveOption(options, 2, -1), 0);
  assert.equal(moveOption(options, 3, 1), 0);
  assert.equal(moveOption(options, 0, -1), 3);
  assert.equal(moveOption(options, -1, -1), 3);
  assert.equal(moveOption([], -1, 1), -1);
  assert.equal(
    moveOption([{ value: "x", label: "x", disabled: true }], 0, 1),
    -1,
  );
  assert.equal(matchOption(options, "文", 0), 2);
  assert.equal(matchOption(options, "不", 0), 0);
});
test("anchored controls flip above, fit a narrow viewport and reserve edge space", () => {
  const placement = placePopover(
    { left: 280, top: 650, bottom: 690, width: 110 },
    { width: 320, height: 740 },
    { width: 264, height: 240 },
  );
  assert.ok(placement.left >= 12);
  assert.ok(placement.left + placement.width <= 308);
  assert.ok(placement.top + 240 < 650);
  const short = placePopover(
    { left: 20, top: 90, bottom: 130, width: 110 },
    { width: 320, height: 200 },
    { width: 180, height: 320 },
  );
  assert.ok(short.top >= 12);
  assert.ok(short.top + short.maxHeight <= 188);
});
test("search selection preserves the default GET value before hydration without duplicate successful controls", () => {
  const html = renderToStaticMarkup(
    createElement(Select, {
      name: "type",
      label: "内容类型",
      defaultValue: "article",
      options,
    }),
  );
  const document = parseDocument(html);
  const controls = DomUtils.findAll(
    (node) => node.name === "input",
    document.children,
  );
  const radios = controls.filter((node) => node.attribs.type === "radio");
  assert.deepEqual(
    radios
      .filter((node) => "checked" in node.attribs)
      .map((node) => node.attribs.value),
    ["article"],
  );
  assert.ok(radios.every((node) => node.attribs.name === "type"));
  const hidden = controls.find((node) => node.attribs.type === "hidden")!;
  assert.equal(hidden.attribs.name, undefined);
  assert.equal(hidden.attribs.value, "article");
  assert.ok(!html.includes("<select"));
});
