import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sổ bán kính",
  description: "Nhập đơn bán, quản lý tồn kho và giao hàng.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body className="antialiased">{children}</body>
    </html>
  );
}
