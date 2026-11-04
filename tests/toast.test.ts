import assert from "node:assert/strict";
import test from "node:test";
import { ToastStore } from "../src/themes/argon/components/ui/toast/store";
test("upload notifications update by identity, retain real progress and isolate concurrent files", () => {
  const store = new ToastStore();
  store.show({ id: "a", title: "正在上传", tone: "loading", progress: null });
  store.show({ id: "b", title: "等待上传", tone: "loading", progress: null });
  store.show({ id: "a", title: "正在上传", tone: "loading", progress: 42 });
  assert.equal(store.snapshot().length, 2);
  assert.equal(store.snapshot()[0].progress, 42);
  assert.equal(store.snapshot()[1].progress, null);
  store.show({
    id: "a",
    title: "正在保存",
    tone: "loading",
    progress: 100,
    duration: 0,
  });
  assert.equal(store.snapshot()[0].tone, "loading");
  store.show({ id: "a", title: "图片已插入", tone: "success" });
  assert.equal(store.snapshot()[0].progress, undefined);
});
test("toast exits retain their content until completion and retry can revive a closing notification", () => {
  const store = new ToastStore();
  let updates = 0;
  const unsubscribe = store.subscribe(() => updates++);
  store.show({ id: "a", title: "上传失败", tone: "error" });
  store.dismiss("a");
  assert.equal(store.snapshot()[0].closing, true);
  store.show({ id: "a", title: "正在重试", tone: "loading" });
  assert.equal(store.snapshot()[0].closing, false);
  store.dismiss("a");
  store.remove("a");
  assert.equal(store.snapshot().length, 0);
  assert.equal(updates, 5);
  unsubscribe();
  store.show({ id: "b", title: "完成" });
  assert.equal(updates, 5);
});
