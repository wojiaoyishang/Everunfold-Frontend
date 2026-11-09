import { strict as assert } from "node:assert";
import { test } from "node:test";
import { layoutWords } from "../src/core/taxonomy/cloud-layout";
test("weighted tags pack deterministically without overlap on desktop and mobile", () => {
  const words = Array.from({ length: 80 }, (_, i) => ({
    id: String(i),
    name: `标签 ${i}`,
    count: 80 - i,
  }));
  for (const width of [300, 800]) {
    const height = width < 500 ? 360 : 440,
      measure = (text: string, size: number) => text.length * size * 0.65;
    const result = layoutWords(words, width, height, measure);
    assert.deepEqual(result, layoutWords(words, width, height, measure));
    assert.ok(result.length > 5);
    assert.ok(result[0].size > result.at(-1)!.size);
    for (const [i, a] of result.entries()) {
      assert.ok(
        a.x >= 0 &&
          a.y >= 0 &&
          a.x + a.width <= width &&
          a.y + a.height <= height,
      );
      for (const b of result.slice(i + 1))
        assert.ok(
          a.x + a.width <= b.x ||
            b.x + b.width <= a.x ||
            a.y + a.height <= b.y ||
            b.y + b.height <= a.y,
        );
    }
  }
});
