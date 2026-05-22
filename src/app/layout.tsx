import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://connectai.academy'),
  title: 'SIGNAL · 디지털 무역 전략카드 | ConnectAI',
  description: '카드게임으로 쉽게 진출전략을 만들어 보세요.',

  // ⭐ NEW: 카톡/페이스북/슬랙 등에 링크 공유 시 미리보기 카드 표시
  openGraph: {
    title: 'SIGNAL · 디지털 무역 전략카드',
    description: '카드게임으로 쉽게 진출전략을 만들어 보세요. by ConnectAI',
    url: 'https://connectai.academy',
    siteName: 'SIGNAL',
    images: [
      {
        url: '/connect-ai-logo.png',
        width: 1200,
        height: 427,
        alt: 'SIGNAL · ConnectAI 디지털 무역 카드게임',
      },
    ],
    locale: 'ko_KR',
    type: 'website',
  },

  // ⭐ NEW: 트위터 카드 (트위터에서도 미리보기 표시)
  twitter: {
    card: 'summary_large_image',
    title: 'SIGNAL · 디지털 무역 전략카드',
    description: '카드게임으로 쉽게 진출전략을 만들어 보세요. by ConnectAI',
    images: ['/connect-ai-logo.png'],
  },

  // ⭐ NEW: 파비콘 (브라우저 탭에 보이는 아이콘)
  icons: {
    icon: '/connect-ai-logo.png',
    apple: '/connect-ai-logo.png',
  },
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
