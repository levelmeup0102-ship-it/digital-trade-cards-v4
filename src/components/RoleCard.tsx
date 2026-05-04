'use client';
import { RoleInfo } from '@/data/roleData';

interface RoleCardProps {
  role: RoleInfo;
  memberName: string;
  isMobile?: boolean;
  isCompact?: boolean; // 작은 사이즈 (팀원 리스트용)
}

export default function RoleCard({ role, memberName, isMobile, isCompact }: RoleCardProps) {
  const cardW = isCompact ? (isMobile ? 140 : 180) : (isMobile ? 280 : 340);
  const imgSize = isCompact ? (isMobile ? 60 : 80) : (isMobile ? 140 : 180);

  return (
    <div className="cyber-role-card relative rounded-2xl overflow-hidden"
      style={{
        width: `${cardW}px`,
        background: `linear-gradient(135deg, rgba(10,10,10,0.95) 0%, rgba(20,20,40,0.9) 100%)`,
        border: `2px solid ${role.color}66`,
        boxShadow: `0 0 24px ${role.color}33, inset 0 0 20px ${role.color}11`,
      }}>

      {/* 헤더 - SIGNAL TRADE CO. */}
      <div className="px-3 py-1.5 flex items-center justify-between"
        style={{
          background: `${role.color}1A`,
          borderBottom: `1px solid ${role.color}44`,
        }}>
        <span className="text-[8px] md:text-[9px] font-mono font-bold tracking-wider"
          style={{ color: role.color, textShadow: `0 0 6px ${role.color}` }}>
          SIGNAL.TRADE.CO
        </span>
        <span className="text-[8px] font-mono"
          style={{ color: role.color }}>
          ID·{role.idCode}
        </span>
      </div>

      {/* 4모서리 ㄱ자 코너 */}
      <span className="absolute top-0 left-0 w-3 h-3 pointer-events-none"
        style={{ borderTop: `2px solid ${role.color}`, borderLeft: `2px solid ${role.color}` }} />
      <span className="absolute top-0 right-0 w-3 h-3 pointer-events-none"
        style={{ borderTop: `2px solid ${role.color}`, borderRight: `2px solid ${role.color}` }} />
      <span className="absolute bottom-0 left-0 w-3 h-3 pointer-events-none"
        style={{ borderBottom: `2px solid ${role.color}`, borderLeft: `2px solid ${role.color}` }} />
      <span className="absolute bottom-0 right-0 w-3 h-3 pointer-events-none"
        style={{ borderBottom: `2px solid ${role.color}`, borderRight: `2px solid ${role.color}` }} />

      {/* 이미지 */}
      <div className="flex justify-center pt-3 pb-2 relative">
        {/* 이미지 뒤 글로우 */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full pointer-events-none"
          style={{
            width: `${imgSize * 1.3}px`,
            height: `${imgSize * 1.3}px`,
            background: `radial-gradient(circle, ${role.color}44 0%, transparent 70%)`,
            filter: 'blur(15px)',
          }} />

        <div className="relative rounded-xl overflow-hidden"
          style={{
            width: `${imgSize}px`,
            height: `${imgSize}px`,
            border: `2px solid ${role.color}`,
            boxShadow: `0 0 20px ${role.color}88`,
          }}>
          <img src={role.image} alt={role.nameKr}
            className="w-full h-full object-cover"
            style={{ filter: 'saturate(1.1) contrast(1.05)' }} />

          {/* 스캔라인 오버레이 */}
          <div className="absolute inset-0 pointer-events-none cyber-scanline-overlay"
            style={{
              background: `linear-gradient(180deg, transparent 0%, ${role.color}15 50%, transparent 100%)`,
              backgroundSize: '100% 4px',
            }} />
        </div>
      </div>

      {/* 이름 + 직무 */}
      <div className="px-3 pb-2 text-center">
        <p className={`${isCompact ? 'text-[13px] md:text-sm' : 'text-base md:text-lg'} font-black text-white`}>
          {memberName}
        </p>
        <div className="flex items-center justify-center gap-1.5 mt-0.5">
          <span className="text-[9px]">{role.icon}</span>
          <p className="text-[10px] md:text-[11px] font-bold font-mono tracking-wide"
            style={{ color: role.color, textShadow: `0 0 6px ${role.color}88` }}>
            {role.nameKr}{role.isLeader ? ' · 팀장' : ''}
          </p>
        </div>
      </div>

      {/* 사이버 게이지 (스킬 3개) - 일반 사이즈에만 표시 */}
      {!isCompact && (
        <div className="px-4 pb-3 space-y-1.5"
          style={{ borderTop: `1px solid ${role.color}22`, paddingTop: '10px' }}>
          {role.skills.map((skill, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-[10px] font-mono w-20 truncate"
                style={{ color: role.color }}>
                {skill.name}
              </span>
              <div className="flex-1 flex gap-0.5">
                {Array.from({ length: 5 }).map((_, j) => (
                  <div key={j} className="flex-1 h-1.5 rounded-sm transition-all"
                    style={{
                      background: j < skill.level ? role.color : `${role.color}22`,
                      boxShadow: j < skill.level ? `0 0 4px ${role.color}` : 'none',
                    }} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 명대사 - 일반 사이즈에만 */}
      {!isCompact && (
        <div className="px-4 pb-3">
          <div className="rounded-lg px-3 py-2"
            style={{
              background: `${role.color}0D`,
              border: `1px solid ${role.color}33`,
            }}>
            <p className="text-[11px] md:text-[12px] italic text-center leading-relaxed"
              style={{ color: '#E0E0E0' }}>
              "{role.catchphrase}"
            </p>
          </div>
        </div>
      )}

      {/* 하단 PASS */}
      <div className="px-3 py-1.5 flex items-center justify-between"
        style={{
          background: `${role.color}1A`,
          borderTop: `1px solid ${role.color}44`,
        }}>
        <span className="text-[8px] md:text-[9px] font-mono"
          style={{ color: '#888' }}>
          AUTH·OK
        </span>
        <span className="text-[8px] md:text-[9px] font-mono font-bold"
          style={{ color: role.color, textShadow: `0 0 6px ${role.color}` }}>
          ✓ PASS
        </span>
      </div>

      <style jsx>{`
        .cyber-role-card {
          animation: cyberCardEnter 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        @keyframes cyberCardEnter {
          0% {
            opacity: 0;
            transform: scale(0.85) translateY(20px);
          }
          100% {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }

        .cyber-scanline-overlay {
          animation: scanlineFlow 3s linear infinite;
        }
        @keyframes scanlineFlow {
          0% { background-position: 0 0; }
          100% { background-position: 0 100%; }
        }

        .cyber-role-card:hover {
          transform: translateY(-2px);
          transition: transform 0.2s;
        }
      `}</style>
    </div>
  );
}
