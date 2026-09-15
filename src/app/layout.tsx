import type { Metadata, Viewport } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Toast from "@/components/Toast";
import ReportModal from "@/components/ReportModal";

export const metadata: Metadata = {
  title: "CUshop",
  description: "社区二手买卖回血 · 手作闲置好物交易",
};

// 跨设备：显式声明视口，保证手机/平板按实际宽度渲染（不缩放成桌面宽度）
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#faf6ee",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body>
        <Navbar />
        <main className="page-main">{children}</main>
        <Toast />
        <ReportModal />
      </body>
    </html>
  );
}
