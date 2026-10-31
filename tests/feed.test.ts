import assert from "node:assert/strict";
import test from "node:test";
import Ajv from "ajv";
import addFormats from "ajv-formats";
import schema from "../src/generated/presentation-v0.2.schema.json";
import { exampleMoments } from "../src/core/content/examples";
import {
  publicFeed,
  queryFeed,
  resolvePresentation,
  presentLegacyContent,
} from "../src/core/content/presentation";
import { snapshot } from "./fixtures";

test("mixed feed retains article identity, excludes pages by default and marks examples", () => {
  const source = snapshot();
  const before = JSON.stringify(source);
  const feed = publicFeed(source);
  assert.equal(
    feed.filter((entry) => entry.example).length,
    exampleMoments.length,
  );
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
  assert.equal(queryFeed(source, { type: "shuoshuo", query: "皮卡丘" }).total, 1);
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
  for (const content of [
    ...exampleMoments,
    ...snapshot().contents.map(presentLegacyContent),
  ])
    assert.ok(validate(content), JSON.stringify(validate.errors));
  assert.equal(validate({ ...exampleMoments[0], type: "guess" }), false);
});
