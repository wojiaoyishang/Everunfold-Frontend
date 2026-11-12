import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { parseDocument, DomUtils } from "htmlparser2";
import { ConfirmDialog } from "../src/themes/argon/components/ui/confirm-dialog";
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
test("a calendar has a compact panel even when its trigger fills the form", () => {
  const anchor = { left: 200, top: 180, bottom: 222, width: 1000 };
  const viewport = { width: 1440, height: 900 };
  const calendar = { width: 304, maxWidth: 304, height: 360 };
  assert.equal(placePopover(anchor, viewport, calendar).width, 304);
  assert.equal(
    placePopover(anchor, viewport, { width: 180, height: 240 }).width,
    1000,
  );
  const narrow = placePopover(
    { ...anchor, left: 12, width: 280 },
    { width: 300, height: 680 },
    calendar,
  );
  assert.equal(narrow.left + narrow.width, 288);
});
test("search selection preserves the default GET value before hydration without duplicate successful controls", () => {
  const html = renderToStaticMarkup(
    createElement(Select, {
      name: "type",
      label: "内容类型",
      defaultValue: "article",
      id: "content-type",
      "aria-describedby": "content-type-hint",
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
  const trigger = DomUtils.findOne(
    (node) => node.attribs?.role === "combobox",
    document.children,
  );
  assert.equal(trigger?.attribs.id, "content-type");
  assert.equal(trigger?.attribs["aria-describedby"], "content-type-hint");
  assert.ok(!html.includes("<select"));
});

// Shared dialogs can be requested on the initial render without a browser DOM.
test("confirmation waits for hydration and never runs actions during SSR", () => {
  for (const open of [false, true]) {
    let actions = 0;
    const html = renderToStaticMarkup(
      createElement(ConfirmDialog, {
        open,
        title: "确认操作？",
        onConfirm: () => {
          actions += 1;
          return true;
        },
        onConfirmed: () => {
          actions += 1;
        },
        onCancel: () => {
          actions += 1;
        },
      }),
    );
    assert.equal(html, "");
    assert.equal(actions, 0);
  }
});
