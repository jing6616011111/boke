import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import SearchBox from "@/components/SearchBox";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "我的博客",
  description: "一个用 Next.js + Markdown 搭建的个人博客",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="zh-CN"
      className={`${geistSans.variable} ${geistMono.variable} h-full`}
    >
      <body className="flex min-h-full flex-col antialiased">
        <header className="border-b border-gray-200">
          <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-4">
            <Link href="/" className="text-lg font-bold">
              我的博客
            </Link>
            <nav className="flex items-center gap-4 text-sm">
              <SearchBox />
              <Link href="/login" className="text-gray-500 hover:text-gray-900">
                管理
              </Link>
            </nav>
          </div>
        </header>
        <main className="flex-1">{children}</main>
        <footer className="border-t border-gray-200 py-6 text-center text-xs text-gray-400">
          © {new Date().getFullYear()} 我的博客
        </footer>
      </body>
    </html>
  );
}
