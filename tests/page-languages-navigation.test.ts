import assert from "node:assert/strict";
import test from "node:test";
import { snapshot, content } from "./fixtures";
import { localizedSnapshot } from "../src/core/i18n/snapshot";
import { pageLanguages } from "../src/core/pages/languages";
import { siteNavigation } from "../src/themes/argon/navigation";
import type { PublicManagedPage } from "@/core/contracts/pages";
import type { PublicSettings } from "@/core/contracts/settings";
import { resolveManagedPage } from "../src/core/pages/resolve";
import { initialCatalog } from "../src/core/i18n/catalog";
import { registeredPageLanguages } from "../src/core/pages/registered-languages";

const page: PublicManagedPage = {
  id: "00000000-0000-4000-8000-000000000001",
  source: "custom",
  title: "Original",
  path: "/original-page",
  enabled: true,
  revision: 1,
  language: "zh-CN",
  translation_group_id: "00000000-0000-4000-8000-000000000010",
  is_original: true,
};
const english: PublicManagedPage = {
  ...page,
  id: "00000000-0000-4000-8000-000000000002",
  language: "en",
  path: "/custom-path",
  is_original: false,
};
function source() {
  const value = snapshot();
  value.pages = [page, english];
  const settings: PublicSettings = {
    site: {
      name: "Test",
      author: "Test",
      description: "",
      navigation: [
        {
          id: "page",
          label: "About",
          href: "/obsolete-url",
          reference: { kind: "page", id: page.id },
          children: [{ id: "manual", label: "Manual", href: "/archives" }],
        },
        {
          id: "missing",
          label: "Hidden",
          href: "/do-not-use",
          reference: { kind: "article", id: "unpublished" },
        },
      ],
    },
    theme: {},
  };
  value.site.settings = settings;
  return value;
}
test("authored pages expose only published siblings and preserve real paths for any configured language", () => {
  const value = source();
  value.pages!.push({
    ...english,
    id: "00000000-0000-4000-8000-000000000003",
    language: "fr-CA",
    path: "/fr-custom",
  });
  const projected = localizedSnapshot(value, "fr-CA");
  assert.equal(projected.site.contentLocales?.["/fr-custom"], "fr-CA");
  assert.equal(projected.site.contentTranslations?.[page.path]?.length, 3);
  assert.equal(siteNavigation(projected.site)[0].href, "/fr-custom");
  assert.equal(value.site.navigationResources, undefined);
  assert.deepEqual(
    pageLanguages(value, {
      ...page,
      source: "registered",
      language: null,
      translation_group_id: null,
    }),
    [],
  );
});
test("stable navigation follows applied URLs, falls back to the bound language and hides withdrawn targets", () => {
  const value = source();
  assert.equal(
    siteNavigation(localizedSnapshot(value, "en").site)[0].href,
    english.path,
  );
  value.pages = [
    { ...page, path: "/renamed" },
    { ...english, path: "/new-english" },
  ];
  let navigation = siteNavigation(localizedSnapshot(value, "en").site);
  assert.equal(navigation.length, 1);
  assert.equal(navigation[0].href, "/new-english");
  assert.equal(navigation[0].children?.[0].href, "/archives");
  value.pages = [value.pages[0]];
  navigation = siteNavigation(localizedSnapshot(value, "en").site);
  assert.equal(navigation[0].href, "/renamed");
  value.pages = [];
  assert.deepEqual(siteNavigation(localizedSnapshot(value, "en").site), []);
});
test("article and shuoshuo references use resource type and ID independently from labels or cached href", () => {
  for (const kind of ["article", "shuoshuo"] as const) {
    const value = source(),
      original = content({ kind, path: "/current-content" });
    const translated = content({
      id: "translated",
      kind,
      path: "/other-language",
      language: "en",
    });
    original.translations = [
      {
        id: original.id,
        path: original.path,
        language: "zh-CN",
        is_original: true,
      },
      {
        id: translated.id,
        path: translated.path,
        language: "en",
        is_original: false,
      },
    ];
    value.contents = [original, translated];
    value.site.settings!.site.navigation = [
      {
        id: "bound",
        label: "Kept label",
        href: "/stale",
        reference: { kind, id: original.id },
      },
    ];
    assert.equal(
      siteNavigation(localizedSnapshot(value, "en").site)[0].href,
      translated.path,
    );
    value.site.settings!.site.navigation[0].reference!.kind = "page";
    assert.deepEqual(siteNavigation(localizedSnapshot(value, "en").site), []);
  }
});

test("registered language routes are opt-in code capabilities and never shadow an authored page", () => {
  const value = source();
  const registered: PublicManagedPage = {
    ...page,
    id: "00000000-0000-4000-8000-000000000004",
    source: "registered",
    path: "/people",
    language: null,
    translation_group_id: null,
    implementation_id: "core.people",
    implementation_version: "1.0.0",
  };
  value.pages!.push(registered);
  assert.equal(resolveManagedPage(value, "/en/people")?.id, registered.id);
  assert.equal(
    localizedSnapshot(value, "en").site.navigationResources?.[
      `page:${registered.id}`
    ],
    "/en/people",
  );
  const collision = { ...english, path: "/en/people" };
  value.pages = value.pages!.map((item) =>
    item.id === english.id ? collision : item,
  );
  assert.equal(resolveManagedPage(value, "/en/people")?.id, english.id);
  const projected = localizedSnapshot(value, "en");
  assert.ok(
    !projected.site.contentTranslations?.[registered.path]?.some(
      (member) => member.language === "en",
    ),
  );
  assert.equal(projected.site.contentLocales?.[collision.path], "en");
  assert.deepEqual(
    registeredPageLanguages(
      { ...registered, implementation_id: "plugin.unsupported" },
      initialCatalog,
    ),
    [],
  );
});
