"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "../components/icon";
import { useMotion } from "../hooks/use-motion";
import { startLoginHandoff } from "./login-handoff";

export function LoginSuccess({
  destination,
  cardRef,
}: {
  destination: string;
  cardRef: RefObject<HTMLDivElement | null>;
}) {
  const router = useRouter();
  const { enabled } = useMotion();
  const feedback = useRef<HTMLDivElement>(null);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (!feedback.current || !cardRef.current) return;
    router.prefetch(destination);
    return startLoginHandoff({
      feedback: feedback.current,
      card: cardRef.current,
      animated: enabled,
      onLeaving: () => setLeaving(true),
      navigate: () => router.replace(destination),
    });
  }, [destination, router, enabled, cardRef]);

  return (
    <div
      ref={feedback}
      className="login-success"
      role="status"
      aria-live="polite"
      data-handoff={leaving ? "leaving" : "confirming"}
    >
      <span className="login-success-icon">
        <Icon name="check" />
      </span>
      <h2>登录成功</h2>
      <p>
        {destination.startsWith("/admin") ? "正在进入后台" : "正在返回站点"}
      </p>
    </div>
  );
}
