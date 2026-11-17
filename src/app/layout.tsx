import type { Metadata } from "next";
import { AppProvider } from "@/components/app-provider";
import { Shell } from "@/components/shell";
import "./globals.css";

export const metadata: Metadata = {
  title: "開店・閉店チェックリスト",
  description:
    "小さな店舗の毎日の定型チェック。担当者と時刻を記録し、未完了や気づきを次の担当者へ申し送ります。",
  icons: { icon: "/icon.svg", apple: "/icon-192.png" },
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>
        <AppProvider>
          <Shell>{children}</Shell>
        </AppProvider>
      </body>
    </html>
  );
}
