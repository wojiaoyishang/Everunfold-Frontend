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

test("dense clouds cap common words at 100 and pack rotated boxes without overlap", () => {
  const words = Array.from({ length: 125 }, (_, i) => ({
    id: String(i),
    name: `标签 ${i}`,
    count: 125 - i,
  }));
  const measure = (text: string, size: number) => text.length * size * 0.65;
  const options = {
    dense: true,
    limit: 100,
    minSize: 11,
    maxSize: 32,
    rotations: [0, 0, 0, 90, -90, 20, -20],
  };
  for (const [width, height] of [
    [300, 360],
    [1000, 400],
  ]) {
    const result = layoutWords(words, width, height, measure, options);
    assert.deepEqual(
      result,
      layoutWords(words, width, height, measure, options),
    );
    const ordinary = layoutWords(words, width, height, measure);
    assert.ok(result.length > ordinary.length * 2);
    assert.ok(result.length >= (width < 500 ? 50 : 100));
    assert.ok(result.length <= 100);
    assert.ok(result.every((word) => Number(word.id) < 100));
    assert.ok(result.some((word) => Math.abs(word.angle) === 90));
    assert.ok(result.some((word) => Math.abs(word.angle) === 20));
    for (const [index, word] of result.entries()) {
      assert.ok(word.size >= options.minSize && word.size <= options.maxSize);
      assert.ok(word.x >= 0 && word.y >= 0);
      assert.ok(word.x + word.width <= width && word.y + word.height <= height);
      const angle = (word.angle * Math.PI) / 180;
      assert.ok(
        Math.abs(
          word.width -
            (Math.abs(word.textWidth * Math.cos(angle)) +
              Math.abs(word.textHeight * Math.sin(angle))),
        ) < 1e-8,
      );
      assert.ok(
        Math.abs(
          word.height -
            (Math.abs(word.textWidth * Math.sin(angle)) +
              Math.abs(word.textHeight * Math.cos(angle))),
        ) < 1e-8,
      );
      for (const other of result.slice(index + 1)) {
        assert.ok(
          word.x + word.width <= other.x ||
            other.x + other.width <= word.x ||
            word.y + word.height <= other.y ||
            other.y + other.height <= word.y,
        );
      }
    }
  }
});

test("dense packing is bounded for empty, narrow and oversized inputs", () => {
  const words = Array.from({ length: 300 }, (_, i) => ({
    id: String(i),
    name: "非常长的标签".repeat(30),
    count: i,
  }));
  const measure = (text: string, size: number) => text.length * size;
  assert.deepEqual(layoutWords(words, 0, 360, measure, { dense: true }), []);
  assert.deepEqual(layoutWords([], 300, 360, measure, { dense: true }), []);
  const result = layoutWords(words, 300, 360, measure, {
    dense: true,
    limit: 500,
    rotations: [0, 90],
  });
  assert.ok(result.length <= 100);
  assert.ok(result.every((word) => Number(word.id) >= 200));
});

test("sparse fill grows words to use the canvas while keeping every label", () => {
  const words = Array.from({ length: 10 }, (_, index) => ({
    id: String(index),
    name: `标签 ${index}`,
    count: 10 - index,
  }));
  const measure = (text: string, size: number) => text.length * size * 0.65;
  const options = {
    limit: 100,
    minSize: 11,
    maxSize: 32,
    rotations: [0, 0, 0, 90, -90, 20, -20],
    dense: true,
    fill: true,
  };
  for (const [width, height] of [
    [300, 360],
    [1000, 400],
  ]) {
    const result = layoutWords(words, width, height, measure, options);
    assert.equal(result.length, words.length);
    assert.ok(result[0].size > options.maxSize);
    assert.ok(result[0].size > (width > 500 ? 70 : 40));
    for (const [i, word] of result.entries()) {
      assert.ok(
        word.x >= 0 &&
          word.y >= 0 &&
          word.x + word.width <= width &&
          word.y + word.height <= height,
      );
      for (const other of result.slice(i + 1))
        assert.ok(
          word.x + word.width <= other.x ||
            other.x + other.width <= word.x ||
            word.y + word.height <= other.y ||
            other.y + other.height <= word.y,
        );
    }
  }
});
