import assert from "node:assert/strict";
import test from "node:test";
import {
  cloneBuilderNode,
  moveBuilderNode,
  resolvedBuilderProps,
} from "../src/core/builder/document";
import type { BuilderNode } from "../src/core/builder/types";
import { createPluginRegistry } from "../src/core/plugins/create-registry";

const heading: BuilderNode = {
  id: "heading",
  type: "core.heading",
  props: { text: "Template heading", level: "2" },
  parameters: { text: { id: "heading-text", label: "Title" } },
};
const section: BuilderNode = {
  id: "section",
  type: "core.container",
  props: {},
  children: [heading],
};
const outer: BuilderNode = {
  id: "outer",
  type: "core.container",
  props: {},
  children: [section],
};

test("moves components between parents without allowing their own descendants as targets", () => {
  assert.equal(
    moveBuilderNode([outer], "outer", { parentId: "section", beforeId: null }),
    undefined,
  );
  const moved = moveBuilderNode([outer], "heading", {
    parentId: null,
    beforeId: "outer",
  });
  assert.deepEqual(
    moved?.map((node) => node.id),
    ["heading", "outer"],
  );
  assert.deepEqual(moved?.[1].children?.[0].children, []);
  assert.deepEqual(outer.children?.[0].children, [heading]);
  const copy = cloneBuilderNode(outer);
  assert.notEqual(copy.id, outer.id);
  assert.notEqual(
    copy.children?.[0].children?.[0].parameters?.text.id,
    "heading-text",
  );
});

test("applies compatible overrides and keeps missing defaults according to the exposed field", () => {
  assert.deepEqual(resolvedBuilderProps(heading, {}), {
    text: "Template heading",
    level: "2",
  });
  assert.deepEqual(
    resolvedBuilderProps(heading, { "heading-text": "Page heading" }),
    { text: "Page heading", level: "2" },
  );
  assert.deepEqual(resolvedBuilderProps(heading, { "heading-text": 7 }), {
    text: "Template heading",
    level: "2",
  });
  const noDefault: BuilderNode = {
    ...heading,
    parameters: {
      text: { id: "heading-text", label: "Title", keep_default: false },
    },
  };
  assert.deepEqual(resolvedBuilderProps(noDefault, {}), { level: "2" });
  assert.deepEqual(resolvedBuilderProps(noDefault), {
    text: "Template heading",
    level: "2",
  });
});

test("requires builder widgets to use renderers owned by the registering plugin", () => {
  const type = "example.widgets.banner";
  const register = (widget: string, renderer: string) =>
    createPluginRegistry([
      {
        id: "example.widgets",
        version: "1.0.0",
        setup({ builder, components }) {
          builder.register({
            type: widget,
            label: "Banner",
            component: "widgets.banner",
          });
          components.register(renderer);
        },
      },
    ]);
  assert.equal(
    register(type, "widgets.banner").builderComponents[0].type,
    type,
  );
  assert.throws(
    () => register(type, "widgets.other"),
    /renderer must be registered/,
  );
  assert.throws(
    () => register("example.other.banner", "widgets.banner"),
    /Invalid plugin builder component/,
  );
});
