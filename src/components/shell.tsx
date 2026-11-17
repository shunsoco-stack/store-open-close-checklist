"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useApp } from "./app-provider";
import { Icon } from "./icon";

const links = [
  ["/", "today", "今日"],
  ["/handover", "handover", "申し送り"],
  ["/history", "history", "記録・集計"],
  ["/templates", "templates", "店舗・設定"],
  ["/about", "about", "このデモについて"],
];
export function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const { data, notice, notify, offline } = useApp();
  const isActive = (href: string) =>
    href === "/" ? path === "/" || path.startsWith("/check") : path.startsWith(href);
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link href="/" className="brand">
          <span className="brand-mark">
            <Icon name="check" size={28} />
          </span>
          <span>
            開店・閉店<span className="brand-sub">チェックリスト</span>
          </span>
        </Link>
        <p className="nav-label">WORKSPACE</p>
        <nav aria-label="メインメニュー">
          {links.map(([href, icon, label]) => (
            <Link key={href} href={href} className={`nav-link ${isActive(href) ? "active" : ""}`}>
              <Icon name={icon} />
              <span>{label}</span>
              {href === "/handover" &&
                !!data?.handovers.filter((h) => h.status === "unread").length && (
                  <span className="nav-count">
                    {data.handovers.filter((h) => h.status === "unread").length}
                  </span>
                )}
            </Link>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <span className="save-dot" /> この端末に自動保存<p>小さなお店の、気持ちいい一日を。</p>
          <span className="demo-label">DEMO WORKSPACE</span>
        </div>
      </aside>
      <div className="main-wrap">
        <header className="topbar">
          <span>
            店舗オペレーション <span className="muted">／ 毎日のチェック</span>
          </span>
          <span className="demo-pill">デモ用の架空データです</span>
        </header>
        {offline && (
          <div className="offline" role="status">
            オフライン（この端末に保存されます）
          </div>
        )}
        {notice && (
          <div className="notice" role="status">
            <span>{notice}</span>
            <button aria-label="通知を閉じる" onClick={() => notify("")}>
              ×
            </button>
          </div>
        )}
        <main>
          {data ? children : <div className="loading">チェックリストを準備しています…</div>}
        </main>
        <footer>
          開店・閉店チェックリスト <span>すべての日時は日本時間（JST）</span>
        </footer>
      </div>
    </div>
  );
}
