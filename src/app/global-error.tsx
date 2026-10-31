"use client";
import { FailureView } from "@/themes/argon/failure/failure-view";
import { initializeAppearance } from "@/core/browser/appearance-policy";
import { initializeMotion } from "@/core/browser/motion-policy";

export default function GlobalError({ reset }: { reset: () => void }) {
  return (
    <html lang="zh-CN" data-failure-document suppressHydrationWarning>
      <head>
        <meta name="robots" content="noindex,nofollow" />
        <title>页面显示出错了 · Everunfold</title>
        <script
          dangerouslySetInnerHTML={{
            __html: initializeAppearance + initializeMotion,
          }}
        />
      </head>
      <body>
        <main>
          <FailureView status={500} reset={reset} embedded={false} />
        </main>
      </body>
    </html>
  );
}
