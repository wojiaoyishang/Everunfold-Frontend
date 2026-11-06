import assert from "node:assert/strict";
import test from "node:test";
import {
  centeredCrop,
  clampCrop,
  emptyRecipe,
  imageMatrix,
  orientedSize,
  outputSize,
} from "../src/core/media/image-editor";
import type { ImageRecipe, Rotation } from "@/core/contracts/settings";

function point(
  size: { width: number; height: number },
  recipe: ImageRecipe,
  x: number,
  y: number,
) {
  const matrix = imageMatrix(size, recipe).slice(7, -1).split(" ").map(Number);
  return [
    matrix[0] * x + matrix[2] * y + matrix[4],
    matrix[1] * x + matrix[3] * y + matrix[5],
  ];
}
test("preview rotates clockwise before screen-axis flips and keeps every corner inside the output", () => {
  const source = { width: 640, height: 480 };
  assert.deepEqual(point(source, { rotation: 90 }, 0, 0), [480, 0]);
  assert.deepEqual(
    point(source, { rotation: 90, flip_horizontal: true }, 0, 0),
    [0, 0],
  );
  assert.deepEqual(
    point(
      source,
      { rotation: 90, flip_horizontal: true, flip_vertical: true },
      0,
      0,
    ),
    [0, 640],
  );
  for (const rotation of [0, 90, 180, 270] as Rotation[]) {
    const rotated = orientedSize(source, rotation);
    for (const flip_horizontal of [false, true])
      for (const flip_vertical of [false, true]) {
        const corners = [
          [0, 0],
          [640, 0],
          [0, 480],
          [640, 480],
        ].map(([x, y]) =>
          point(source, { rotation, flip_horizontal, flip_vertical }, x, y),
        );
        assert.equal(
          new Set(corners.map((corner) => corner.join(","))).size,
          4,
        );
        assert.ok(
          corners.every(
            ([x, y]) =>
              (x === 0 || x === rotated.width) &&
              (y === 0 || y === rotated.height),
          ),
        );
      }
  }
});
test("crop bounds are integer pixels and never escape portrait or one-pixel sources", () => {
  assert.deepEqual(
    clampCrop(
      { x: -1.2, y: 479.8, width: 800, height: 0 },
      { width: 640, height: 480 },
    ),
    { x: 0, y: 479, width: 640, height: 1 },
  );
  assert.deepEqual(
    centeredCrop({ width: 640, height: 480 }, { width: 1, height: 1 }),
    { x: 80, y: 0, width: 480, height: 480 },
  );
  assert.deepEqual(
    centeredCrop({ width: 480, height: 640 }, { width: 16, height: 9 }),
    { x: 0, y: 185, width: 480, height: 270 },
  );
  assert.deepEqual(
    centeredCrop({ width: 1, height: 1 }, { width: 16, height: 9 }),
    { x: 0, y: 0, width: 1, height: 1 },
  );
});
test("output dimensions follow rotated crop, shrink without upscaling, and round half pixels upwards", () => {
  assert.deepEqual(
    outputSize(
      { width: 640, height: 480 },
      { ...emptyRecipe, rotation: 90, output_width: 160 },
    ),
    { width: 160, height: 213 },
  );
  assert.deepEqual(
    outputSize(
      { width: 640, height: 480 },
      { crop: { x: 0, y: 0, width: 64, height: 33 }, output_width: 32 },
    ),
    { width: 32, height: 17 },
  );
  assert.deepEqual(
    outputSize({ width: 640, height: 480 }, { output_width: 900 }),
    { width: 640, height: 480 },
  );
});
