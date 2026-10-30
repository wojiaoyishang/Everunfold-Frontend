"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useRouteState } from "./route-state";

const empty = { progress: 0, activeId: "", article: false, comments: false };
const ReadingContext = createContext(empty);

export function ReadingStateProvider({ children }: { children: ReactNode }) {
  const { route, toc } = useRouteState();
  const [state, setState] = useState(empty);
  useEffect(() => {
    let frame = 0;
    function update() {
      frame = 0;
      const article = document.querySelector<HTMLElement>(".article-content");
      let next = empty;
      if (article) {
        const bounds = article.getBoundingClientRect();
        const length = Math.max(1, bounds.height - window.innerHeight + 100);
        let activeId = toc[0]?.id ?? "";
        for (const heading of toc) {
          const element = document.getElementById(heading.id);
          if (element && element.getBoundingClientRect().top <= 135)
            activeId = heading.id;
        }
        next = {
          article: true,
          comments: !!document.getElementById("comments"),
          activeId,
          progress: Math.round(
            Math.max(0, Math.min(1, (100 - bounds.top) / length)) * 100,
          ),
        };
      }
      setState((previous) =>
        previous.progress === next.progress &&
        previous.activeId === next.activeId &&
        previous.article === next.article &&
        previous.comments === next.comments
          ? previous
          : next,
      );
    }
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    schedule();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    const observer = new ResizeObserver(schedule);
    const article = document.querySelector(".article-content");
    if (article) observer.observe(article);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, [route, toc]);
  return (
    <ReadingContext.Provider value={state}>{children}</ReadingContext.Provider>
  );
}

export function useReadingState() {
  return useContext(ReadingContext);
}
