import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { CacheCheckTimes } from "@/themes/argon/admin/settings/check-times";

test("cache check timestamps keep the received instants and use the local timezone", () => {
  const originalZone = process.env.TZ;
  process.env.TZ = "Asia/Tokyo";
  try {
    const html = renderToStaticMarkup(
      createElement(CacheCheckTimes, {
        checkedAt: "2026-11-16T05:05:06Z",
        lastSyncCheckAt: "2026-11-16T04:55:12Z",
        nextSyncCheckAt: "2026-11-16T05:10:12Z",
      }),
    );
    assert.match(html, /dateTime="2026-11-16T05:05:06Z"[^<]*14:05:06/);
    assert.match(
      html,
      /上次同步检查.*dateTime="2026-11-16T04:55:12Z"[^<]*13:55:12/,
    );
    assert.match(
      html,
      /下次同步检查.*dateTime="2026-11-16T05:10:12Z"[^<]*14:10:12/,
    );
  } finally {
    if (originalZone === undefined) delete process.env.TZ;
    else process.env.TZ = originalZone;
  }
});

test("cache check status never invents a recovery schedule for missing timestamps", () => {
  const html = renderToStaticMarkup(
    createElement(CacheCheckTimes, {
      checkedAt: "2026-11-16T05:05:06Z",
      lastSyncCheckAt: null,
      nextSyncCheckAt: null,
    }),
  );
  assert.equal(html.match(/<time /g)?.length, 1);
  assert.equal(html.match(/<dd>—<\/dd>/g)?.length, 2);
});
