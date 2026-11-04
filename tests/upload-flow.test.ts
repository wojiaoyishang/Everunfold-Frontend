import assert from "node:assert/strict";
import test from "node:test";
import {
  uploadTransport,
  type UploadProgress,
} from "../src/core/http/upload-transport";
import { UploadQueue, InvalidUpload } from "../src/core/media/upload-queue";
import { postBinary, RequestError } from "../src/core/http/request";
const tick = () => new Promise((resolve) => setTimeout(resolve, 0));
class FakeXHR {
  upload = {
    onprogress: null as ((event: ProgressEvent) => void) | null,
    onload: null as (() => void) | null,
  };
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  onabort: (() => void) | null = null;
  responseText = '{"success":true,"code":200,"data":{}}';
  status = 200;
  withCredentials = false;
  headers = new Map<string, string>();
  sent = 0;
  aborted = 0;
  open() {}
  setRequestHeader(key: string, value: string) {
    this.headers.set(key, value);
  }
  send() {
    this.sent++;
  }
  abort() {
    this.aborted++;
    this.onabort?.();
  }
}
test("XHR reports real progress, carries credentials/CSRF and waits for server confirmation", async () => {
  const xhr = new FakeXHR();
  const events: UploadProgress[] = [];
  const transport = uploadTransport(
    (p) => events.push(p),
    fetch,
    () => xhr as unknown as XMLHttpRequest,
  );
  const promise = transport("http://example.test/upload", {
    method: "POST",
    credentials: "include",
    headers: { "X-CSRF-Token": "proof" },
    body: new Blob(["test"]),
  });
  assert.equal(xhr.withCredentials, true);
  assert.equal(xhr.headers.get("x-csrf-token"), "proof");
  xhr.upload.onprogress?.({
    loaded: 2,
    total: 4,
    lengthComputable: true,
  } as ProgressEvent);
  assert.deepEqual(events.at(-1), { loaded: 2, total: 4 });
  xhr.upload.onload?.();
  assert.equal(events.at(-1)?.complete, true);
  xhr.onload?.();
  assert.equal((await promise).status, 200);
  assert.equal(xhr.sent, 1);
});
test("missing upload progress support uses one fetch request and indeterminate feedback", async () => {
  let calls = 0;
  const events: UploadProgress[] = [];
  const fallback: typeof fetch = async () => {
    calls++;
    return new Response("{}");
  };
  const response = await uploadTransport(
    (p) => events.push(p),
    fallback,
    () => ({}) as XMLHttpRequest,
  )("http://example.test", { body: new Blob(["x"]), method: "POST" });
  assert.equal(response.status, 200);
  assert.equal(calls, 1);
  assert.deepEqual(events, [{ loaded: 0, total: null }]);
});
test("XHR network failure never retries via fetch", async () => {
  let fallbackCalls = 0;
  const xhr = new FakeXHR();
  const promise = uploadTransport(
    () => {},
    async () => {
      fallbackCalls++;
      return new Response("{}");
    },
    () => xhr as unknown as XMLHttpRequest,
  )("http://example.test", { body: new Blob(["x"]) });
  xhr.onerror?.();
  await assert.rejects(promise);
  assert.equal(fallbackCalls, 0);
  assert.equal(xhr.sent, 1);
});
test("XHR abort stops transfer and rejects", async () => {
  const xhr = new FakeXHR();
  const abort = new AbortController();
  const promise = uploadTransport(
    () => {},
    fetch,
    () => xhr as unknown as XMLHttpRequest,
  )("http://example.test", { body: new Blob(["x"]), signal: abort.signal });
  abort.abort();
  await assert.rejects(promise);
  assert.equal(xhr.aborted, 1);
});
test("unknown total is reported without an invented percentage", async () => {
  const xhr = new FakeXHR();
  const events: UploadProgress[] = [];
  const promise = uploadTransport(
    (p) => events.push(p),
    fetch,
    () => xhr as unknown as XMLHttpRequest,
  )("http://example.test", { body: new Blob(["x"]) });
  xhr.upload.onprogress?.({
    loaded: 20,
    total: 0,
    lengthComputable: false,
  } as ProgressEvent);
  assert.deepEqual(events.at(-1), { loaded: 20, total: null });
  xhr.onload?.();
  await promise;
});
test("queue limits concurrency and completes independent files despite validation failure", async () => {
  let active = 0,
    max = 0;
  const completed: string[] = [];
  const queue = new UploadQueue(
    {
      prepare: async (file: File) => {
        if (file.name === "bad") throw new InvalidUpload("bad file");
        return file.name;
      },
      send: async (
        name: string,
        _signal: AbortSignal,
        progress: (p: UploadProgress) => void,
      ) => {
        active++;
        max = Math.max(max, active);
        progress({ loaded: 1, total: 2 });
        await tick();
        active--;
        return name;
      },
      completed: (value: string) => completed.push(value),
      rejected: "rejected",
    },
    2,
  );
  queue.add(
    [
      new File(["a"], "a"),
      new File(["b"], "b"),
      new File(["c"], "bad"),
      new File(["d"], "d"),
    ],
    "all",
  );
  for (
    let i = 0;
    i < 20 &&
    queue
      .snapshot()
      .some((item) => ["queued", "uploading"].includes(item.state));
    i++
  )
    await tick();
  assert.equal(max, 2);
  assert.deepEqual(completed.sort(), ["a", "b", "d"]);
  assert.equal(
    queue.snapshot().find((i) => i.name === "bad")?.retryable,
    false,
  );
});
test("failed uploads retry with the same prepared payload", async () => {
  let preparations = 0,
    attempts = 0;
  const payloads: object[] = [];
  const queue = new UploadQueue({
    prepare: async () => {
      preparations++;
      return { upload_id: crypto.randomUUID() };
    },
    send: async (payload: object) => {
      payloads.push(payload);
      if (++attempts === 1) throw new RequestError("network");
      return "saved";
    },
    completed: () => {},
    rejected: "bad",
  });
  queue.add([new File(["a"], "a")], "all");
  await tick();
  const id = queue.snapshot()[0].id;
  assert.equal(queue.snapshot()[0].state, "failed");
  queue.retry(id);
  await tick();
  assert.equal(preparations, 1);
  assert.equal(payloads[0], payloads[1]);
  assert.equal(queue.snapshot()[0].state, "done");
});
test("queue does not call 100% transfer a saved file; cancellation ignores late responses", async () => {
  let resolve!: (value: string) => void;
  const queue = new UploadQueue({
    prepare: async () => ({}),
    send: async (
      _p: object,
      _s: AbortSignal,
      progress: (p: UploadProgress) => void,
    ) => {
      progress({ loaded: 4, total: 4, complete: true });
      return new Promise<string>((done) => {
        resolve = done;
      });
    },
    completed: () => assert.fail("late success"),
    rejected: "bad",
  });
  queue.add([new File(["data"], "a")], "all");
  await tick();
  assert.equal(queue.snapshot()[0].state, "saving");
  queue.cancel(queue.snapshot()[0].id);
  resolve("late");
  await tick();
  assert.equal(queue.snapshot()[0].state, "cancelled");
});
test("HTTP error code remains usable without depending on localized text", async () => {
  await assert.rejects(
    postBinary(
      "http://example.test",
      "/upload",
      {},
      new Blob(["x"]),
      (value): value is object => typeof value === "object" && value !== null,
      {
        fetcher: async () =>
          new Response(
            JSON.stringify({ success: false, code: 40936, msg: "translation" }),
            { status: 409 },
          ),
      },
    ),
    (error: unknown) => error instanceof RequestError && error.code === 40936,
  );
});

test("generated deletion clients validate the backend envelope for preview and result", async () => {
  const { previewMediaRemoval, removeMedia } =
    await import("../src/generated/settings-client");
  const plan = {
    id: "media:00000000-0000-4000-8000-000000000001",
    token: "a".repeat(64),
    record_count: 2,
    file_count: 2,
    file_retained: false,
    delete_original: true,
    safe_delete: false,
    resume_operation_id: null,
  };
  const fetcher: typeof fetch = async () =>
    Response.json({ success: true, code: 200, msg: "", data: plan });
  const preview = await previewMediaRemoval(
    "https://backend.example",
    {
      id: plan.id,
      expected_revision: 1,
      delete_original: true,
      safe_delete: false,
    },
    "test-csrf",
    { fetcher },
  );
  assert.deepEqual(preview.data, plan);
  const result = {
    id: plan.id,
    deleted: true,
    purged: true,
    purge_pending: false,
    records_removed: 2,
    files_deleted: 2,
    file_retained: false,
  };
  const removed = await removeMedia(
    "https://backend.example",
    {
      id: plan.id,
      expected_revision: 1,
      expected_plan: plan.token,
      operation_id: "00000000-0000-4000-8000-000000000002",
      delete_original: true,
      safe_delete: false,
    },
    "test-csrf",
    {
      fetcher: async () =>
        Response.json({ success: true, code: 200, msg: "", data: result }),
    },
  );
  assert.deepEqual(removed.data, result);
});

test("completion callbacks keep block identity and clearing one queue group preserves the other", async () => {
  const completed: { id: string; context: string }[] = [];
  const queue = new UploadQueue({
    prepare: async (file: File) => file.name,
    send: async (name: string) => name,
    completed: () => assert.fail("replaced callback should run"),
    rejected: "bad",
  });
  queue.setCompleted((_value, entry) => completed.push(entry));
  const a = queue.add([new File(["a"], "a.png")], "block-a")!;
  const b = queue.add([new File(["b"], "b.png")], "block-b")!;
  await tick();
  assert.deepEqual(completed.map((entry) => entry.context).sort(), [
    "block-a",
    "block-b",
  ]);
  assert.equal(
    completed.find((entry) => entry.context === "block-a")?.id,
    a[0].id,
  );
  queue.clearFinished(a.map((entry) => entry.id));
  assert.deepEqual(
    queue.snapshot().map((entry) => entry.id),
    [b[0].id],
  );
  queue.dispose();
});
