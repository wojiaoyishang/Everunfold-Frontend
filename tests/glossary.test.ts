import assert from "node:assert/strict";
import test from "node:test";

import {
  matchGlossaryText,
  type GlossaryMatchTerm,
} from "@/core/glossary/match";
import {
  clearGlossaryCache,
  loadGlossaryMatches,
} from "@/core/glossary/runtime";

function term(
  id: string,
  title: string,
  matched_texts = [title],
): GlossaryMatchTerm {
  return {
    id,
    language: "zh-CN",
    slug: id,
    title,
    summary: title,
    aliases: [],
    path: `/glossary/${id}`,
    body_markdown: "",
    matched_texts,
  };
}

test("glossary matching finds Chinese terms inside prose", () => {
  assert.deepEqual(
    matchGlossaryText(
      "今天遇见了金灵，她正在看云。",
      [term("jin", "金灵")],
      20,
    ),
    [
      {
        start: 5,
        end: 7,
        text: "金灵",
        term: term("jin", "金灵"),
      },
    ],
  );
});

test("glossary matching prefers longer aliases and avoids overlapping matches", () => {
  const long = term("camp", "Campfire", ["Campfire story"]);
  const short = term("fire", "Fire", ["Campfire"]);
  const matches = matchGlossaryText(
    "A campfire story begins.",
    [short, long],
    20,
  );
  assert.equal(matches.length, 1);
  assert.equal(matches[0]?.term.id, "camp");
  assert.equal(matches[0]?.text, "campfire story");
});

test("ASCII terms do not match inside a larger word", () => {
  const matches = matchGlossaryText(
    "JSON contains json but not JS.",
    [term("js", "JS")],
    20,
  );
  assert.equal(matches.at(-1)?.text, "JS");
  assert.equal(matches.length, 1);
});

test("glossary matching honors the page-wide limit", () => {
  const matches = matchGlossaryText("金灵 金灵 金灵", [term("jin", "金灵")], 2);
  assert.equal(matches.length, 2);
});

test("empty article matches are cached alongside the article revision", async () => {
  clearGlossaryCache();
  const contentId = "00000000-0000-4000-8000-000000000001";
  let requests = 0;
  const fetcher = (() => {
    requests += 1;
    return Promise.resolve(
      new Response(
        JSON.stringify({
          success: true,
          code: 200,
          msg: "OK",
          data: {
            content_id: contentId,
            revision: "revision-1",
            terms: [],
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );
  }) as typeof fetch;

  const first = await loadGlossaryMatches(
    "https://api.example.test",
    contentId,
    "revision-1",
    { fetcher },
  );
  const second = await loadGlossaryMatches(
    "https://api.example.test",
    contentId,
    "revision-1",
    { fetcher },
  );

  assert.deepEqual(first.terms, []);
  assert.strictEqual(second, first);
  assert.equal(requests, 1);
  clearGlossaryCache();
});
