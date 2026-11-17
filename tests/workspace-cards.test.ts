import assert from "node:assert/strict";
import test from "node:test";
import { createPluginRegistry } from "../src/core/plugins/create-registry";
import {
  defaultWorkspaceLayout,
  workspaceCards,
} from "../src/core/workspace/registry";
import type { FrontendPlugin } from "../src/core/plugins/types";
import {
  discreteWheel,
  wheelAcceleration,
} from "../src/core/browser/scroll-policy";

const plugin = (setup: FrontendPlugin["setup"]): FrontendPlugin => ({
  id: "example.workspace",
  version: "1.0.0",
  surface: "admin",
  setup,
});
test("workspace contributions validate ownership, unique IDs and declared renderers", () => {
  const registered = createPluginRegistry([
    plugin(({ components, workspaceCards }) => {
      components.register("example.workspace.chart");
      workspaceCards.register({
        id: "example.workspace.chart",
        label: "Chart",
        component: "example.workspace.chart",
        permission: "content:read",
        width: 3,
        defaultVisible: false,
      });
    }),
  ]).workspaceCards;
  assert.equal(registered[0]?.pluginId, "example.workspace");
  assert.deepEqual(defaultWorkspaceLayout(registered), []);
  assert.equal(
    defaultWorkspaceLayout(workspaceCards).length,
    workspaceCards.length,
  );
  const value = {
    id: "example.workspace.chart",
    label: "Chart",
    component: "example.workspace.chart",
    permission: "content:read",
  };
  assert.throws(
    () =>
      createPluginRegistry([
        plugin(({ workspaceCards }) => workspaceCards.register(value)),
      ]),
    /renderer/,
  );
  assert.throws(
    () =>
      createPluginRegistry([
        plugin(({ workspaceCards }) =>
          workspaceCards.register({ ...value, id: "core.secret" }),
        ),
      ]),
    /Invalid/,
  );
  assert.throws(
    () =>
      createPluginRegistry([
        plugin(({ workspaceCards }) => {
          workspaceCards.register(value);
          workspaceCards.register(value);
        }),
      ]),
    /Invalid/,
  );
  assert.throws(
    () =>
      createPluginRegistry([
        {
          ...plugin(({ workspaceCards }) => workspaceCards.register(value)),
          surface: undefined,
        },
      ]),
    /Invalid/,
  );
});
test("wheel enhancement preserves continuous device input and resets acceleration on reverse", () => {
  for (const pixels of [1, 6.5, 19, 55, 99, 112.2])
    assert.equal(discreteWheel(pixels, 0), false);
  for (const pixels of [100, -100, 120, -240])
    assert.equal(discreteWheel(pixels, 0), true);
  assert.equal(discreteWheel(3, 1), true);
  assert.equal(discreteWheel(1, 2), true);
  assert.equal(wheelAcceleration(20, false), 1);
  assert.equal(wheelAcceleration(300, true), 1);
  assert.ok(wheelAcceleration(50, true) > 1);
  assert.ok(wheelAcceleration(1, true) < 2);
});
