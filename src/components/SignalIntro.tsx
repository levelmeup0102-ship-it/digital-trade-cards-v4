'use client';
import { useEffect, useRef, useState } from 'react';

/**
 * SIGNAL 인트로 화면 (Cyberpunk v3 - Pink + Purple)
 * - 학급 진입 시 표시
 * - 첫 진입만 강제, 그 다음부터 자동 스킵 (sessionStorage 'dtc_intro_seen_v1')
 * - 클릭/탭 시 즉시 스킵 가능
 *
 * 디자인:
 * - 그리드 매트릭스 배경 (핑크 + 퍼플)
 * - 매트릭스 비 (양 사이드)
 * - 스캔라인 (위→아래) + CRT 줄무늬
 * - 동심원 펄스 (로고 등장 시)
 * - HUD 4모서리 마커 (REC / ONLINE / LIVE / SECURE)
 * - 부팅 시퀀스 텍스트 (3단계 타이핑)
 * - 로딩 바 (핑크→퍼플)
 * - 화면 플래시 (핑크)
 * - SIGNAL 로고 (핑크→퍼플 그라데이션 + 글리치)
 *
 * 타임라인 (총 5초):
 *   0.0초: HUD + 그리드
 *   0.7초: 부팅 타이핑 시작
 *   2.8초: CONNECTION ESTABLISHED + 동심원 펄스
 *   3.3초: 화면 플래시
 *   3.4초: SIGNAL 로고 등장
 *   4.5초: 글리치 시작 (반복)
 *   5.0초: 자동 완료
 */

interface SignalIntroProps {
  onComplete: () => void;
  durationMs?: number;
}

export default function SignalIntro({ onComplete, durationMs = 5000 }: SignalIntroProps) {
  const completedRef = useRef(false);
  const [skipReady, setSkipReady] = useState(false);

  // 자동 완료 타이머
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!completedRef.current) {
        completedRef.current = true;
        onComplete();
      }
    }, durationMs);

    // 스킵 가능 시점 (1초 후 - 너무 빨리 스킵 방지)
    const skipTimer = setTimeout(() => setSkipReady(true), 1000);

    return () => {
      clearTimeout(timer);
      clearTimeout(skipTimer);
    };
  }, [onComplete, durationMs]);

  // 클릭/탭 스킵
  const handleSkip = () => {
    if (!skipReady) return;
    if (!completedRef.current) {
      completedRef.current = true;
      onComplete();
    }
  };

  // 현재 시간 표시용
  const now = new Date();
  const dateStr = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')}`;
  const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')} KST`;

  return (
    <div
      className="signal-intro fixed inset-0 z-[100] overflow-hidden cursor-pointer"
      style={{ background: '#000' }}
      onClick={handleSkip}
    >
      {/* 1. 그리드 매트릭스 (핑크 + 퍼플) */}
      <div className="intro-grid-bg" />
      <div className="intro-grid-near" />

      {/* 2. 매트릭스 비 (좌측) */}
      <div className="intro-matrix-rain intro-rain-left">
        <div className="intro-matrix-col" style={{ left: '4px', animationDuration: '6s', animationDelay: '0s' }}>{'0\n1\n1\n0\n1\n0\n1\n1'}</div>
        <div className="intro-matrix-col" style={{ left: '18px', animationDuration: '8s', animationDelay: '0.5s' }}>{'A\nF\n3\n2\nB\n1\nC\n8'}</div>
        <div className="intro-matrix-col intro-rain-purple" style={{ left: '32px', animationDuration: '5s', animationDelay: '1s' }}>{'1\n0\n0\n1\n1\n0\n1\n0'}</div>
        <div className="intro-matrix-col" style={{ left: '46px', animationDuration: '7s', animationDelay: '1.5s' }}>{'F\n9\nA\n2\nC\n0\nB\n1'}</div>
      </div>
      {/* 매트릭스 비 (우측) */}
      <div className="intro-matrix-rain intro-rain-right">
        <div className="intro-matrix-col" style={{ left: '4px', animationDuration: '7s', animationDelay: '0.3s' }}>{'3\nF\nA\n1\n0\nB\n2\nC'}</div>
        <div className="intro-matrix-col intro-rain-purple" style={{ left: '18px', animationDuration: '6s', animationDelay: '1s' }}>{'1\n1\n0\n1\n0\n0\n1\n1'}</div>
        <div className="intro-matrix-col" style={{ left: '32px', animationDuration: '9s', animationDelay: '0.5s' }}>{'B\n2\nF\n0\nA\n1\n3\nC'}</div>
        <div className="intro-matrix-col" style={{ left: '46px', animationDuration: '5s', animationDelay: '2s' }}>{'0\n1\n1\n0\n1\n1\n0\n0'}</div>
      </div>

      {/* 3. 스캔라인 */}
      <div className="intro-scanline" />
      <div className="intro-scanline-2" />
      <div className="intro-crt-lines" />

      {/* 4. 동심원 펄스 (로고 등장 시) */}
      <div className="intro-pulse-ring intro-pulse-r1" />
      <div className="intro-pulse-ring intro-pulse-r2" />
      <div className="intro-pulse-ring intro-pulse-r3" />

      {/* 5. HUD 4모서리 */}
      <div className="intro-hud-tl">
        <span className="intro-hud-blink">● REC</span>
        <span>SYS://CONNECT</span>
        <span>v1.0.0</span>
      </div>
      <div className="intro-hud-tr">
        <span>{dateStr}</span>
        <span>{timeStr}</span>
        <span className="intro-hud-blink">▲ ONLINE</span>
      </div>
      <div className="intro-hud-bl">
        <span>FREQ: 528 Hz</span>
        <span>CH-01 ▸ ACTIVE</span>
        <span className="intro-hud-blink">▣ LIVE</span>
      </div>
      <div className="intro-hud-br">
        <span>SIGNAL.NET</span>
        <span>BANDWIDTH: 99.8%</span>
        <span>◆ SECURE</span>
      </div>

      {/* 6. 양 사이드 라이트 라인 */}
      <div className="intro-side-line-left" />
      <div className="intro-side-line-right" />

      {/* 7. 중앙 십자선 */}
      <div className="intro-crosshair-h" />
      <div className="intro-crosshair-v" />

      {/* 8. 부팅 시퀀스 */}
      <div className="intro-boot-log">
        <div className="intro-boot-line intro-boot-l1">▸ INITIALIZING SIGNAL.NET PROTOCOL...</div>
        <div className="intro-boot-line intro-boot-l2">▸ AUTHENTICATING TEAM CREDENTIALS...</div>
        <div className="intro-boot-line intro-boot-l3">▸ LOADING DIGITAL TRADE CARDS...</div>
        <div className="intro-boot-line intro-boot-complete">▸ CONNECTION ESTABLISHED ✓</div>
      </div>

      {/* 9. 로딩 바 */}
      <div className="intro-loading-label">[ LOADING ]</div>
      <div className="intro-loading-bar">
        <div className="intro-loading-fill" />
      </div>

      {/* 10. 화면 플래시 */}
      <div className="intro-flash" />

      {/* 11. SIGNAL 로고 */}
      <div className="intro-logo-wrap">
        {/* CONNECTAI 상단 라벨 */}
        <div className="intro-top-label">
          <span className="intro-top-line" />
          <span className="intro-top-text">CONNECTAI</span>
          <span className="intro-top-line" />
        </div>

        {/* SIGNAL 메인 + 글리치 */}
        <div className="intro-logo-stack">
          <span className="intro-logo-glitch-pink" aria-hidden>SIGNAL</span>
          <span className="intro-logo-glitch-purple" aria-hidden>SIGNAL</span>
          <h1 className="intro-logo-main">SIGNAL</h1>
        </div>

        {/* 하단 라벨 */}
        <p className="intro-bottom-label">DIGITAL TRADE CARDS</p>

        {/* 점-선-점 데코 */}
        <div className="intro-deco">
          <span className="intro-deco-dot-1" />
          <span className="intro-deco-line" />
          <span className="intro-deco-dot-2" />
          <span className="intro-deco-line" />
          <span className="intro-deco-dot-1" />
        </div>
      </div>

      {/* 12. 스킵 힌트 */}
      <div className="intro-skip-hint">▸ TAP TO ENTER</div>

      {/* 비네팅 + 노이즈 */}
      <div className="intro-vignette" />
      <div className="intro-noise" />

      <style jsx>{`
        /* ═══════════════════════════════════════════ */
        /* 1. 그리드 매트릭스 (핑크 + 퍼플) */
        .intro-grid-bg {
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(rgba(255, 111, 181, 0.08) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 111, 181, 0.08) 1px, transparent 1px);
          background-size: 50px 50px;
          mask-image: radial-gradient(ellipse at center, black 30%, transparent 75%);
          -webkit-mask-image: radial-gradient(ellipse at center, black 30%, transparent 75%);
          animation: intro-grid-pulse 4s ease-in-out infinite, intro-grid-fadein 0.5s ease-out;
          pointer-events: none;
        }
        .intro-grid-near {
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(rgba(139, 92, 246, 0.12) 1px, transparent 1px),
            linear-gradient(90deg, rgba(139, 92, 246, 0.12) 1px, transparent 1px);
          background-size: 100px 100px;
          mask-image: radial-gradient(ellipse at center, black 20%, transparent 60%);
          -webkit-mask-image: radial-gradient(ellipse at center, black 20%, transparent 60%);
          animation: intro-grid-fadein 0.5s ease-out;
          pointer-events: none;
        }
        @keyframes intro-grid-pulse {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 0.8; }
        }
        @keyframes intro-grid-fadein {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        /* ═══════════════════════════════════════════ */
        /* 2. 매트릭스 비 */
        .intro-matrix-rain {
          position: absolute;
          top: 0;
          bottom: 0;
          width: 60px;
          overflow: hidden;
          font-family: 'JetBrains Mono', 'Courier New', monospace;
          font-size: 10px;
          color: rgba(255, 111, 181, 0.5);
          pointer-events: none;
          animation: intro-grid-fadein 1s ease-out 0.3s backwards;
        }
        .intro-rain-left {
          left: 0;
          mask-image: linear-gradient(to right, black, transparent);
          -webkit-mask-image: linear-gradient(to right, black, transparent);
        }
        .intro-rain-right {
          right: 0;
          mask-image: linear-gradient(to left, black, transparent);
          -webkit-mask-image: linear-gradient(to left, black, transparent);
        }
        .intro-matrix-col {
          position: absolute;
          top: -200px;
          width: 12px;
          text-align: center;
          animation: intro-matrix-fall linear infinite;
          white-space: pre-line;
          line-height: 14px;
          text-shadow: 0 0 4px currentColor;
        }
        .intro-rain-purple { color: rgba(139, 92, 246, 0.5); }
        @keyframes intro-matrix-fall {
          0% { transform: translateY(-200px); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateY(100vh); opacity: 0; }
        }

        /* ═══════════════════════════════════════════ */
        /* 3. 스캔라인 */
        .intro-scanline {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 2px;
          background: linear-gradient(to bottom, transparent, rgba(255, 111, 181, 0.8), transparent);
          box-shadow: 0 0 20px rgba(255, 111, 181, 0.6);
          animation: intro-scanline-move 4s linear infinite;
          pointer-events: none;
        }
        .intro-scanline-2 {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 1px;
          background: rgba(139, 92, 246, 0.6);
          animation: intro-scanline-move 7s linear infinite;
          animation-delay: 2s;
          pointer-events: none;
        }
        @keyframes intro-scanline-move {
          0% { transform: translateY(-10px); }
          100% { transform: translateY(100vh); }
        }
        .intro-crt-lines {
          position: absolute;
          inset: 0;
          background: repeating-linear-gradient(
            to bottom,
            transparent 0,
            transparent 2px,
            rgba(255, 255, 255, 0.025) 2px,
            rgba(255, 255, 255, 0.025) 3px
          );
          pointer-events: none;
        }

        /* ═══════════════════════════════════════════ */
        /* 4. 동심원 펄스 */
        .intro-pulse-ring {
          position: absolute;
          top: 50%;
          left: 50%;
          width: 200px;
          height: 200px;
          border-radius: 50%;
          border: 1px solid rgba(255, 111, 181, 0.7);
          transform: translate(-50%, -50%) scale(0);
          opacity: 0;
          pointer-events: none;
        }
        .intro-pulse-r1 { animation: intro-pulse-expand 2s ease-out 2.8s 2; }
        .intro-pulse-r2 { animation: intro-pulse-expand 2s ease-out 3.0s 2; border-color: rgba(139, 92, 246, 0.6); }
        .intro-pulse-r3 { animation: intro-pulse-expand 2s ease-out 3.2s 2; border-color: rgba(255, 111, 181, 0.4); }
        @keyframes intro-pulse-expand {
          0% { transform: translate(-50%, -50%) scale(0); opacity: 1; }
          100% { transform: translate(-50%, -50%) scale(4); opacity: 0; }
        }

        /* ═══════════════════════════════════════════ */
        /* 5. HUD 4모서리 */
        .intro-hud-tl, .intro-hud-tr, .intro-hud-bl, .intro-hud-br {
          position: absolute;
          display: flex;
          flex-direction: column;
          gap: 8px;
          font-family: 'JetBrains Mono', 'Courier New', monospace;
          font-size: 10px;
          letter-spacing: 2px;
          pointer-events: none;
        }
        .intro-hud-tl {
          top: 32px; left: 32px;
          color: #FF6FB5; text-shadow: 0 0 8px rgba(255, 111, 181, 0.7);
          animation: intro-hud-fadein 0.6s ease-out 0.0s backwards;
        }
        .intro-hud-tl::before {
          content: ''; width: 24px; height: 24px;
          border-top: 1.5px solid #FF6FB5; border-left: 1.5px solid #FF6FB5;
          box-shadow: 0 0 12px rgba(255, 111, 181, 0.5); margin-bottom: 4px;
        }
        .intro-hud-tr {
          top: 32px; right: 32px;
          align-items: flex-end;
          color: #8B5CF6; text-shadow: 0 0 8px rgba(139, 92, 246, 0.6);
          animation: intro-hud-fadein 0.6s ease-out 0.15s backwards;
        }
        .intro-hud-tr::before {
          content: ''; width: 24px; height: 24px;
          border-top: 1.5px solid #8B5CF6; border-right: 1.5px solid #8B5CF6;
          box-shadow: 0 0 12px rgba(139, 92, 246, 0.4); margin-bottom: 4px;
        }
        .intro-hud-bl {
          bottom: 32px; left: 32px;
          color: #8B5CF6; text-shadow: 0 0 8px rgba(139, 92, 246, 0.6);
          animation: intro-hud-fadein 0.6s ease-out 0.3s backwards;
        }
        .intro-hud-bl::after {
          content: ''; width: 24px; height: 24px;
          border-bottom: 1.5px solid #8B5CF6; border-left: 1.5px solid #8B5CF6;
          box-shadow: 0 0 12px rgba(139, 92, 246, 0.4); margin-top: 4px;
        }
        .intro-hud-br {
          bottom: 32px; right: 32px;
          align-items: flex-end;
          color: #FF6FB5; text-shadow: 0 0 8px rgba(255, 111, 181, 0.7);
          animation: intro-hud-fadein 0.6s ease-out 0.45s backwards;
        }
        .intro-hud-br::after {
          content: ''; width: 24px; height: 24px;
          border-bottom: 1.5px solid #FF6FB5; border-right: 1.5px solid #FF6FB5;
          box-shadow: 0 0 12px rgba(255, 111, 181, 0.5); margin-top: 4px;
        }
        @keyframes intro-hud-fadein {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .intro-hud-blink { animation: intro-blink 1.5s ease-in-out infinite; }
        @keyframes intro-blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }

        /* ═══════════════════════════════════════════ */
        /* 6. 양 사이드 라인 */
        .intro-side-line-left, .intro-side-line-right {
          position: absolute;
          top: 50%;
          width: 1px;
          height: 0;
          transform: translateY(-50%);
          pointer-events: none;
        }
        .intro-side-line-left {
          left: 110px;
          background: linear-gradient(to bottom, transparent, #FF6FB5, transparent);
          box-shadow: 0 0 8px #FF6FB5;
          animation: intro-side-line-grow 0.8s ease-out 0.7s forwards;
        }
        .intro-side-line-right {
          right: 110px;
          background: linear-gradient(to bottom, transparent, #8B5CF6, transparent);
          box-shadow: 0 0 8px #8B5CF6;
          animation: intro-side-line-grow 0.8s ease-out 0.85s forwards;
        }
        @keyframes intro-side-line-grow {
          from { height: 0; opacity: 0; }
          to { height: 60%; opacity: 1; }
        }

        /* ═══════════════════════════════════════════ */
        /* 7. 중앙 십자선 */
        .intro-crosshair-h, .intro-crosshair-v {
          position: absolute;
          top: 50%; left: 50%;
          background: rgba(255, 111, 181, 0.4);
          transform: translate(-50%, -50%);
          animation: intro-crosshair-fade 1s ease-out 0.5s backwards;
          pointer-events: none;
        }
        .intro-crosshair-h { width: 60px; height: 1px; }
        .intro-crosshair-v { width: 1px; height: 60px; }
        @keyframes intro-crosshair-fade {
          0% { opacity: 0; }
          100% { opacity: 1; }
        }

        /* ═══════════════════════════════════════════ */
        /* 8. 부팅 시퀀스 */
        .intro-boot-log {
          position: absolute;
          top: 38%;
          left: 50%;
          transform: translate(-50%, -50%);
          font-family: 'JetBrains Mono', 'Courier New', monospace;
          font-size: 11px;
          letter-spacing: 1.5px;
          color: rgba(255, 111, 181, 0.85);
          text-align: center;
          text-shadow: 0 0 6px rgba(255, 111, 181, 0.5);
          line-height: 1.8;
          width: 600px;
          max-width: 90vw;
          pointer-events: none;
          animation: intro-bootlog-fadeout 0.4s ease-out 3.2s forwards;
        }
        .intro-boot-line {
          opacity: 0;
          white-space: nowrap;
          overflow: hidden;
          border-right: 2px solid transparent;
          display: inline-block;
        }
        .intro-boot-l1 { animation: intro-typing 0.6s steps(35) 0.7s forwards, intro-cursor-blink 0.6s steps(2) 0.7s 1; }
        .intro-boot-l2 {
          animation: intro-typing 0.6s steps(35) 1.4s forwards, intro-cursor-blink 0.6s steps(2) 1.4s 1;
          color: rgba(139, 92, 246, 0.85);
          text-shadow: 0 0 6px rgba(139, 92, 246, 0.5);
        }
        .intro-boot-l3 {
          animation: intro-typing 0.6s steps(40) 2.1s forwards, intro-cursor-blink 0.6s steps(2) 2.1s 1;
          color: rgba(255, 111, 181, 0.85);
          text-shadow: 0 0 6px rgba(255, 111, 181, 0.5);
        }
        .intro-boot-complete {
          animation: intro-complete-fade 0.4s ease-out 2.8s forwards;
          color: rgba(193, 232, 235, 1);
          font-weight: 700;
          text-shadow: 0 0 10px rgba(255, 111, 181, 0.7);
        }
        @keyframes intro-typing {
          from { opacity: 1; width: 0; }
          to { opacity: 1; width: 100%; }
        }
        @keyframes intro-cursor-blink {
          from { border-right-color: currentColor; }
          to { border-right-color: transparent; }
        }
        @keyframes intro-complete-fade {
          from { opacity: 0; transform: scale(0.9); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes intro-bootlog-fadeout {
          to { opacity: 0; transform: translate(-50%, -60%); }
        }

        /* ═══════════════════════════════════════════ */
        /* 9. 로딩 바 */
        .intro-loading-bar {
          position: absolute;
          bottom: 100px;
          left: 50%;
          transform: translateX(-50%);
          width: 280px;
          height: 2px;
          background: rgba(255, 111, 181, 0.15);
          border-radius: 2px;
          overflow: hidden;
          opacity: 0;
          animation: intro-hud-fadein 0.4s ease-out 0.9s forwards, intro-loadingbar-fadeout 0.4s ease-out 3.2s forwards;
          pointer-events: none;
        }
        .intro-loading-fill {
          height: 100%;
          width: 0;
          background: linear-gradient(90deg, #FF6FB5, #8B5CF6);
          box-shadow: 0 0 12px rgba(255, 111, 181, 0.8);
          animation: intro-loading-fill 2.5s ease-out 0.9s forwards;
        }
        @keyframes intro-loading-fill {
          0% { width: 0; }
          100% { width: 100%; }
        }
        .intro-loading-label {
          position: absolute;
          bottom: 80px;
          left: 50%;
          transform: translateX(-50%);
          font-family: 'JetBrains Mono', 'Courier New', monospace;
          font-size: 9px;
          letter-spacing: 3px;
          color: rgba(255, 111, 181, 0.5);
          opacity: 0;
          animation: intro-hud-fadein 0.4s ease-out 0.9s forwards, intro-loadingbar-fadeout 0.4s ease-out 3.2s forwards;
          pointer-events: none;
        }
        @keyframes intro-loadingbar-fadeout {
          to { opacity: 0; }
        }

        /* ═══════════════════════════════════════════ */
        /* 10. 화면 플래시 */
        .intro-flash {
          position: absolute;
          inset: 0;
          background: radial-gradient(circle, #FFB3DC, #FF6FB5);
          opacity: 0;
          pointer-events: none;
          animation: intro-flash-once 0.2s ease-out 3.3s;
        }
        @keyframes intro-flash-once {
          0% { opacity: 0; }
          50% { opacity: 0.5; }
          100% { opacity: 0; }
        }

        /* ═══════════════════════════════════════════ */
        /* 11. SIGNAL 로고 */
        .intro-logo-wrap {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          display: flex;
          flex-direction: column;
          align-items: center;
          opacity: 0;
          animation: intro-logo-appear 0.6s ease-out 3.4s forwards;
          pointer-events: none;
        }
        @keyframes intro-logo-appear {
          0% { opacity: 0; transform: translate(-50%, -50%) scale(0.95); filter: blur(10px); }
          100% { opacity: 1; transform: translate(-50%, -50%) scale(1); filter: blur(0); }
        }

        .intro-top-label {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 16px;
        }
        .intro-top-line {
          width: 32px;
          height: 1px;
          background: linear-gradient(to right, transparent, #FF6FB5);
          box-shadow: 0 0 6px #FF6FB5;
        }
        .intro-top-label .intro-top-line:last-child {
          background: linear-gradient(to left, transparent, #FF6FB5);
        }
        .intro-top-text {
          font-size: 11px;
          font-family: 'JetBrains Mono', 'Courier New', monospace;
          letter-spacing: 6px;
          color: #FF6FB5;
          text-shadow: 0 0 10px rgba(255, 111, 181, 0.8);
        }

        /* SIGNAL 로고 스택 */
        .intro-logo-stack {
          position: relative;
          padding: 12px 20px;
        }
        .intro-logo-main {
          font-size: clamp(72px, 14vw, 120px);
          font-weight: 900;
          letter-spacing: -3px;
          font-family: 'Inter', -apple-system, sans-serif;
          background: linear-gradient(135deg, #FF6FB5 0%, #FFB3DC 30%, #FFFFFF 50%, #C7A5FF 70%, #8B5CF6 100%);
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          text-shadow: 0 0 30px rgba(255, 111, 181, 0.5);
          position: relative;
          animation: intro-glitch-main 3s infinite 4.5s;
          line-height: 1;
          filter: drop-shadow(0 0 20px rgba(255, 111, 181, 0.3));
          margin: 0;
        }
        .intro-logo-glitch-pink, .intro-logo-glitch-purple {
          position: absolute;
          top: 12px;
          left: 20px;
          font-size: clamp(72px, 14vw, 120px);
          font-weight: 900;
          letter-spacing: -3px;
          font-family: 'Inter', -apple-system, sans-serif;
          mix-blend-mode: screen;
          pointer-events: none;
          line-height: 1;
          opacity: 0;
        }
        .intro-logo-glitch-pink { color: #ff1e8c; animation: intro-glitch-pink 3s infinite 4.5s; }
        .intro-logo-glitch-purple { color: #c084ff; animation: intro-glitch-purple 3s infinite 4.5s; }

        @keyframes intro-glitch-main {
          0%, 90%, 100% { transform: translate(0, 0); filter: blur(0) drop-shadow(0 0 20px rgba(255, 111, 181, 0.3)); }
          91% { transform: translate(-2px, 0); filter: blur(0.5px); }
          92% { transform: translate(2px, -1px); filter: blur(0); }
          93% { transform: translate(0, 1px); filter: blur(1px); }
          94% { transform: translate(-1px, 0); filter: blur(0); }
          95% { transform: translate(0, 0); filter: blur(0); }
        }
        @keyframes intro-glitch-pink {
          0%, 90%, 100% { transform: translate(0, 0); opacity: 0; }
          91% { transform: translate(-4px, 0); opacity: 0.7; }
          92% { transform: translate(4px, 0); opacity: 0.5; }
          93% { transform: translate(-3px, 1px); opacity: 0.6; }
          94% { transform: translate(2px, 0); opacity: 0.4; }
          95% { transform: translate(0, 0); opacity: 0; }
        }
        @keyframes intro-glitch-purple {
          0%, 90%, 100% { transform: translate(0, 0); opacity: 0; }
          91% { transform: translate(4px, 0); opacity: 0.7; }
          92% { transform: translate(-4px, 0); opacity: 0.5; }
          93% { transform: translate(3px, -1px); opacity: 0.6; }
          94% { transform: translate(-2px, 0); opacity: 0.4; }
          95% { transform: translate(0, 0); opacity: 0; }
        }

        .intro-bottom-label {
          font-size: 11px;
          font-family: 'JetBrains Mono', 'Courier New', monospace;
          letter-spacing: 4px;
          color: #C7A5FF;
          text-shadow: 0 0 8px rgba(139, 92, 246, 0.7);
          margin: 16px 0 0 0;
          opacity: 0;
          animation: intro-hud-fadein 0.6s ease-out 3.8s forwards;
        }
        .intro-deco {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-top: 20px;
          opacity: 0;
          animation: intro-hud-fadein 0.6s ease-out 4.0s forwards;
        }
        .intro-deco-dot-1 { width: 4px; height: 4px; border-radius: 50%; background: #FF6FB5; box-shadow: 0 0 8px #FF6FB5; }
        .intro-deco-dot-2 { width: 6px; height: 6px; border-radius: 50%; background: #8B5CF6; box-shadow: 0 0 10px #8B5CF6; }
        .intro-deco-line { width: 20px; height: 1px; background: linear-gradient(90deg, #FF6FB5, #8B5CF6); box-shadow: 0 0 4px #FF6FB5; }

        /* ═══════════════════════════════════════════ */
        /* 12. 스킵 힌트 */
        .intro-skip-hint {
          position: absolute;
          bottom: 16px;
          left: 50%;
          transform: translateX(-50%);
          font-family: 'JetBrains Mono', 'Courier New', monospace;
          font-size: 9px;
          letter-spacing: 2px;
          color: rgba(255, 111, 181, 0.4);
          opacity: 0;
          animation: intro-hud-fadein 0.6s ease-out 4.5s forwards;
          pointer-events: none;
        }

        /* ═══════════════════════════════════════════ */
        /* 비네팅 + 노이즈 */
        .intro-vignette {
          position: absolute;
          inset: 0;
          background: radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.85) 100%);
          pointer-events: none;
        }
        .intro-noise {
          position: absolute;
          inset: 0;
          background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' /></filter><rect width='100' height='100' filter='url(%23n)' opacity='0.15'/></svg>");
          opacity: 0.08;
          mix-blend-mode: overlay;
          pointer-events: none;
        }
      `}</style>
    </div>
  );
}
