import assert from "node:assert/strict";
import test from "node:test";
import { parsePublicSnapshot } from "../src/core/content/validation";
import { snapshot, content } from "./fixtures";
import {
  createCaptchaChallenge,
  saveCaptchaSettings,
} from "@/core/contracts/captcha";
import { pluginNeedsConfirmation } from "../src/core/settings/plugin-impact";
import { RequestError } from "../src/core/http/request";

test("public CAPTCHA gates reject leaked bodies, read receipts and page configuration", () => {
  const data = snapshot();
  data.contents = [
    content({
      access: "captcha",
      captcha_required: true,
      password_required: false,
      excerpt: "",
      content: [],
      media_urls: {},
      word_count: 0,
      comment_count: 0,
    }),
  ];
  data.comments = {};
  assert.equal(parsePublicSnapshot(data).contents[0].access, "captcha");
  for (const patch of [
    { content: [{ id: "a", type: "markdown" as const, content: "private" }] },
    { read_receipt: "private-grant" },
    {
      unlocked_comments: [
        {
          id: "c",
          parent_id: null,
          author: "a",
          content: "private",
          created_at: "2026-11-09T00:00:00Z",
        },
      ],
    },
  ]) {
    assert.throws(() =>
      parsePublicSnapshot({
        ...data,
        contents: [{ ...data.contents[0], ...patch }],
      }),
    );
  }
  data.pages = [
    {
      id: "00000000-0000-4000-8000-000000000123",
      title: "Gate",
      path: "/captcha-page",
      source: "custom",
      revision: 1,
      enabled: true,
      access: "captcha",
      html: "",
      css: "",
      javascript: "",
      options: {},
    },
  ];
  assert.equal(parsePublicSnapshot(data).pages?.[0].access, "captcha");
  for (const patch of [
    { html: "private" },
    { options: { hidden: true } },
    { javascript: "private" },
    { read_receipt: "private" },
  ])
    assert.throws(() =>
      parsePublicSnapshot({
        ...data,
        pages: [{ ...data.pages![0], ...patch }],
      }),
    );
});

test("CAPTCHA contracts keep public challenges cookie-free and settings CSRF protected", async () => {
  let sawChallenge = false;
  await createCaptchaChallenge(
    "http://localhost:8001",
    { action: "login", client_id: "00000000-0000-4000-8000-000000000001" },
    {
      fetcher: async (input, init) => {
        assert.match(String(input), /\/v1\/reader\/captcha\/challenge$/);
        assert.equal(init?.credentials, "omit");
        assert.equal(init?.method, "POST");
        assert.equal(init?.cache, "no-store");
        sawChallenge = true;
        return Response.json({
          success: true,
          code: 200,
          msg: "ok",
          data: { required: false },
        });
      },
    },
  );
  assert.ok(sawChallenge);
  await assert.rejects(
    saveCaptchaSettings(
      "http://localhost:8001",
      { expected_revision: 1, provider: "local", rules: {}, providers: {} },
      "csrf",
      {
        fetcher: async (_input, init) => {
          assert.equal(init?.credentials, "include");
          assert.equal(init?.method, "PATCH");
          assert.equal(new Headers(init?.headers).get("X-CSRF-Token"), "csrf");
          return Response.json(
            { success: false, code: 40986, msg: "changed" },
            { status: 409 },
          );
        },
      },
    ),
    (error) => error instanceof RequestError && error.code === 40986,
  );
});

test("disabling a plugin referenced by CAPTCHA configuration requires confirmation", () => {
  assert.ok(
    pluginNeedsConfirmation({
      plugin_id: "core.captcha",
      title: "CAPTCHA",
      registered: true,
      captcha_references: 1,
    }),
  );
});
