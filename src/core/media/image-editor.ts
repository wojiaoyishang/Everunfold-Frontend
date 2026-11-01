import type {
  CropRect,
  ImageRecipe,
  Rotation,
} from "@/generated/settings-contract";
export type ImageSize = { width: number; height: number };
export const emptyRecipe: ImageRecipe = {
  rotation: 0,
  flip_horizontal: false,
  flip_vertical: false,
  crop: null,
  output_width: null,
};
export function orientedSize(
  size: ImageSize,
  rotation: Rotation = 0,
): ImageSize {
  return rotation % 180 ? { width: size.height, height: size.width } : size;
}
export function imageMatrix(size: ImageSize, recipe: ImageRecipe) {
  const rotation = recipe.rotation ?? 0;
  const rotated = orientedSize(size, rotation);
  const matrix =
    rotation === 90
      ? [0, 1, -1, 0, size.height, 0]
      : rotation === 180
        ? [-1, 0, 0, -1, size.width, size.height]
        : rotation === 270
          ? [0, -1, 1, 0, 0, size.width]
          : [1, 0, 0, 1, 0, 0];
  if (recipe.flip_horizontal) {
    matrix[0] *= -1;
    matrix[2] *= -1;
    matrix[4] = rotated.width - matrix[4];
  }
  if (recipe.flip_vertical) {
    matrix[1] *= -1;
    matrix[3] *= -1;
    matrix[5] = rotated.height - matrix[5];
  }
  return `matrix(${matrix.join(" ")})`;
}
export function clampCrop(crop: CropRect, size: ImageSize): CropRect {
  const x = Math.max(0, Math.min(size.width - 1, Math.round(crop.x)));
  const y = Math.max(0, Math.min(size.height - 1, Math.round(crop.y)));
  return {
    x,
    y,
    width: Math.max(1, Math.min(size.width - x, Math.round(crop.width))),
    height: Math.max(1, Math.min(size.height - y, Math.round(crop.height))),
  };
}
export function centeredCrop(size: ImageSize, ratio: ImageSize): CropRect {
  const width = Math.max(
    1,
    Math.min(
      size.width,
      Math.floor((size.height * ratio.width) / ratio.height),
    ),
  );
  const height = Math.max(
    1,
    Math.min(size.height, Math.floor((width * ratio.height) / ratio.width)),
  );
  return {
    x: Math.floor((size.width - width) / 2),
    y: Math.floor((size.height - height) / 2),
    width,
    height,
  };
}
export function outputSize(size: ImageSize, recipe: ImageRecipe): ImageSize {
  const area = recipe.crop ?? orientedSize(size, recipe.rotation);
  const width = Math.max(
    1,
    Math.min(area.width, recipe.output_width ?? area.width),
  );
  return {
    width,
    height: Math.max(1, Math.round((area.height * width) / area.width)),
  };
}
export function formatBytes(bytes: number) {
  return bytes < 1048576
    ? `${Math.max(1, Math.ceil(bytes / 1024))} KB`
    : `${(bytes / 1048576).toFixed(1)} MB`;
}
