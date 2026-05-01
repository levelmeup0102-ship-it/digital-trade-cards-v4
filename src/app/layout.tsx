import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'SIGNAL · 디지털 무역 전략카드 | ConnectAI',
  description: '카드게임으로 쉽게 진출전략을 만들어 보세요.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <head>
        {/* Pretendard 폰트 - 한국어 가독성 최강 */}
        <link
          rel="stylesheet"
          as="style"
          crossOrigin="anonymous"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
      </head>
      <body className="bg-gray-950 text-white min-h-screen" style={{ fontFamily: "'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, system-ui, sans-serif" }}>
        {children}
      </body>
    </html>
  );
}
