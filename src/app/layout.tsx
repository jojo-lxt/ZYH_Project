import type { Metadata } from "next";
import { AntdRegistry } from "@ant-design/nextjs-registry";
import { AppProviders } from "@/app/providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "小红书内容助手",
  description: "上传图片和标签，生成小红书推荐草稿二维码。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="h-full antialiased">
      <body className="min-h-full">
        <AntdRegistry>
          <AppProviders>{children}</AppProviders>
        </AntdRegistry>
      </body>
    </html>
  );
}
