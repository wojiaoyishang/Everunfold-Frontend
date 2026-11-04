"use client";
import { useState } from "react";
import dynamic from "next/dynamic";
import {
  type ContentFeatureKind,
  type ContentFeatureValue,
} from "@/core/editor/content-feature-source";
import { Button } from "./primitives";
import { Icon } from "../icon";
const FormulaEditorDialog = dynamic(
  () => import("./formula/formula-editor-dialog"),
  { ssr: false },
);

const CodeEditorDialog = dynamic(() => import("./code/code-editor-dialog"), {
  ssr: false,
});

export interface FeatureInsertion {
  initial?: Partial<ContentFeatureValue>;
  apply: (value: ContentFeatureValue) => void;
  dispose?: () => void;
}
/** Both editor formats and both source/visual surfaces use these same shared dialogs. */
export function ContentFeatureButtons({
  className,
  disabled,
  prepare,
}: {
  className: string;
  disabled?: boolean;
  prepare: (kind: ContentFeatureKind) => FeatureInsertion;
}) {
  const [opened, setOpened] = useState<{
    kind: ContentFeatureKind;
    insertion: FeatureInsertion;
  }>();
  return (
    <>
      {(
        [
          ["code", "代码块", "code-block"],
          ["math", "公式", "formula"],
        ] as const
      ).map(([kind, label, icon]) => (
        <Button
          key={kind}
          className={className}
          disabled={disabled}
          aria-label={label}
          title={label}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => setOpened({ kind, insertion: prepare(kind) })}
        >
          <Icon name={icon} />
        </Button>
      ))}
      {opened?.kind === "math" ? (
        <FormulaEditorDialog
          insertion={opened.insertion}
          onClose={() => setOpened(undefined)}
        />
      ) : (
        opened && (
          <CodeEditorDialog
            insertion={opened.insertion}
            onClose={() => setOpened(undefined)}
          />
        )
      )}
    </>
  );
}
