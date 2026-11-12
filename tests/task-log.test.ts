import assert from "node:assert/strict";
import test from "node:test";
import {
  orderedTaskEvents,
  taskCompletionLog,
  taskLogPresentation,
} from "../src/core/tasks/task-log";
import type { TaskProgressEvent } from "../src/core/contracts/settings";

function event(
  sequence: number,
  kind: TaskProgressEvent["kind"],
  level: TaskProgressEvent["level"] = "info",
): TaskProgressEvent {
  return {
    sequence,
    at: "2026-11-12T00:00:00Z",
    kind,
    level,
    message: `event ${sequence}`,
  };
}

test("task logs always render oldest first so the newest entry stays at the bottom", () => {
  const events = [event(9, "message"), event(2, "stage"), event(5, "response")];
  assert.deepEqual(
    orderedTaskEvents(events).map((item) => item.sequence),
    [2, 5, 9],
  );
  assert.deepEqual(
    events.map((item) => item.sequence),
    [9, 2, 5],
  );
});

test("task log colors distinguish errors, warnings, requests and responses", () => {
  assert.deepEqual(taskLogPresentation(event(1, "stage")), {
    badge: "STEP",
    label: "进度",
    tone: "stage",
  });
  assert.equal(taskLogPresentation(event(2, "request")).tone, "request");
  assert.equal(taskLogPresentation(event(3, "response")).tone, "response");
  assert.equal(
    taskLogPresentation(event(4, "message", "warning")).tone,
    "warning",
  );
  assert.equal(taskLogPresentation(event(5, "request", "error")).tone, "error");
  assert.equal(taskLogPresentation(event(6, "message")).badge, "INFO");
});

test("terminal task states produce a final colorized log line", () => {
  assert.deepEqual(taskCompletionLog("succeeded"), {
    badge: "DONE",
    message: "任务执行结束",
    tone: "success",
  });
  assert.equal(taskCompletionLog("failed")?.tone, "error");
  assert.equal(taskCompletionLog("cancelled")?.tone, "warning");
  assert.equal(taskCompletionLog("unknown")?.tone, "warning");
  assert.equal(taskCompletionLog("running"), null);
});
