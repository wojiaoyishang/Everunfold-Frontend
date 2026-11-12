"use client";
import { UiText } from "@/core/i18n/provider";

import { useEffect, useRef, useState, type RefObject } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "../components/icon";
import { useMotion } from "../hooks/use-motion";
import { startLoginHandoff } from "./login-handoff";

export function LoginSuccess({
  destination,
  cardRef,
  registered = false,
}: {
  destination: string;
  cardRef: RefObject<HTMLDivElement | null>;
  registered?: boolean;
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
      <h2>
        <UiText text={registered ? "注册成功" : "登录成功"} />
      </h2>
      <p>
        <UiText
          text={
            destination.startsWith("/admin")
              ? "正在进入后台"
              : destination === "/account"
                ? "正在进入账号中心"
                : "正在返回站点"
          }
        />
      </p>
    </div>
  );
}
