"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="standalone-state">
      <p className="state-code">稍作停留</p>
      <h1>内容暂时无法打开。</h1>
      <p>请稍后重试，故事会在这里继续。</p>
      <button className="primary-button" onClick={reset}>
        重试
      </button>
    </main>
  );
}
