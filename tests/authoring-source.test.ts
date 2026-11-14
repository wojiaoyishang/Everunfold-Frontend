import assert from "node:assert/strict";
import test from "node:test";
import {
  authoringProse,
  draftAuthoringSource,
} from "../src/core/forms/authoring-source";

test("writing sources contain prose and omit protected regions, attributes and code", () => {
  assert.equal(
    authoringProse([
      {
        content:
          "**Accepted** text.\n\n{{< reply-only >}}Private body{{< /reply-only >}}",
      },
      {
        type: "html",
        content:
          '<p>Public <a href="private">link</a>.</p><script>secret()</script><pre>code</pre>',
      },
    ]),
    "Accepted text.\n\nPublic link.",
  );
});

test("a split or malformed protected region withholds the entire draft body", () => {
  assert.equal(
    authoringProse([
      { content: "Intro {{< password-area >}}" },
      { content: "Private passage" },
      { content: "{{< /password-area >}} Afterword" },
    ]),
    undefined,
  );
});

test("password and CAPTCHA drafts only expose the title in reviewed material", () => {
  for (const settings of [
    { visibility: "password" },
    { captcha_read: "required" },
  ] as const) {
    const source = draftAuthoringSource(
      { title: "Title", excerpt: "Private excerpt", body: [], settings },
      "zh-CN",
    );
    assert.equal(source.restricted, true);
    assert.equal(source.summary, undefined);
    assert.equal(source.body, undefined);
  }
});
