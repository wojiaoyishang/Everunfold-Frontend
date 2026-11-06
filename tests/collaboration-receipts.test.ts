import assert from "node:assert/strict";
import test from "node:test";
import { commitCollaborationDraft } from "@/core/contracts/collaboration";
import type { CollaborationContract } from "@/core/contracts/collaboration";

const id = "00000000-0000-4000-8000-000000000001";
const owner = "00000000-0000-4000-8000-000000000002";
const input: CollaborationContract["commit"] = {
  id,
  operation_id: "00000000-0000-4000-8000-000000000003",
  expected_revision: 1,
  epoch: "00000000-0000-4000-8000-000000000004",
  committed_seq: 4,
};
function receipt(): CollaborationContract["committed"] {
  return {
    success: true,
    code: 200,
    msg: "ok",
    data: {
      committed_seq: 4,
      draft: {
        id,
        owner_id: owner,
        type_id: "article",
        title: "已保存",
        excerpt: "",
        preview: "",
        author: "作者",
        revision: 2,
        status: "draft",
        is_demo: false,
        published_revision: null,
        public_path: null,
        published_at: null,
        created_at: "2026-11-06T00:00:00Z",
        updated_at: "2026-11-06T00:00:00Z",
        body: [{ id, type: "markdown", content: "正文" }],
        media_urls: {},
        has_password: false,
      },
    },
  };
}

test("the generated collaboration client accepts a real saved draft with its owner, without retrying", async () => {
  let calls = 0;
  const response = await commitCollaborationDraft(
    "https://api.example.test",
    input,
    "test-csrf",
    {
      fetcher: async () => {
        calls++;
        return Response.json(receipt());
      },
    },
  );
  assert.equal(response.data.draft.owner_id, owner);
  assert.equal(response.data.draft.revision, 2);
  assert.equal(calls, 1);
});

test("owner support keeps commit receipt UUID and unknown-field validation strict", async () => {
  for (const patch of [{ owner_id: "invalid" }, { unexpected_field: true }]) {
    const value = receipt();
    Object.assign(value.data.draft, patch);
    await assert.rejects(() =>
      commitCollaborationDraft("https://api.example.test", input, "test-csrf", {
        fetcher: async () => Response.json(value),
      }),
    );
  }
});

test("scheduled collaboration receipts accept plan metadata without exposing frozen private payloads", async () => {
  const value = receipt();
  Object.assign(value.data.draft, {
    scheduled_for: "2030-01-01T00:00:00Z",
    scheduled_revision: 2,
    schedule_error: null,
  });
  const response = await commitCollaborationDraft(
    "https://api.example.test",
    {
      ...input,
      action: "schedule",
      scheduled_for: "2030-01-01T00:00:00Z",
    },
    "test-csrf",
    { fetcher: async () => Response.json(value) },
  );
  assert.equal(response.data.draft.scheduled_revision, 2);
  for (const patch of [
    { scheduled_for: "invalid" },
    { scheduled_payload: {} },
  ]) {
    await assert.rejects(() =>
      commitCollaborationDraft("https://api.example.test", input, "test-csrf", {
        fetcher: async () =>
          Response.json({
            ...value,
            data: { ...value.data, draft: { ...value.data.draft, ...patch } },
          }),
      }),
    );
  }
});
