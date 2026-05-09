'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

const S = {
  green: '#E7FE55',
  aqua: '#C1E8EB',
  cyan: '#06B6D4',
  purple: '#8B5CF6',
  navy: '#111111',
};

// 체험판 URL (실제 배포 URL로 자동 감지)
function getDemoUrl(): string {
  if (typeof window === 'undefined') return '';
  return `${window.location.origin}/demo`;
}

// QR 코드 생성용 외부 API URL (Google Charts API)
// quietZone(여백)과 색상 커스터마이징 가능
function getQRImageUrl(text: string, size: number = 600): string {
  const encoded = encodeURIComponent(text);
  // QR Server API (무료, CORS 허용)
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encoded}&margin=10&color=000000&bgcolor=FFFFFF&qzone=2`;
}

export default function DemoQRPage() {
  const router = useRouter();
  const [demoUrl, setDemoUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const qrImgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    setDemoUrl(getDemoUrl());
  }, []);

  const handleCopy = () => {
    navigator.clipboard.writeText(demoUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = async () => {
    if (!demoUrl) return;
    setDownloading(true);
    try {
      // 다운로드용으로는 더 큰 사이즈 (1200x1200)
      const downloadUrl = getQRImageUrl(demoUrl, 1200);
      const response = await fetch(downloadUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `SIGNAL_체험판_QR_${new Date().toISOString().split('T')[0]}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (e) {
      alert('다운로드 실패. 인터넷 연결을 확인하세요.');
      console.error(e);
    }
    setDownloading(false);
  };

  const handlePrint = () => {
    window.print();
  };

  if (!demoUrl) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-white font-mono text-sm">불러오는 중...</p>
      </div>
    );
  }

  const qrImageUrl = getQRImageUrl(demoUrl, 600);

  return (
    <div className="min-h-screen flex flex-col items-center px-4 py-6 md:py-10 relative overflow-hidden">

      {/* 배경 */}
      <div className="fixed inset-0 pointer-events-none print:hidden"
        style={{
          background: `
            radial-gradient(circle at 20% 25%, ${S.cyan}1A 0%, transparent 45%),
            radial-gradient(circle at 80% 60%, ${S.purple}1A 0%, transparent 50%)
          `,
          zIndex: 0,
        }} />

      {/* 상단 바 (인쇄 시 숨김) */}
      <div className="w-full max-w-3xl mb-6 flex items-center justify-between print:hidden relative z-10">
        <button
          onClick={() => router.push('/teacher')}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition hover:scale-[1.02]"
          style={{
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.1)',
            color: 'white',
          }}>
          ← 관리자 페이지
        </button>

        <div className="px-3 py-1.5 rounded-full font-mono text-[10px] font-bold tracking-widest"
          style={{
            background: `${S.cyan}15`,
            border: `1px solid ${S.cyan}66`,
            color: S.cyan,
          }}>
          ⚡ DEMO QR
        </div>
      </div>

      {/* 헤더 */}
      <div className="text-center mb-6 md:mb-8 relative z-10 print:mb-4">
        <p className="text-[10px] md:text-[11px] tracking-[5px] md:tracking-[7px] uppercase mb-2 font-mono font-bold"
          style={{ color: S.cyan }}>
          ConnectAI
        </p>
        <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight mb-2"
          style={{ textShadow: `0 0 20px ${S.cyan}66` }}>
          SIGNAL
        </h1>
        <p className="text-[12px] md:text-base font-bold tracking-[2px] md:tracking-[3px] font-mono"
          style={{ color: S.aqua }}>
          DIGITAL TRADE CARDS
        </p>
        <p className="text-sm md:text-base text-white mt-3 md:mt-4">
          QR 코드를 스캔해서 체험해보세요
        </p>
      </div>

      {/* QR 카드 */}
      <div className="bg-white rounded-3xl p-6 md:p-10 shadow-2xl relative z-10 mb-6"
        style={{ boxShadow: `0 20px 60px ${S.cyan}33, 0 0 100px ${S.cyan}22` }}>
        <img
          ref={qrImgRef}
          src={qrImageUrl}
          alt="SIGNAL 체험판 QR 코드"
          width="280"
          height="280"
          className="w-[280px] h-[280px] md:w-[400px] md:h-[400px] mx-auto block"
          crossOrigin="anonymous"
        />
      </div>

      {/* URL 표시 */}
      <div className="w-full max-w-md mb-6 relative z-10 print:hidden">
        <p className="text-[10px] font-mono text-white mb-2 text-center" style={{ opacity: 0.6 }}>
          체험판 URL
        </p>
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.1)',
          }}>
          <code className="flex-1 text-[12px] md:text-[13px] text-white font-mono truncate">
            {demoUrl}
          </code>
          <button
            onClick={handleCopy}
            className="flex-shrink-0 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all hover:scale-105"
            style={{
              background: copied ? `${S.green}22` : `${S.cyan}22`,
              border: `1px solid ${copied ? S.green : S.cyan}66`,
              color: copied ? S.green : S.cyan,
            }}>
            {copied ? '✓ 복사됨' : '📋 복사'}
          </button>
        </div>
      </div>

      {/* 액션 버튼들 */}
      <div className="flex flex-col sm:flex-row gap-3 w-full max-w-md mb-8 relative z-10 print:hidden">
        <button
          onClick={handleDownload}
          disabled={downloading}
          className="flex-1 py-3 font-black rounded-xl text-[13px] md:text-sm transition-all hover:scale-[1.02] disabled:opacity-50"
          style={{
            background: S.green,
            color: S.navy,
            boxShadow: `0 0 20px ${S.green}66`,
          }}>
          {downloading ? '다운로드 중...' : '📥 QR 이미지 다운로드'}
        </button>
        <button
          onClick={handlePrint}
          className="flex-1 py-3 font-bold rounded-xl text-[13px] md:text-sm transition-all hover:scale-[1.02]"
          style={{
            background: 'rgba(6, 182, 212, 0.1)',
            border: `1px solid ${S.cyan}66`,
            color: S.cyan,
          }}>
          🖨 인쇄하기
        </button>
      </div>

      {/* 안내문 */}
      <div className="w-full max-w-md mb-8 rounded-xl p-4 relative z-10 print:hidden"
        style={{
          background: 'rgba(255, 215, 0, 0.06)',
          border: '1px solid rgba(255, 215, 0, 0.2)',
        }}>
        <p className="text-[11px] font-mono tracking-widest text-yellow-400 mb-2 font-bold">
          💡 사용 안내
        </p>
        <ul className="text-[12px] text-white space-y-1.5 leading-relaxed" style={{ opacity: 0.9 }}>
          <li>• <strong>박람회 부스</strong>: QR 인쇄해서 부스에 부착</li>
          <li>• <strong>강의실/오리엔테이션</strong>: 프로젝터에 화면 띄우기</li>
          <li>• <strong>PPT 삽입</strong>: 다운로드한 이미지를 슬라이드에 추가</li>
          <li>• <strong>온라인 공유</strong>: URL 복사해서 카톡/메일 전송</li>
        </ul>
      </div>

      {/* 푸터 (인쇄 시 보임) */}
      <div className="text-[10px] text-white text-center relative z-10 font-mono mb-4"
        style={{ opacity: 0.5 }}>
        © 2026 SIGNAL — ConnectAI · 체험판
      </div>

      {/* 인쇄용 스타일 */}
      <style jsx global>{`
        @media print {
          body {
            background: white !important;
          }
          .print\\:hidden {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
