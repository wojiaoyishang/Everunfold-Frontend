import assert from "node:assert/strict";
import test from "node:test";
import Ajv from "ajv";
import addFormats from "ajv-formats";
import schema from "@/core/contracts/presentation-v0.2-schema";
import {
  publicFeed,
  queryFeed,
  resolvePresentation,
  presentLegacyContent,
} from "../src/core/content/presentation";
import { snapshot, content } from "./fixtures";

test("feed contains only published backend records, supports real moments and excludes code pages", () => {
  const source = snapshot();
  assert.equal(publicFeed(source).length, source.contents.length);
  assert.equal(queryFeed(source, { type: "shuoshuo" }).total, 0);
  source.contents.push(
    content({
      id: "moment-1",
      kind: "shuoshuo",
      path: "/shuoshuo/real.html",
      title: "皮卡丘",
    }),
    content({
      id: "moment-2",
      kind: "shuoshuo",
      path: "/shuoshuo/real2.html",
      title: "散步",
    }),
  );
  const before = JSON.stringify(source);
  const feed = publicFeed(source);
  assert.equal(feed.filter((entry) => entry.example).length, 0);
  assert.equal(
    feed.find((entry) => entry.content.id === source.contents[0].id)?.example,
    false,
  );
  assert.equal(
    queryFeed(source).items.some((entry) => entry.content.type === "page"),
    false,
  );
  assert.equal(queryFeed(source, { type: "article" }).total, 2);
  assert.equal(
    queryFeed(source, { type: "shuoshuo", pageSize: 1, page: 2 }).items.length,
    1,
  );
  assert.equal(
    queryFeed(source, { type: "shuoshuo", query: "皮卡丘" }).total,
    1,
  );
  assert.equal(
    queryFeed(source, { type: "page", includePages: true }).total,
    1,
  );
  assert.equal(JSON.stringify(source), before);
  assert.equal(
    resolvePresentation(source, "/shuoshuo/not-a-real-example"),
    undefined,
  );
});

test("fixtures and legacy adapter consume the generated backend presentation schema", () => {
  const ajv = new Ajv({ strict: false });
  addFormats(ajv);
  const validate = ajv.compile(schema);
  for (const content of [...snapshot().contents.map(presentLegacyContent)])
    assert.ok(validate(content), JSON.stringify(validate.errors));
  assert.equal(
    validate({ ...presentLegacyContent(content()), type: "guess" }),
    false,
  );
});
