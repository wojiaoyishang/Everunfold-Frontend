import assert from "node:assert/strict";
import test from "node:test";
import { createPluginRegistry } from "../src/core/plugins/create-registry";
import { prepareAdminFormField } from "../src/core/forms/admin-field-hooks";
import type { AdminFormFieldHook } from "../src/core/forms/admin-field-types";
import type { FrontendPlugin } from "../src/core/plugins/types";
import type { PluginPackage } from "../src/core/plugins/runtime/types";
import { scopePluginCatalog } from "../src/core/plugins/runtime/catalog-scope";

const scene = "content.article.edit";
const field = "seo_description";

test("admin form hooks match exact fields, run in deterministic order and isolate prepare failures", () => {
  const calls: string[] = [];
  function hook(
    id: string,
    priority: number,
    hookField = field,
  ): AdminFormFieldHook {
    return {
      id,
      scene,
      field: hookField,
      priority,
      stage: "prepare",
      prepare(view) {
        calls.push(id);
        if (id === "broken") throw new Error("Presentation failed");
        return {
          placeholder: [view.placeholder, id].filter(Boolean).join(","),
        };
      },
    };
  }
  const plugin = (id: string, hooks: AdminFormFieldHook[]): FrontendPlugin => ({
    id,
    version: "1.0.0",
    surface: "admin",
    setup({ formFields }) {
      hooks.forEach(formFields.register);
    },
  });
  const { adminFormFieldHooks } = createPluginRegistry([
    plugin("field.second", [
      hook("later", 100),
      hook("broken", 0),
      hook("other", 0, "excerpt"),
    ]),
    plugin("field.first", [
      hook("z", 100),
      hook("a", 100),
      hook("earlier", -10),
    ]),
  ]);
  const initial = { placeholder: "base", description: "original" };
  assert.deepEqual(
    prepareAdminFormField({ scene, field }, initial, adminFormFieldHooks),
    {
      placeholder: "base,earlier,a,z,later",
      description: "original",
    },
  );
  assert.deepEqual(calls, ["earlier", "broken", "a", "z", "later"]);
  assert.deepEqual(
    prepareAdminFormField(
      { scene: "pages.edit", field },
      initial,
      adminFormFieldHooks,
    ),
    initial,
  );
});

test("only admin packages may provide field hooks, with their own registered renderer", () => {
  const plugin: FrontendPlugin = {
    id: "field.test",
    version: "1.0.0",
    setup({ formFields }) {
      formFields.register({
        id: "write",
        scene,
        field,
        stage: "render",
        component: "field.test.action",
      });
    },
  };
  assert.throws(
    () => createPluginRegistry([plugin]),
    /Invalid or duplicate admin field hook/,
  );
  assert.throws(
    () => createPluginRegistry([{ ...plugin, surface: "admin" }]),
    /renderer must be registered/,
  );
  const registry = createPluginRegistry([
    {
      ...plugin,
      surface: "admin",
      setup(registrar) {
        plugin.setup(registrar);
        registrar.components.register("field.test.action");
      },
    },
  ]);
  assert.equal(registry.adminFormFieldHooks[0]?.priority, 100);
});

test("public catalog excludes admin packages, disabled IDs, and unverifiable build errors", () => {
  const adminPackage = {
    manifest: {
      id: "field.test",
      surface: "admin",
      directory: "field-test",
    } as PluginPackage,
  };
  const publicPackage = {
    manifest: { id: "page.test", directory: "page-test" } as PluginPackage,
  };
  const errors = ["field-test", "page-test", "unknown"].map((directory) => ({
    directory,
    message: "Visible in the appropriate catalog",
  }));
  const input = { packages: [adminPackage, publicPackage], errors };
  const disabled = ["field.test", "page.test"];
  assert.deepEqual(scopePluginCatalog(input, disabled), {
    packages: [publicPackage],
    disabled: ["page.test"],
    errors: [errors[1]],
  });
  assert.deepEqual(scopePluginCatalog(input, disabled, "admin"), {
    packages: [adminPackage],
    disabled: ["field.test"],
    errors: [errors[0], errors[2]],
  });
});
