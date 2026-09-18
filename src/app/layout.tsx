import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "빠작 학습노트",
  description: "문제집 목차를 등록하고, AI가 만든 대체 문제로 연습하는 학습 도구",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className="h-full antialiased">
      <head>
        {/* eslint-disable-next-line @next/next/no-page-custom-font -- App Router root layout is the correct place for this */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Gowun+Batang:wght@400;700&family=Noto+Sans+KR:wght@400;500;600;700&display=swap"
        />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
