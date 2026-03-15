import type { Metadata, Viewport } from "next";
import "./globals.css";
import Link from "next/link";
import { LayoutDashboard, User } from "lucide-react";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: "拾得物管理ポータル",
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
        {/* 1段目：非固定（スクロールで上に流れる） */}
        <nav style={{
          backgroundColor: "#fff",
          borderBottom: "1px solid #e2e8f0",
          padding: "0 20px",
          height: "56px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}>
          <div style={{
            width: "100%",
            maxWidth: "1200px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center"
          }}>
            <Link href="/" style={{ textDecoration: "none", color: "inherit" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
                <div style={{ backgroundColor: "#2563eb", padding: "6px", borderRadius: "8px" }}>
                  <LayoutDashboard size={18} color="#fff" />
                </div>
                <span style={{ fontWeight: "900", fontSize: "16px", color: "#0f172a", letterSpacing: "-0.5px" }}>
                  拾得物管理ポータル
                </span>
              </div>
            </Link>

            <Link href="/mypage" style={{ textDecoration: "none" }}>
              <button style={{
                padding: "8px 16px",
                backgroundColor: "#fff",
                color: "#2563eb",
                border: "1px solid #e2e8f0",
                borderRadius: "8px",
                fontSize: "13px",
                fontWeight: "bold",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px"
              }}>
                <User size={16} />
                マイページ
              </button>
            </Link>
          </div>
        </nav>

        <main>{children}</main>
      </body>
    </html>
  );
}