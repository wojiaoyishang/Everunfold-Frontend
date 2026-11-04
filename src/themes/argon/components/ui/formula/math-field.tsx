"use client";
import {
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type Ref,
} from "react";
import type { MathfieldElement, Selector } from "mathlive";
import { formulaArrayContext } from "@/core/editor/formula/structure";
import styles from "./formula-editor.module.css";

export interface FormulaFieldHandle {
  insert: (latex: string) => void;
  command: (command: Selector) => boolean;
  selected: () => string;
  select: (latex: string) => boolean;
  focus: () => void;
  keyboard: () => void;
}
/** The only MathLive DOM/lifecycle boundary. Never serialize an unchanged source. */
export function FormulaField({
  source,
  valid,
  display,
  disabled,
  onChange,
  onSelection,
  onHistory,
  ref,
}: {
  source: string;
  valid: boolean;
  display: boolean;
  disabled: boolean;
  onChange: (source: string) => void;
  onSelection: (latex: string) => void;
  onHistory: (undo: boolean, redo: boolean) => void;
  ref?: Ref<FormulaFieldHandle>;
}) {
  const host = useRef<HTMLDivElement>(null),
    keyboardHost = useRef<HTMLDivElement>(null);
  const field = useRef<MathfieldElement | null>(null);
  const applied = useRef("");
  const latest = useRef({
    source,
    valid,
    display,
    disabled,
    onChange,
    onSelection,
    onHistory,
  });
  const [state, setState] = useState<"loading" | "ready" | "failed">("loading");
  useEffect(() => {
    latest.current = {
      source,
      valid,
      display,
      disabled,
      onChange,
      onSelection,
      onHistory,
    };
  });
  useEffect(() => {
    let active = true,
      release = () => {};
    void import("mathlive")
      .then(({ MathfieldElement }) => {
        if (!active || !host.current || !keyboardHost.current) return;
        // Fonts are declared by the dialog's local, on-demand stylesheet; never use a CDN or sounds.
        MathfieldElement.fontsDirectory = null;
        MathfieldElement.soundsDirectory = null;
        const previousLocale = MathfieldElement.locale;
        MathfieldElement.locale = "zh-cn";
        const mf = new MathfieldElement();
        const keyboard = window.mathVirtualKeyboard;
        const previousLayouts = keyboard.layouts,
          previousToolbar = keyboard.editToolbar,
          previousContainer = keyboard.container;
        keyboard.hide({ animate: false });
        keyboard.container = keyboardHost.current;
        keyboard.editToolbar = "none";
        keyboard.layouts = [
          {
            label: "数字",
            rows: [
              ["7", "8", "9", "+", "-", "\\times", "\\div"],
              [
                "4",
                "5",
                "6",
                "(",
                ")",
                { latex: "\\sqrt{#0}" },
                { label: "下一个", command: "moveToNextPlaceholder" },
              ],
              [
                "1",
                "2",
                "3",
                "0",
                ".",
                "=",
                { label: "删除", command: "deleteBackward" },
              ],
            ],
          },
          {
            label: "字母",
            rows: [
              ["x", "y", "z", "a", "b", "c"],
              ["\\alpha", "\\beta", "\\gamma", "\\theta", "\\lambda", "\\pi"],
              ["\\mu", "\\sigma", "\\phi", "\\omega", "\\Delta", "\\Omega"],
            ],
          },
          {
            label: "符号",
            rows: [
              ["\\leq", "\\geq", "\\neq", "\\approx", "\\in", "\\infty"],
              [
                "\\frac{#0}{#?}",
                "\\sum_{#?}^{#?}{#0}",
                "\\int_{#?}^{#?}{#0}",
                "#0^{#?}",
                "#0_{#?}",
              ],
            ],
          },
        ];
        mf.mathVirtualKeyboardPolicy = "manual";
        mf.smartFence = true;
        mf.setAttribute("aria-label", "可视化公式编辑区");
        mf.setAttribute("data-editor-local-control", "true");
        mf.setAttribute("placeholder", "输入公式，或从上方选择结构");
        const syncHistory = () =>
          latest.current.onHistory(mf.canUndo(), mf.canRedo());
        const input = () => {
          const next = mf.getValue("latex-without-placeholders");
          applied.current = next;
          latest.current.onChange(next);
          syncHistory();
        };
        const selection = () =>
          latest.current.onSelection(
            mf.getValue(mf.selection, "latex-without-placeholders"),
          );
        const geometry = () => {
          if (keyboardHost.current)
            keyboardHost.current.style.height = keyboard.visible
              ? `${keyboard.boundingRect.height}px`
              : "0px";
        };
        const keyboardInput = (event: KeyboardEvent) => {
          if (
            event.key === "Enter" &&
            !event.ctrlKey &&
            !event.metaKey &&
            !event.shiftKey
          ) {
            event.preventDefault();
            mf.executeCommand("moveToNextPlaceholder");
          }
        };
        mf.addEventListener("input", input);
        mf.addEventListener("selection-change", selection);
        mf.addEventListener("undo-state-change", syncHistory);
        mf.addEventListener("keydown", keyboardInput);
        keyboard.addEventListener("geometrychange", geometry);
        keyboard.addEventListener("virtual-keyboard-toggle", geometry);
        host.current.append(mf);
        field.current = mf;
        mf.menuItems = [];
        if (latest.current.valid)
          mf.setValue(latest.current.source, { silenceNotifications: true });
        applied.current = latest.current.source;
        mf.defaultMode = latest.current.display ? "math" : "inline-math";
        mf.readOnly = !latest.current.valid || latest.current.disabled;
        mf.resetUndo();
        setState("ready");
        // Loading the visual engine must not steal focus from the source editor.
        release = () => {
          MathfieldElement.locale = previousLocale;
          keyboard.hide({ animate: false });
          keyboard.removeEventListener("geometrychange", geometry);
          keyboard.removeEventListener("virtual-keyboard-toggle", geometry);
          keyboard.container = previousContainer;
          keyboard.layouts = previousLayouts;
          keyboard.editToolbar = previousToolbar;
          mf.removeEventListener("input", input);
          mf.removeEventListener("selection-change", selection);
          mf.removeEventListener("undo-state-change", syncHistory);
          mf.removeEventListener("keydown", keyboardInput);
          field.current = null;
          mf.remove();
        };
      })
      .catch(() => {
        if (active) setState("failed");
      });
    return () => {
      active = false;
      release();
    };
  }, []);
  useEffect(() => {
    const mf = field.current;
    if (!mf) return;
    mf.readOnly = disabled || (!valid && applied.current !== source);
    mf.defaultMode = display ? "math" : "inline-math";
    if (valid && applied.current !== source) {
      mf.setValue(source, { silenceNotifications: true });
      applied.current = source;
      mf.resetUndo();
      onHistory(false, false);
    }
  }, [source, valid, disabled, display, state, onHistory]);
  useImperativeHandle(
    ref,
    () => ({
      insert(latex) {
        const mf = field.current;
        if (!mf || mf.readOnly) return;
        mf.focus();
        mf.insert(latex, {
          format: "latex",
          selectionMode: "placeholder",
          feedback: false,
        });
      },
      command(command) {
        const mf = field.current;
        if (!mf || mf.readOnly) return false;
        if (
          /^(?:addRow|addColumn|removeRow|removeColumn)/.test(command) &&
          formulaArrayContext(mf.position, mf.lastOffset, (offset) =>
            mf.getElementInfo(offset),
          ) === undefined
        )
          return false;
        mf.focus();
        return mf.executeCommand(command);
      },
      focus: () => field.current?.focus(),
      keyboard() {
        field.current?.focus();
        const keyboard = window.mathVirtualKeyboard;
        if (keyboard?.visible) keyboard.hide();
        else keyboard?.show();
      },
      selected: () => {
        const mf = field.current;
        return mf
          ? mf.getValue(mf.selection, "latex-without-placeholders")
          : "";
      },
      select(latex) {
        const mf = field.current;
        if (!mf || !latex.trim() || mf.lastOffset > 256) return false;
        // Only unique exact fragments are located; unsupported/ambiguous structures never guess a target.
        const needle = latex.replace(/\s+/g, ""),
          matches: [number, number][] = [];
        for (let start = 0; start < mf.lastOffset; start++) {
          for (
            let end = start + 1;
            end <= Math.min(mf.lastOffset, start + 40);
            end++
          ) {
            const fragment = mf
              .getValue(start, end, "latex-without-placeholders")
              .replace(/\s+/g, "");
            if (fragment === needle) matches.push([start, end]);
            if (fragment.length > needle.length + 24) break;
          }
        }
        if (matches.length !== 1) return false;
        mf.selection = { ranges: [matches[0]] };
        return true;
      },
    }),
    [],
  );
  return (
    <>
      <div className={styles.mathfield} ref={host} data-state={state}>
        {state !== "ready" && (
          <p role="status">
            {state === "loading"
              ? "正在准备公式编辑器…"
              : "可视化编辑器未能加载，可继续编辑 LaTeX 源码。"}
          </p>
        )}
      </div>
      <div
        className={styles.keyboard}
        ref={keyboardHost}
        aria-label="数学键盘"
      />
    </>
  );
}
