import assert from "node:assert/strict";
import test from "node:test";
import {
  reducePagePresentation,
  type PagePresentationState,
} from "../src/core/navigation/presentation";
import { snapshot } from "./fixtures";

test("late cleanup from an old route cannot clear a newer sidebar registration", () => {
  const site = snapshot().site;
  const first = Symbol("first-page");
  const second = Symbol("second-page");
  const empty: PagePresentationState = { site, current: null };
  const oldPage = reducePagePresentation(empty, {
    type: "register",
    token: first,
    value: {
      route: "/first.html",
      site,
      id: "first",
      toc: [{ id: "old", text: "旧目录", level: 2 }],
    },
  });
  const newPage = reducePagePresentation(oldPage, {
    type: "register",
    token: second,
    value: {
      route: "/second.html",
      site,
      id: "second",
      toc: [{ id: "new", text: "新目录", level: 2 }],
    },
  });
  const afterLateCleanup = reducePagePresentation(newPage, {
    type: "release",
    token: first,
  });
  assert.equal(afterLateCleanup, newPage);
  assert.equal(afterLateCleanup.current?.id, "second");
  assert.equal(afterLateCleanup.current?.toc[0].id, "new");
});

test("same-route error cleanup clears the old TOC without reverting the latest site", () => {
  const site = snapshot().site;
  const latestSite = { ...site, name: "更新后的站点" };
  const beforeReset = Symbol("before-reset");
  const afterReset = Symbol("after-reset");
  let state = reducePagePresentation(
    { site, current: null },
    {
      type: "register",
      token: beforeReset,
      value: {
        route: "/article.html",
        site: latestSite,
        id: "article",
        toc: [{ id: "heading", text: "正文目录", level: 2 }],
      },
    },
  );
  state = reducePagePresentation(state, {
    type: "release",
    token: beforeReset,
  });
  assert.equal(state.current, null);
  assert.equal(state.site.name, latestSite.name);
  state = reducePagePresentation(state, {
    type: "register",
    token: afterReset,
    value: { route: "/article.html", site: latestSite, id: "article", toc: [] },
  });
  state = reducePagePresentation(state, {
    type: "release",
    token: beforeReset,
  });
  assert.equal(state.current?.token, afterReset);
  assert.deepEqual(state.current?.toc, []);
});
