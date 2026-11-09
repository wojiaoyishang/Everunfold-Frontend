import { test } from "node:test";
import { strict as assert } from "node:assert";
import {
  checkTaskParameters,
  initialTaskParameters,
  readTaskParameterJSON,
  taskParameterFields,
} from "../src/core/tasks/task-parameters";

test("registered parameter defaults and primitive types survive editing without string coercion", () => {
  const schema = {
    type: "object",
    required: ["count", "active", "mode"],
    additionalProperties: false,
    properties: {
      count: { type: "integer", minimum: 1, maximum: 10, default: 3 },
      active: { type: "boolean", default: false },
      mode: { $ref: "#/$defs/Mode" },
      options: {
        type: "object",
        properties: { names: { type: "array", items: { type: "string" } } },
      },
    },
    $defs: { Mode: { type: "string", enum: ["fast", "safe"] } },
  };
  const values = initialTaskParameters(schema, {
    count: 5,
    mode: "safe",
    options: { names: ["first"] },
  });
  assert.deepEqual(values, {
    count: 5,
    active: false,
    mode: "safe",
    options: { names: ["first"] },
  });
  assert.deepEqual(checkTaskParameters(schema, values), []);
  assert.deepEqual(
    taskParameterFields(schema).find((field) => field.key === "mode")
      ?.definition.enum,
    ["fast", "safe"],
  );
  assert.ok(checkTaskParameters(schema, { ...values, count: "5" }).length);
  assert.ok(checkTaskParameters(schema, { ...values, count: 0 }).length);
  assert.ok(checkTaskParameters(schema, { ...values, extra: 1 }).length);
  assert.ok(checkTaskParameters(schema, { ...values, mode: "unknown" }).length);
});

test("JSON parameter mode preserves nested data and rejects non-object payloads", () => {
  assert.deepEqual(
    readTaskParameterJSON('{"enabled":false,"count":2,"items":[{"a":null}]}'),
    {
      enabled: false,
      count: 2,
      items: [{ a: null }],
    },
  );
  for (const source of [
    "[]",
    "null",
    "2",
    '"text"',
    "{invalid}",
    '{"value":1e1000}',
  ])
    assert.equal(readTaskParameterJSON(source), null);
  assert.ok(checkTaskParameters({}, { value: Infinity }).length);
  assert.ok(checkTaskParameters({}, { message: "字".repeat(12000) }).length);
  const defaults = { options: { names: ["original"] } };
  const copied = initialTaskParameters({}, defaults);
  (copied.options as { names: string[] }).names.push("new");
  assert.deepEqual(defaults, { options: { names: ["original"] } });
});
