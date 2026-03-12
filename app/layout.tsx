import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";
import { LayoutDashboard, PlusCircle } from "lucide-react";

export const metadata: Metadata = {
  title: "拾得物管理システム",
  description: "効率的な施設内管理ツール",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body style={{ margin: 0, backgroundColor: "#f8fafc" }}>
        {/* 固定ナビゲーションバー */}
        <nav style={{
          backgroundColor: "#fff",
          borderBottom: "1px solid #e2e8f0",
          padding: "0 20px",
          height: "64px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "sticky",
          top: 0,
          zIndex: 100,
          boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)"
        }}>
          <div style={{
            width: "100%",
            maxWidth: "1200px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center"
          }}>
            {/* 左側：ロゴ（ダッシュボードへ戻る） */}
            <Link href="/" style={{ textDecoration: "none", color: "inherit" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
                <div style={{ backgroundColor: "#2563eb", padding: "6px", borderRadius: "8px" }}>
                  <LayoutDashboard size={20} color="#fff" />
                </div>
                <span style={{ fontWeight: "900", fontSize: "16px", color: "#0f172a", letterSpacing: "-0.5px" }}>
                  LOST ITEM MANAGER
                </span>
              </div>
            </Link>

            {/* 右側：アクションボタン */}
            <div style={{ display: "flex", gap: "12px" }}>
              <Link href="/" style={{ textDecoration: "none" }}>
                <button style={{
                  padding: "10px 16px",
                  backgroundColor: "#fff",
                  color: "#475569",
                  border: "1px solid #e2e8f0",
                  borderRadius: "10px",
                  fontSize: "14px",
                  fontWeight: "bold",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  transition: "all 0.2s"
                }}>
                  ダッシュボード
                </button>
              </Link>
              
              <Link href="/items/new" style={{ textDecoration: "none" }}>
                <button style={{
                  padding: "10px 18px",
                  backgroundColor: "#2563eb",
                  color: "#fff",
                  border: "none",
                  borderRadius: "10px",
                  fontSize: "14px",
                  fontWeight: "bold",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  boxShadow: "0 4px 6px -1px rgba(37, 99, 235, 0.2)",
                  transition: "all 0.2s"
                }}>
                  <PlusCircle size={18} />
                  新規登録
                </button>
              </Link>
            </div>
          </div>
        </nav>

        <main>{children}</main>
      </body>
    </html>
  );
}
