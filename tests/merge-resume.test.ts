import assert from "node:assert/strict";
import test from "node:test";
import type { MergeDetail } from "@/core/contracts/collaboration";
import {
  renewedMerge,
  resumedDecisions,
  sameMergeTarget,
} from "../src/core/content-management/merge-resume";

function merge(): MergeDetail {
  const fields = {
    title: "标题",
    body: [{ id: "a", type: "html" as const, content: "原文" }],
    settings: {},
  };
  return {
    id: "merge",
    branch_id: "branch",
    status: "cancelled",
    owner_id: "owner",
    epoch: "epoch",
    target_seq: 3,
    target_revision: 2,
    expires_at: new Date().toISOString(),
    base: fields,
    local: fields,
    remote: fields,
    result: fields,
    result_revision: null,
    conflicts: [
      {
        key: "title",
        path: ["title"],
        kind: "text",
        base: "旧",
        local: "本地",
        remote: "线上",
      },
      {
        key: "source",
        path: ["body", "a", "content"],
        kind: "text",
        base: "旧",
        local: "本地",
        remote: "线上",
      },
      {
        key: "order",
        path: ["order"],
        kind: "order",
        base: [],
        local: [],
        remote: [],
      },
    ],
    resolved: ["title", "order"],
  };
}
test("resuming restores exact edited decisions and keeps unresolved original conflicts", () => {
  const previous = merge(),
    next = { ...previous, id: "next", status: "active" as const };
  const result = { ...previous.result, title: "手动合并后的标题" };
  const decisions = resumedDecisions(previous, next, result);
  assert.deepEqual(decisions, [
    { key: "title", choice: "custom", value: "手动合并后的标题" },
    { key: "order", choice: "custom", value: ["a"] },
  ]);
  assert.ok(!decisions.some((decision) => decision.key === "source"));
  assert.equal(sameMergeTarget(previous, next), true);
});
test("a changed merge target requires fresh comparison instead of replaying old decisions", () => {
  const previous = merge();
  assert.equal(sameMergeTarget(previous, { ...previous, epoch: "new" }), false);
  assert.equal(
    sameMergeTarget(previous, { ...previous, target_seq: 4 }),
    false,
  );
  assert.equal(
    sameMergeTarget(previous, {
      ...previous,
      remote: { ...previous.remote, title: "线上新标题" },
    }),
    false,
  );
});

test("late lease renewals preserve newer conflict decisions and completed state", () => {
  const old = { ...merge(), status: "active" as const };
  const current = {
    ...old,
    resolved: [...old.resolved, "source"],
    result: { ...old.result, title: "新结果" },
  };
  const updated = renewedMerge(current, { ...old, expires_at: "later" });
  assert.deepEqual(updated?.resolved, current.resolved);
  assert.equal(updated?.result.title, "新结果");
  assert.equal(updated?.expires_at, "later");
  const completed = { ...current, status: "completed" as const };
  assert.equal(renewedMerge(completed, old), completed);
});
