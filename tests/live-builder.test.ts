import assert from "node:assert/strict";
import test from "node:test";
import {
  checkedBuilderChange,
  checkedBuilderState,
  type LiveBuilderState,
} from "../src/core/preview/builder";
import {
  isLivePreviewPath,
  livePreviewPath,
  previewEditorPath,
} from "../src/core/preview/routes";
import { templatePreviewPage } from "../src/core/preview/template";
import { checkedPreviewPage } from "../src/core/pages/preview-validation";
import { isManagementRoute } from "../src/core/auth/routes";
import { isPluginEditingRoute } from "../src/core/plugins/runtime/update-policy";
const id = "00000000-0000-4000-8000-000000000001";
const state: LiveBuilderState = {
  document: {
    version: 1,
    nodes: [{ id: "one", type: "core.heading", props: { text: "Hello" } }],
  },
  parameters: {},
  linked: false,
  disabled: false,
  allowComments: true,
  canSaveTemplate: true,
  media: {},
  shortcodes: [],
};
test("live component changes preserve the existing document contract and read-only/template boundaries", () => {
  assert.ok(checkedBuilderState(state));
  assert.equal(
    checkedBuilderState({ ...state, document: { version: 2, nodes: [] } }),
    null,
  );
  assert.equal(
    checkedBuilderChange(
      { document: state.document },
      { ...state, disabled: true },
    ),
    null,
  );
  assert.equal(
    checkedBuilderChange(
      { document: state.document },
      { ...state, linked: true },
    ),
    null,
  );
  assert.ok(
    checkedBuilderChange(
      { parameters: { title: "Own title" } },
      { ...state, linked: true },
    ),
  );
  assert.equal(
    checkedBuilderChange(
      {
        document: {
          version: 1,
          nodes: [{ id: "one", type: "invalid", props: {} }],
        },
      },
      state,
    ),
    null,
  );
  assert.equal(
    checkedBuilderChange(
      { saveTemplate: true },
      { ...state, canSaveTemplate: false },
    ),
    null,
  );
  assert.equal(checkedBuilderChange({ media: { id: "test" } }, state), null);
  const mediaId = "00000000-0000-4000-8000-000000000002";
  const insertion = {
    document: state.document,
    mediaUrls: { [mediaId]: { original: "/media/image.webp" } },
  };
  assert.ok(checkedBuilderChange(insertion, state));
  assert.equal(
    checkedBuilderChange({ mediaUrls: insertion.mediaUrls }, state),
    null,
  );
  assert.equal(
    checkedBuilderChange(insertion, { ...state, linked: true }),
    null,
  );
  assert.equal(
    checkedBuilderChange({ ...insertion, mediaUrls: { [mediaId]: {} } }, state),
    null,
  );
});
test("templates use the same private live preview route and an URL-free template projection", () => {
  for (const kind of ["page", "template", "article", "shuoshuo"] as const)
    assert.ok(isLivePreviewPath(livePreviewPath(kind, id)));
  assert.ok(isManagementRoute(livePreviewPath("template", id)));
  assert.ok(isPluginEditingRoute(livePreviewPath("template", id)));
  assert.equal(
    previewEditorPath("template", id),
    `/admin/pages/templates/${id}`,
  );
  assert.throws(() => livePreviewPath("template", "../other"));
  const projection = templatePreviewPage(id, {
    title: "Reusable",
    edit_mode: "components",
    component_document: state.document,
    layout: "wide",
  });
  assert.ok(checkedPreviewPage(projection, id));
  assert.equal(projection.source, "custom");
  assert.equal(projection.path, "/preview");
});
