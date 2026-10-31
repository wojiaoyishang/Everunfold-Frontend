import assert from "node:assert/strict";
import test from "node:test";
import {
  navigationIsActive,
  navigationTarget,
  siteNavigation,
} from "../src/themes/argon/navigation";
import { snapshot } from "./fixtures";

test("header and sidebar receive the same safe nested reference navigation", () => {
  const site = snapshot().site;
  site.navigation = [
    { label: "归档", href: "/archives" },
    { label: "实验", href: "https://lab.lovepikachu.top/" },
    { label: "无效", href: "javascript:bad()" },
  ];
  const items = siteNavigation(site);
  assert.equal(items.length, 2);
  assert.equal(items[0].label, "归档");
  assert.equal(items[1].label, "实验");
  assert.ok(items[0].children?.some((child) => child.href === "/gzrj/"));
  assert.equal(items[1].children?.length, 2);
  assert.equal(navigationTarget(items[1].children![0].href).target, "_blank");
  assert.deepEqual(navigationTarget("/archives"), {});
  assert.equal(navigationIsActive("/gzrj", "/gzrj/"), true);
  assert.equal(navigationIsActive("/", "/"), true);
  assert.equal(navigationIsActive("/", "https://example.test/"), false);
});
