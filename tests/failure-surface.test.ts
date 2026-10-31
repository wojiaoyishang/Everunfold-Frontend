import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { parseDocument, DomUtils } from "htmlparser2";
import { createPairGame } from "../src/themes/argon/failure/pair-game";
import { failureDocument } from "../src/themes/argon/failure/document";
import { FailureSurface } from "../src/themes/argon/failure/failure-surface";
import { ColorPicker } from "../src/themes/argon/components/ui/color-picker";

test("pair game ignores double clicks, invalid cards and input while an unmatched pair is visible", () => {
  const game = createPairGame(() => 0.999);
  assert.deepEqual(game.flip(0).deck, []);
  const first = game.restart();
  assert.deepEqual([...first.deck].sort(), [0, 0, 1, 1, 2, 2, 3, 3]);
  game.flip(0);
  game.flip(0);
  game.flip(-1);
  game.flip(1.5);
  game.flip(8);
  assert.deepEqual(game.snapshot().revealed, [0]);
  const pending = game.flip(1);
  assert.equal(pending.moves, 1);
  assert.equal(pending.pending, true);
  assert.deepEqual(game.flip(2), pending);
  assert.deepEqual(game.conceal().revealed, []);
  assert.deepEqual(game.snapshot().matched, []);
});

test("pair game completes only with four distinct pairs and restart clears all progress", () => {
  const game = createPairGame(() => 0.999);
  game.restart();
  for (let index = 0; index < 4; index++) {
    game.flip(index);
    game.flip(index + 4);
    game.flip(index);
  }
  const complete = game.snapshot();
  assert.equal(complete.complete, true);
  assert.equal(complete.moves, 4);
  complete.matched.length = 0;
  assert.equal(game.snapshot().matched.length, 8);
  const restarted = game.restart();
  assert.equal(restarted.moves, 0);
  assert.equal(restarted.complete, false);
  assert.deepEqual(restarted.matched, []);
});

test("fallback HTML contains readable recovery and no external asset dependency or private error", () => {
  for (const status of [404, 503] as const) {
    const html = failureDocument(status);
    const document = parseDocument(html);
    const title = DomUtils.findOne(
      (node) => node.name === "h1",
      document.children,
    );
    assert.match(DomUtils.textContent(title!), /页面未找到|页面加载失败/);
    assert.match(html, /name="robots" content="noindex,nofollow"/);
    assert.ok(
      DomUtils.findOne(
        (node) => node.name === "a" && node.attribs.href === "/",
        document.children,
      ),
    );
    assert.equal(
      DomUtils.findAll(
        (node) =>
          ["script", "img", "link", "iframe"].includes(node.name) &&
          Boolean(node.attribs.src || node.attribs.href),
        document.children,
      ).length,
      0,
    );
    const cards = DomUtils.findAll(
      (node) => node.name === "button" && "data-card" in node.attribs,
      document.children,
    );
    assert.equal(cards.length, 8);
    assert.ok(
      cards.every(
        (card) =>
          "disabled" in card.attribs &&
          card.attribs.class.includes("ui-button"),
      ),
    );
    assert.match(html, /启用 JavaScript 后可玩配对/);
    assert.doesNotMatch(html, /data-page-ready|BACKEND_BASE_URL|stack trace/);
  }
  assert.match(
    renderToStaticMarkup(createElement(FailureSurface, { status: 500 })),
    /页面显示出错了/,
  );
});

test("anchored color controls cannot natively open before hydration", () => {
  const document = parseDocument(
    renderToStaticMarkup(
      createElement(ColorPicker, { value: "#673bb7", onChange: () => {} }),
    ),
  );
  const trigger = DomUtils.findOne(
    (node) => node.name === "button" && "popovertarget" in node.attribs,
    document.children,
  );
  assert.ok(trigger && "disabled" in trigger.attribs);
  const panel = DomUtils.findOne(
    (node) => node.attribs.class?.includes("ui-anchored-panel"),
    document.children,
  );
  assert.ok(panel && !panel.attribs["data-positioned"]);
});
