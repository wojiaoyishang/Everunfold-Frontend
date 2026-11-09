"use client";
import { useEffect, useRef, useState, type DragEvent } from "react";

/** File drops share the picker callback and its queue/validation. Text and block drags pass through. */
export function useFileDrop(
  onFiles: (files: File[]) => void,
  disabled = false,
) {
  const depth = useRef(0);
  const [active, setActive] = useState(false);
  const [message, setMessage] = useState("");
  const reset = () => {
    depth.current = 0;
    setActive(false);
  };
  useEffect(() => {
    window.addEventListener("dragend", reset);
    window.addEventListener("drop", reset);
    window.addEventListener("blur", reset);
    return () => {
      window.removeEventListener("dragend", reset);
      window.removeEventListener("drop", reset);
      window.removeEventListener("blur", reset);
    };
  }, []);
  const filesOnly = (event: DragEvent) =>
    event.dataTransfer.types.includes("Files");
  return {
    active: active && !disabled,
    message,
    handlers: {
      onDragEnter: (event: DragEvent) => {
        if (!filesOnly(event)) return;
        event.preventDefault();
        event.stopPropagation();
        depth.current += 1;
        setActive(true);
      },
      onDragOver: (event: DragEvent) => {
        if (!filesOnly(event)) return;
        event.preventDefault();
        event.stopPropagation();
        event.dataTransfer.dropEffect = disabled ? "none" : "copy";
      },
      onDragLeave: (event: DragEvent) => {
        if (!filesOnly(event)) return;
        event.stopPropagation();
        depth.current = Math.max(0, depth.current - 1);
        if (!depth.current) setActive(false);
      },
      onDrop: (event: DragEvent) => {
        if (!filesOnly(event)) return;
        event.preventDefault();
        event.stopPropagation();
        reset();
        if (disabled) return;
        const entries = Array.from(event.dataTransfer.items);
        const hasDirectory = entries.some(
          (item) => item.webkitGetAsEntry?.()?.isDirectory,
        );
        const files = entries.length
          ? entries
              .filter((item) => !item.webkitGetAsEntry?.()?.isDirectory)
              .map((item) => item.getAsFile())
              .filter((file): file is File => file !== null)
          : Array.from(event.dataTransfer.files);
        setMessage(hasDirectory ? "暂不支持文件夹，请拖入文件。" : "");
        if (files.length) onFiles(files);
      },
    },
  };
}
