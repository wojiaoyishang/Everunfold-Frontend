import assert from "node:assert/strict";
import test from "node:test";
import {
  matchesInjectionPath,
  matchesPageInjection,
} from "../src/core/page-injections/matching";
import {
  menuItemAttributes,
  menuItemStyles,
} from "../src/themes/argon/navigation";

test("page source rules intersect route type, surface and bounded URL wildcard", () => {
  assert.equal(matchesInjectionPath("/articles/*", "/articles/a"), true);
  assert.equal(matchesInjectionPath("/articles/*", "/articles/a/b"), false);
  assert.equal(matchesInjectionPath("/articles/**", "/articles/a/b/"), true);
  assert.equal(matchesInjectionPath("/about", "/about/"), true);
  assert.equal(matchesInjectionPath("/a.json", "/aXjson"), false);
  assert.equal(
    matchesInjectionPath("/术语/金灵", encodeURI("/术语/金灵")),
    true,
  );
  const front = {
    surface: "public",
    type: "article",
    path: "/articles/a",
    topMenu: true,
  } as const;
  const rule = {
    id: "match",
    name: "Example",
    enabled: true,
    scope: "top-menu",
    page_type: "article",
    path: "/articles/*",
  } as const;
  assert.equal(matchesPageInjection(rule, front), true);
  assert.equal(matchesPageInjection(rule, { ...front, topMenu: false }), false);
  assert.equal(matchesPageInjection(rule, { ...front, type: "moment" }), false);
  assert.equal(
    matchesPageInjection(
      { ...rule, scope: "all", page_type: "" },
      {
        surface: "admin",
        type: "admin",
        path: "/admin/plugins/core.page-injections/settings",
        topMenu: false,
      },
    ),
    false,
  );
});

test("navigation row identifiers remain stable and generated CSS stays within its slot", () => {
  const item = {
    id: "nav.support",
    label: "Support",
    href: "/about",
    icon: "link",
    extraClass: "support featured",
    extraCss: ":scope { color: red; } body { color: red; }",
  };
  const top = menuItemAttributes(item, "header", "item");
  const sidebar = menuItemAttributes(item, "sidebar", "item");
  assert.equal(top.className, "item support featured");
  assert.equal(top["data-menu-item-id"], "nav.support");
  assert.notEqual(top["data-authored-css"], sidebar["data-authored-css"]);
  const css = menuItemStyles([item], "header");
  assert.ok(
    css.includes(
      `body:where([data-authored-css="${top["data-authored-css"]}"]`,
    ),
  );
  assert.equal(
    menuItemStyles(
      [{ ...item, extraCss: "a { background: url(https://test.invalid); }" }],
      "header",
    ),
    "",
  );
});
