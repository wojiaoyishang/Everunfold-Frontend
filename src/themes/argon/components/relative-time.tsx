"use client";
import { useEffect, useState } from "react";
import { displayDate } from "@/core/content/query";
import { relativeTime } from "@/core/browser/relative-time";

export function RelativeTime({ value }: { value: string }) {
  const [label, setLabel] = useState("");
  useEffect(() => {
    const update = () => setLabel(relativeTime(value, Date.now()));
    const frame = requestAnimationFrame(update);
    const timer = setInterval(update, 60_000);
    return () => {
      cancelAnimationFrame(frame);
      clearInterval(timer);
    };
  }, [value]);
  return (
    <time dateTime={value} title={displayDate(value, true)}>
      {label || displayDate(value, true)}
    </time>
  );
}
