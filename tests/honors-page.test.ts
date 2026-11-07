import assert from "node:assert/strict";
import test from "node:test";
import {
  filterHonors,
  honorUrl,
  readHonors,
} from "../src/plugins/honors/model";
import { honorsText } from "../src/plugins/honors/labels";
import {
  pageManifest,
  localizedPageImplementations,
} from "../src/core/pages/registry";

const source = {
  honors: [
    {
      title: "Research",
      category: "Awards",
      date: "2024.2.29",
      award: "First prize",
      image_url: "https://media.example.test/a.webp",
      custom: { keep: true },
    },
    {
      title: "Appointment",
      category: "Appointments",
      date: "2022.9",
      description: "Student service",
    },
    {
      title: "Unknown date",
      category: "Awards",
      date: "2025.2.29",
      image_url: "javascript:bad()",
    },
    {
      title: "Latest",
      category: "Awards",
      date: "2025-06-18",
      image_url: "/media/certificate.webp",
      link_url: "https://example.test/results",
    },
  ],
  future: { version: 2 },
};

test("honors accepts open saved data, keeps original order, and renders malformed rows defensively", () => {
  const original = structuredClone(source);
  const model = readHonors({
    ...source,
    honors: [...source.honors, null, false, [], { title: "   " }],
  });
  assert.equal(model.items.length, 4);
  assert.deepEqual(model.categories, ["Awards", "Appointments"]);
  assert.deepEqual(model.years, ["2025", "2024", "2022"]);
  assert.equal(model.items[2].dateKey, null);
  assert.equal(model.items[2].image, null);
  assert.equal(model.items[0].dateKey, 20240229);
  assert.equal(model.sort, "manual");
  assert.deepEqual(source, original);
  assert.deepEqual(readHonors(null).items, []);
  assert.equal(
    readHonors({ layout: "unknown", honors: "invalid" }).layout,
    "grid",
  );
});

test("honor filtering combines arbitrary categories, years and description search without mutating records", () => {
  const { items } = readHonors(source);
  assert.deepEqual(
    filterHonors(items, { category: "Appointments", query: " STUDENT " }).map(
      (item) => item.title,
    ),
    ["Appointment"],
  );
  assert.deepEqual(
    filterHonors(items, {
      category: "Awards",
      year: "2025",
      query: "latest",
    }).map((item) => item.title),
    ["Latest"],
  );
  assert.deepEqual(
    filterHonors(items, { query: "first prize" }).map((item) => item.title),
    ["Research"],
  );
  assert.equal(filterHonors(items, { category: "Not present" }).length, 0);
  assert.equal(filterHonors(items, { year: "2023" }).length, 0);
  assert.equal(items[0].title, "Research");
});

test("date ordering handles partial dates and keeps unknown dates last in both directions", () => {
  const { items } = readHonors(source);
  assert.deepEqual(
    filterHonors(items, { order: "newest" }).map((item) => item.title),
    ["Latest", "Research", "Appointment", "Unknown date"],
  );
  assert.deepEqual(
    filterHonors(items, { order: "oldest" }).map((item) => item.title),
    ["Appointment", "Research", "Latest", "Unknown date"],
  );
  assert.equal(filterHonors(items, { order: "manual" })[0].title, "Research");
  const dates = readHonors({
    honors: ["2023", "2023.01", "2023.01.01", "2023.13", "2023.4.31"].map(
      (date) => ({ title: date, date }),
    ),
  });
  assert.deepEqual(
    dates.items.map((item) => item.dateKey),
    [20230000, 20230100, 20230101, null, null],
  );
});

test("certificate and result URLs reject executable schemes, credentials and ambiguous origins", () => {
  for (const value of [
    null,
    {},
    "javascript:alert(1)",
    "data:text/html,bad",
    "//outside.example/a",
    "/\\outside.example",
    "https://user:secret@example.test/a",
    "https://example.test/a\nb",
    "not-a-url",
  ])
    assert.equal(honorUrl(value), null);
  assert.equal(honorUrl("/media/image.webp"), "/media/image.webp");
  assert.equal(
    honorUrl("https://example.test/image.webp"),
    "https://example.test/image.webp",
  );
});

test("the honor page is auto-discovered, localized and empty by default; its UI messages stay in the plugin", () => {
  const page = pageManifest.pages.find((item) => item.id === "core.honors");
  assert.equal(page?.path, "/myhonor");
  assert.deepEqual(page?.defaults?.honors, []);
  assert.ok(localizedPageImplementations.has("core.honors"));
  assert.equal(honorsText("查看证书", "en"), "View certificate");
  assert.equal(honorsText("我的自定义分类", "en"), "我的自定义分类");
});
