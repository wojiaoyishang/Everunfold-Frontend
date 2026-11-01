"use client";
import { useState } from "react";
import type {
  ImageRecipe,
  MediaDetails,
  Rotation,
} from "@/generated/settings-contract";
import {
  centeredCrop,
  clampCrop,
  emptyRecipe,
  imageMatrix,
  orientedSize,
  outputSize,
} from "@/core/media/image-editor";
import { Button, TextField } from "../../components/ui/primitives";
import { ImageCropSurface } from "../../components/ui/image-crop-surface";
import { Icon } from "../../components/icon";
export function MediaImageEditor({
  detail,
  busy,
  onSave,
  onBack,
  onDirty,
}: {
  detail: MediaDetails;
  busy: boolean;
  onSave: (recipe: ImageRecipe) => void;
  onBack: () => void;
  onDirty: (dirty: boolean) => void;
}) {
  const [history, setHistory] = useState<ImageRecipe[]>([emptyRecipe]);
  const [cursor, setCursor] = useState(0);
  const recipe = history[cursor];
  const source = { width: detail.width!, height: detail.height! };
  const size = orientedSize(source, recipe.rotation);
  const output = outputSize(source, recipe);
  const crop = recipe.crop;
  const commit = (next: ImageRecipe) => {
    const entries = [...history.slice(0, cursor + 1), next].slice(-40);
    setHistory(entries);
    setCursor(entries.length - 1);
    onDirty(JSON.stringify(next) !== JSON.stringify(emptyRecipe));
  };
  const move = (next: number) => {
    setCursor(next);
    onDirty(JSON.stringify(history[next]) !== JSON.stringify(emptyRecipe));
  };
  return (
    <div className="admin-image-editor">
      <div className="admin-image-tools">
        <Button className="admin-button" disabled={busy} onClick={onBack}>
          <Icon name="arrow-left" />
          附件详情
        </Button>
        <div className="admin-image-toolgroup" aria-label="图片操作">
          <Button
            className="admin-button"
            disabled={busy}
            title="顺时针旋转 90 度"
            onClick={() =>
              commit({
                ...recipe,
                rotation: ((recipe.rotation! + 90) % 360) as Rotation,
                crop: null,
                output_width: null,
              })
            }
          >
            <Icon name="rotate" />
            旋转
          </Button>
          <Button
            className="admin-icon-button"
            disabled={busy}
            aria-label="水平翻转"
            title="水平翻转"
            onClick={() =>
              commit({ ...recipe, flip_horizontal: !recipe.flip_horizontal })
            }
          >
            <Icon name="flip-horizontal" />
          </Button>
          <Button
            className="admin-icon-button"
            disabled={busy}
            aria-label="垂直翻转"
            title="垂直翻转"
            onClick={() =>
              commit({ ...recipe, flip_vertical: !recipe.flip_vertical })
            }
          >
            <Icon name="flip-vertical" />
          </Button>
          <Button
            className="admin-button"
            aria-pressed={Boolean(crop)}
            disabled={busy}
            onClick={() =>
              commit({
                ...recipe,
                crop: crop ? null : { x: 0, y: 0, ...size },
                output_width: null,
              })
            }
          >
            <Icon name="crop" />
            裁剪
          </Button>
        </div>
        <div className="admin-image-toolgroup">
          <Button
            className="admin-icon-button"
            aria-label="撤销编辑"
            title="撤销"
            disabled={busy || cursor === 0}
            onClick={() => move(cursor - 1)}
          >
            <Icon name="undo" />
          </Button>
          <Button
            className="admin-icon-button"
            aria-label="重做编辑"
            title="重做"
            disabled={busy || cursor === history.length - 1}
            onClick={() => move(cursor + 1)}
          >
            <Icon name="redo" />
          </Button>
          <Button
            className="admin-button"
            disabled={busy || cursor === 0}
            onClick={() => commit(emptyRecipe)}
          >
            重置
          </Button>
        </div>
      </div>
      <div className="admin-image-workspace">
        <div className="admin-image-stage">
          <ImageCropSurface
            key={`${detail.id}:${recipe.rotation}`}
            url={detail.url}
            source={source}
            size={size}
            matrix={imageMatrix(source, recipe)}
            crop={crop ?? null}
            disabled={busy}
            onCrop={(next) =>
              commit({ ...recipe, crop: next, output_width: null })
            }
          />
        </div>
        <aside className="admin-image-options">
          <h3>编辑图片</h3>
          <p>
            原图 {source.width} × {source.height} px
          </p>
          {crop ? (
            <>
              <h4>裁剪区域</h4>
              <p>在图片上拖动选择区域，或输入像素值。</p>
              <div className="admin-image-presets">
                {[
                  [1, 1],
                  [4, 3],
                  [16, 9],
                ].map(([w, h]) => (
                  <Button
                    key={w}
                    className="admin-button"
                    disabled={busy}
                    onClick={() => {
                      commit({
                        ...recipe,
                        crop: centeredCrop(size, { width: w, height: h }),
                        output_width: null,
                      });
                    }}
                  >
                    {w}:{h}
                  </Button>
                ))}
              </div>
              <div className="admin-image-numbers">
                {(
                  [
                    ["x", "左侧"],
                    ["y", "顶部"],
                    ["width", "宽度"],
                    ["height", "高度"],
                  ] as const
                ).map(([key, label]) => (
                  <label key={key}>
                    {label}
                    <TextField
                      type="number"
                      aria-label={`裁剪${label}`}
                      min={key === "x" || key === "y" ? 0 : 1}
                      max={
                        key === "x" || key === "width"
                          ? size.width
                          : size.height
                      }
                      value={crop[key]}
                      disabled={busy}
                      onChange={(event) => {
                        const value = event.target.valueAsNumber;
                        if (Number.isFinite(value))
                          commit({
                            ...recipe,
                            crop: clampCrop({ ...crop, [key]: value }, size),
                            output_width: null,
                          });
                      }}
                    />
                  </label>
                ))}
              </div>
            </>
          ) : (
            <p className="admin-image-hint">
              可旋转、翻转图片，或开启裁剪选择区域。
            </p>
          )}
          <h4>输出尺寸</h4>
          <label className="admin-media-label">
            宽度（px）
            <TextField
              type="number"
              min={1}
              max={crop?.width ?? size.width}
              value={output.width}
              disabled={busy}
              onChange={(event) => {
                const value = event.target.valueAsNumber;
                if (Number.isFinite(value))
                  commit({
                    ...recipe,
                    output_width: Math.max(
                      1,
                      Math.min(crop?.width ?? size.width, Math.round(value)),
                    ),
                  });
              }}
            />
          </label>
          <p>
            等比缩放 · {output.width} × {output.height} px
          </p>
          <p>编辑后另存一份，原图与现有文章中的图片保持不变。</p>
        </aside>
      </div>
      <div className="admin-media-dialog-footer">
        <span>
          输出：{output.width} × {output.height} px
        </span>
        <Button
          className="admin-button admin-button-primary"
          disabled={
            busy || JSON.stringify(recipe) === JSON.stringify(emptyRecipe)
          }
          onClick={() => onSave(recipe)}
        >
          <Icon name="check" />
          {busy ? "正在处理…" : "另存为新图片"}
        </Button>
      </div>
    </div>
  );
}
