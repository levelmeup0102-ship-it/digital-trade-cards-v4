'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { getClass } from '@/lib/teacher';
import type { Class } from '@/lib/teacher';

const S = {
  green: '#E7FE55',
  aqua: '#C1E8EB',
  cyan: '#06B6D4',
  purple: '#8B5CF6',
  navy: '#111111',
  gold: '#FFD700',
};

const LEVELS: Record<string, { label: string; emoji: string; color: string }> = {
  basic:    { label: '초급', emoji: '🌱', color: '#4ADE80' },
  standard: { label: '표준', emoji: '📘', color: '#4FB0C6' },
  advanced: { label: '심화', emoji: '🚀', color: '#A78BFA' },
};

// 학급 URL 생성
function getClassUrl(joinCode: string): string {
  if (typeof window === 'undefined') return '';
  return `${window.location.origin}/student/class/${joinCode}`;
}

// QR 이미지 URL 생성 (체험판 QR 페이지와 동일 패턴)
function getQRImageUrl(text: string, size: number = 600): string {
  const encoded = encodeURIComponent(text);
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encoded}&margin=10&color=000000&bgcolor=FFFFFF&qzone=2`;
}

export default function ClassQRPage() {
  const router = useRouter();
  const params = useParams();
  const classId = params.classId as string;

  const [cls, setCls] = useState<Class | null>(null);
  const [loading, setLoading] = useState(true);
  const [classUrl, setClassUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const qrImgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    (async () => {
      const c = await getClass(classId);
      setCls(c);
      if (c?.join_code) {
        setClassUrl(getClassUrl(c.join_code));
      }
      setLoading(false);
    })();
  }, [classId]);

  const handleCopy = () => {
    navigator.clipboard.writeText(classUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyCode = () => {
    if (!cls?.join_code) return;
    navigator.clipboard.writeText(cls.join_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = async () => {
    if (!classUrl) return;
    setDownloading(true);
    try {
      const downloadUrl = getQRImageUrl(classUrl, 1200);
      const response = await fetch(downloadUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const safeName = (cls?.name || 'class').replace(/[^a-zA-Z0-9가-힣]/g, '_');
      a.download = `SIGNAL_학급QR_${safeName}_${cls?.join_code || ''}.png`;
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-white font-mono text-sm">불러오는 중...</p>
      </div>
    );
  }

  // 학급 코드가 없는 경우 (기존 37개 학급 같은 NULL 학급)
  if (!cls || !cls.join_code) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-black text-white mb-2">SIGNAL</h1>
          <p className="text-[12px] text-gray-500 font-mono">학급 QR 코드</p>
        </div>

        <div className="max-w-sm w-full rounded-2xl p-6 text-center"
          style={{
            background: 'rgba(255,215,0,0.06)',
            border: '1px solid rgba(255,215,0,0.3)',
          }}>
          <p className="text-4xl mb-3">⚠️</p>
          <p className="text-[14px] font-bold text-white mb-2">학급 코드가 없어요</p>
          <p className="text-[12px] text-gray-400 leading-relaxed mb-4">
            이 학급은 학급 코드 시스템 도입 전에 만들어진 학급이에요.
            <br />
            새 학급을 만들면 자동으로 학급 코드가 발급됩니다.
          </p>
          <button onClick={() => router.push(`/teacher/class/${classId}`)}
            className="w-full py-3 rounded-xl text-[13px] font-bold"
            style={{ background: S.cyan, color: S.navy }}>
            ← 학급으로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  const lvlInfo = cls.level ? LEVELS[cls.level] : null;
  const qrImageUrl = getQRImageUrl(classUrl, 600);

  return (
    <div className="min-h-screen flex flex-col items-center px-4 py-6 md:py-10 relative overflow-hidden">

      {/* 배경 (인쇄 시 숨김) */}
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
          onClick={() => router.push(`/teacher/class/${classId}`)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition hover:scale-[1.02]"
          style={{
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.1)',
            color: 'white',
          }}>
          ← 학급으로
        </button>

        <div className="px-3 py-1.5 rounded-full font-mono text-[10px] font-bold tracking-widest"
          style={{
            background: `${S.gold}15`,
            border: `1px solid ${S.gold}66`,
            color: S.gold,
          }}>
          🎫 CLASS QR
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

        {/* 학급 정보 (인쇄용으로도 보임) */}
        <div className="mt-5 inline-block px-4 py-2.5 rounded-xl"
          style={{
            background: `${S.gold}10`,
            border: `1.5px solid ${S.gold}50`,
          }}>
          <p className="text-[10px] font-mono tracking-widest mb-1"
            style={{ color: S.gold }}>★ CLASS</p>
          <p className="text-[15px] md:text-[18px] font-black text-white">{cls.name}</p>
          <div className="flex items-center justify-center gap-2 mt-1.5">
            {lvlInfo && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded"
                style={{
                  background: `${lvlInfo.color}20`,
                  color: lvlInfo.color,
                  border: `1px solid ${lvlInfo.color}50`,
                }}>
                {lvlInfo.emoji} {lvlInfo.label}
              </span>
            )}
            <p className="text-[11px] text-gray-300">
              {cls.school}{cls.schedule ? ` · ${cls.schedule}` : ''}
            </p>
          </div>
        </div>

        <p className="text-sm md:text-base text-white mt-4">
          학생들이 QR 코드를 스캔하면 자동으로 팀 선택 화면으로 이동합니다
        </p>
      </div>

      {/* QR 카드 */}
      <div className="bg-white rounded-3xl p-6 md:p-10 shadow-2xl relative z-10 mb-6"
        style={{ boxShadow: `0 20px 60px ${S.gold}33, 0 0 100px ${S.gold}22` }}>
        <img
          ref={qrImgRef}
          src={qrImageUrl}
          alt={`SIGNAL 학급 QR — ${cls.name}`}
          width="280"
          height="280"
          className="w-[280px] h-[280px] md:w-[400px] md:h-[400px] mx-auto block"
          crossOrigin="anonymous"
        />
      </div>

      {/* 학급 코드 (크게 표시) */}
      <div className="w-full max-w-md mb-4 relative z-10">
        <p className="text-[10px] font-mono text-white mb-2 text-center" style={{ opacity: 0.6 }}>
          또는 코드 직접 입력
        </p>
        <button onClick={handleCopyCode}
          className="w-full px-4 py-3 rounded-xl flex items-center justify-center gap-3 transition-all hover:scale-[1.02]"
          style={{
            background: copied ? `${S.green}15` : `${S.gold}10`,
            border: `2px solid ${copied ? S.green : S.gold}66`,
            boxShadow: `0 0 20px ${copied ? S.green : S.gold}33`,
          }}>
          <span className="text-2xl">🎫</span>
          <span className="text-[20px] md:text-[24px] font-black font-mono tracking-wider"
            style={{
              color: copied ? S.green : S.gold,
              textShadow: `0 0 8px ${copied ? S.green : S.gold}66`,
            }}>
            {cls.join_code}
          </span>
          <span className="text-[10px] font-bold px-2 py-1 rounded-md"
            style={{
              background: copied ? `${S.green}25` : 'rgba(0,0,0,0.3)',
              color: copied ? S.green : '#888',
            }}>
            {copied ? '✓ 복사됨' : '📋 복사'}
          </span>
        </button>
      </div>

      {/* URL 표시 */}
      <div className="w-full max-w-md mb-6 relative z-10 print:hidden">
        <p className="text-[10px] font-mono text-white mb-2 text-center" style={{ opacity: 0.6 }}>
          학급 페이지 URL
        </p>
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.1)',
          }}>
          <code className="flex-1 text-[11px] md:text-[12px] text-white font-mono truncate">
            {classUrl}
          </code>
          <button
            onClick={handleCopy}
            className="flex-shrink-0 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all hover:scale-105"
            style={{
              background: copied ? `${S.green}22` : `${S.cyan}22`,
              border: `1px solid ${copied ? S.green : S.cyan}66`,
              color: copied ? S.green : S.cyan,
            }}>
            {copied ? '✓' : '📋'}
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
          background: `${S.gold}06`,
          border: `1px solid ${S.gold}33`,
        }}>
        <p className="text-[11px] font-mono tracking-widest mb-2 font-bold" style={{ color: S.gold }}>
          💡 사용 안내
        </p>
        <ul className="text-[12px] text-white space-y-1.5 leading-relaxed" style={{ opacity: 0.9 }}>
          <li>• <strong>수업 시작 전</strong>: QR 코드를 프로젝터로 띄우기</li>
          <li>• <strong>오프라인 수업</strong>: 인쇄해서 칠판/벽에 부착</li>
          <li>• <strong>학생 안내</strong>: QR 스캔 또는 코드 <span className="font-mono" style={{ color: S.gold }}>{cls.join_code}</span> 입력</li>
          <li>• <strong>이후 흐름</strong>: 학생이 본인 팀 선택 → 이름 선택 → 입장</li>
        </ul>
      </div>

      {/* 푸터 (인쇄 시 보임) */}
      <div className="text-[10px] text-white text-center relative z-10 font-mono mb-4"
        style={{ opacity: 0.5 }}>
        © 2026 SIGNAL — ConnectAI · {cls.name}
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
