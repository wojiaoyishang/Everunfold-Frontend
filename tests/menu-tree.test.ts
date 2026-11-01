import assert from "node:assert/strict";
import test from "node:test";
import {
  flattenMenu,
  updateMenu,
  reparentMenu,
  moveMenu,
  removeMenu,
} from "../src/core/settings/menu-tree";
import { siteNavigation } from "../src/themes/argon/navigation";
import { snapshot } from "./fixtures";
import type { MenuItem } from "../src/generated/settings-contract";
const node = (id: string, children: MenuItem[] = []): MenuItem => ({
  id,
  label: id,
  href: `/${id}`,
  icon: "book",
  children,
});
test("recursive menu editing retains descendants, blocks cycles and moves whole branches", () => {
  const source = [node("a", [node("b", [node("c")])]), node("d")];
  assert.deepEqual(
    flattenMenu(source).map((entry) => [entry.item.id, entry.depth]),
    [
      ["a", 0],
      ["b", 1],
      ["c", 2],
      ["d", 0],
    ],
  );
  assert.equal(reparentMenu(source, "a", "c"), source);
  assert.equal(reparentMenu(source, "a", "a"), source);
  assert.equal(reparentMenu(source, "a", "missing"), source);
  const moved = reparentMenu(source, "b", "d");
  assert.deepEqual(
    flattenMenu(moved).map((entry) => entry.item.id),
    ["a", "d", "b", "c"],
  );
  const edited = updateMenu(moved, "c", (item) => ({
    ...item,
    label: "changed",
  }));
  assert.equal(flattenMenu(edited).at(-1)?.item.label, "changed");
  assert.equal(
    flattenMenu(source).find((entry) => entry.item.id === "c")?.item.label,
    "c",
  );
  assert.deepEqual(
    moveMenu(source, "d", -1).map((item) => item.id),
    ["d", "a"],
  );
  assert.deepEqual(
    flattenMenu(removeMenu(source, "a")).map((entry) => entry.item.id),
    ["d"],
  );
});
test("deep menus and uploaded icons survive public navigation projection", () => {
  let item = node("leaf");
  item.icon = "media:00000000-0000-0000-0000-000000000001";
  for (let depth = 0; depth < 40; depth++) item = node(`n${depth}`, [item]);
  assert.equal(flattenMenu([item]).at(-1)?.depth, 40);
  const iconId = flattenMenu([item]).at(-1)!.item.icon!;
  const projected = siteNavigation({
    ...snapshot().site,
    settings: {
      site: {
        name: "Test",
        author: "Author",
        description: "",
        navigation: [item],
      },
      theme: {},
      icon_urls: { [iconId]: "http://localhost:8001/media/icon.svg" },
    },
  });
  let leaf = projected[0];
  while (leaf.children?.length) leaf = leaf.children[0];
  assert.equal(leaf.id, "leaf");
  assert.equal(leaf.icon, iconId);
  assert.equal(leaf.iconUrl, "http://localhost:8001/media/icon.svg");
});
