import Link from "next/link";
export default function NotFound() {
  return (
    <main className="standalone-state">
      <p className="state-code">404</p>
      <h1>这个故事还没有展开。</h1>
      <p>地址可能已经变更，或这篇内容尚未公开。</p>
      <Link href="/" className="primary-button">
        回到首页
      </Link>
    </main>
  );
}
