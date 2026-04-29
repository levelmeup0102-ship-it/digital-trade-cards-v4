'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getTeamWithMembersByCode, joinAsStudent } from '@/lib/teacher';
import type { Team, TeamMember } from '@/lib/teacher';

const S = { green: '#E7FE55', aqua: '#C1E8EB', navy: '#111111', bg: '#0A0A0A' };

type Step = 'code' | 'confirm' | 'select' | 'welcome';

export default function StudentJoin() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('code');
  const [joinCode, setJoinCode] = useState('');
  const [codeError, setCodeError] = useState('');
  const [loading, setLoading] = useState(false);

  const [team, setTeam] = useState<Team | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);

  // Step 1: 코드 입력 → 팀 확인
  const handleCodeSubmit = async () => {
    if (joinCode.trim().length < 4) { setCodeError('올바른 코드를 입력해주세요.'); return; }
    setLoading(true); setCodeError('');
    try {
      const result = await getTeamWithMembersByCode(joinCode);
      if (!result) { setCodeError('팀 코드를 찾을 수 없어요. 선생님께 확인하세요.'); setLoading(false); return; }
      setTeam(result.team);
      setMembers(result.members);
      setStep('confirm');
    } catch (e) {
      setCodeError('오류가 발생했어요. 다시 시도해주세요.');
    } finally { setLoading(false); }
  };

  // Step 3: 이름 선택 → 입장
  const handleJoin = async () => {
    if (!selectedMember || !team) return;
    setLoading(true);
    await joinAsStudent(team.id, selectedMember.id);

    // 세션 토큰 저장 (기존 방식과 호환)
    localStorage.setItem('dtc_session_token_v2', JSON.stringify({
      teamId: team.id,
      memberId: selectedMember.id,
      memberName: selectedMember.name,
      isLeader: selectedMember.is_leader,
      joinCode: team.join_code,
    }));

    setStep('welcome');
    setLoading(false);
  };

  // Step 4: 환영 → 게임 시작
  const handleStart = () => {
    router.push('/');
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-8" style={{ background: S.bg }}>
      <div className="w-full max-w-sm">

        {/* 로고 */}
        <div className="text-center mb-8">
          <p className="text-[11px] tracking-[6px] text-gray-600 font-mono mb-1">ConnectAI</p>
          <h1 className="text-4xl font-black text-white">SIGNAL</h1>
          <p className="text-gray-600 text-[12px] mt-1 font-mono">디지털 무역 전략카드</p>
        </div>

        {/* ── Step 1: 코드 입력 ── */}
        {step === 'code' && (
          <div>
            <div className="rounded-2xl p-5 mb-4"
              style={{ background: `${S.green}08`, border: `1px solid ${S.green}20` }}>
              <p className="text-[10px] font-mono tracking-widest mb-1" style={{ color: S.green }}>STEP 1 / 4</p>
              <h2 className="text-lg font-black text-white mb-1">팀 코드 입력</h2>
              <p className="text-[12px] text-gray-500">선생님이 알려준 코드를 입력하세요</p>
            </div>

            <input
              value={joinCode}
              onChange={e => { setJoinCode(e.target.value.toUpperCase()); setCodeError(''); }}
              onKeyDown={e => e.key === 'Enter' && handleCodeSubmit()}
              placeholder="예) DT-2026-AB"
              maxLength={12}
              className="w-full px-4 py-4 rounded-2xl text-white text-lg font-black tracking-widest uppercase text-center mb-3"
              style={{ background: 'rgba(255,255,255,0.06)', border: joinCode ? `2px solid ${S.green}` : '2px solid rgba(255,255,255,0.1)', outline: 'none', fontFamily: 'monospace' }}
            />
            {codeError && <p className="text-red-400 text-[12px] text-center mb-3">⚠ {codeError}</p>}
            <button onClick={handleCodeSubmit} disabled={loading || joinCode.trim().length < 4}
              className="w-full py-4 font-black rounded-2xl text-[15px] transition disabled:opacity-30"
              style={{ background: S.green, color: S.navy }}>
              {loading ? '확인 중...' : '팀 확인하기 →'}
            </button>
          </div>
        )}

        {/* ── Step 2: 팀 확인 ── */}
        {step === 'confirm' && team && (
          <div>
            <div className="rounded-2xl p-5 mb-4"
              style={{ background: `${S.green}08`, border: `1px solid ${S.green}20` }}>
              <p className="text-[10px] font-mono tracking-widest mb-1" style={{ color: S.green }}>STEP 2 / 4</p>
              <h2 className="text-lg font-black text-white mb-1">이 팀이 맞으세요?</h2>
              <p className="text-[12px] text-gray-500">아래 정보를 확인해주세요</p>
            </div>

            <div className="rounded-2xl p-5 mb-4"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-[11px] text-gray-500 font-mono">팀 이름</p>
                  <p className="text-xl font-black text-white">{team.name}</p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] text-gray-500 font-mono">코드</p>
                  <p className="text-base font-black font-mono" style={{ color: S.green }}>{team.join_code}</p>
                </div>
              </div>
              <div className="h-px mb-3" style={{ background: 'rgba(255,255,255,0.06)' }} />
              <p className="text-[11px] text-gray-500">팀원 {members.length}명 등록됨</p>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {members.slice(0, 6).map(m => (
                  <span key={m.id} className="px-2 py-0.5 rounded-full text-[11px]"
                    style={{ background: m.is_leader ? `${S.green}20` : 'rgba(255,255,255,0.06)', color: m.is_leader ? S.green : '#aaa' }}>
                    {m.is_leader ? '👑 ' : ''}{m.name}
                  </span>
                ))}
                {members.length > 6 && <span className="text-[11px] text-gray-600">+{members.length - 6}명</span>}
              </div>
            </div>

            <button onClick={() => setStep('select')}
              className="w-full py-4 font-black rounded-2xl text-[15px] transition mb-3"
              style={{ background: S.green, color: S.navy }}>
              맞아요! 이름 선택하기 →
            </button>
            <button onClick={() => { setStep('code'); setTeam(null); setMembers([]); }}
              className="w-full py-3 rounded-2xl text-[13px] text-gray-500 transition"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
              ← 다시 입력하기
            </button>
          </div>
        )}

        {/* ── Step 3: 이름 선택 ── */}
        {step === 'select' && (
          <div>
            <div className="rounded-2xl p-5 mb-4"
              style={{ background: `${S.green}08`, border: `1px solid ${S.green}20` }}>
              <p className="text-[10px] font-mono tracking-widest mb-1" style={{ color: S.green }}>STEP 3 / 4</p>
              <h2 className="text-lg font-black text-white mb-1">본인 이름을 선택하세요</h2>
              <p className="text-[12px] text-gray-500">명단에서 내 이름을 찾아 선택하세요</p>
            </div>

            {members.length === 0 ? (
              <div className="rounded-2xl p-5 text-center mb-4"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <p className="text-gray-500 text-[13px]">아직 명단이 등록되지 않았어요</p>
                <p className="text-gray-600 text-[12px] mt-1">선생님께 명단 등록을 요청하세요</p>
              </div>
            ) : (
              <div className="space-y-2 mb-4">
                {members.map(m => (
                  <button key={m.id}
                    onClick={() => setSelectedMember(selectedMember?.id === m.id ? null : m)}
                    className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-left transition"
                    style={{
                      background: selectedMember?.id === m.id ? `${S.green}15` : 'rgba(255,255,255,0.04)',
                      border: selectedMember?.id === m.id ? `2px solid ${S.green}` : '1px solid rgba(255,255,255,0.08)',
                    }}>
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-black flex-shrink-0"
                      style={{ background: m.is_leader ? S.green : 'rgba(255,255,255,0.1)', color: m.is_leader ? S.navy : '#fff' }}>
                      {m.is_leader ? '👑' : m.name[0]}
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-white text-[14px]">{m.name}</p>
                      <p className="text-[11px]" style={{ color: m.is_leader ? S.green : '#666' }}>
                        {m.is_leader ? '팀장' : '팀원'}
                        {m.joined_at && <span className="ml-2 text-gray-600">이미 입장함</span>}
                      </p>
                    </div>
                    {selectedMember?.id === m.id && (
                      <div className="w-5 h-5 rounded-full flex items-center justify-center"
                        style={{ background: S.green }}>
                        <svg width="10" height="10" viewBox="0 0 10 10">
                          <path d="M1.5 5l2.5 2.5 4.5-5" stroke={S.navy} strokeWidth="1.5" fill="none" strokeLinecap="round" />
                        </svg>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}

            <button onClick={handleJoin} disabled={!selectedMember || loading}
              className="w-full py-4 font-black rounded-2xl text-[15px] transition disabled:opacity-30 mb-3"
              style={{ background: selectedMember ? S.green : 'rgba(255,255,255,0.08)', color: selectedMember ? S.navy : '#555' }}>
              {loading ? '입장 중...' : selectedMember ? `${selectedMember.name}으로 입장하기 →` : '이름을 선택하세요'}
            </button>
            <button onClick={() => setStep('confirm')}
              className="w-full py-3 rounded-2xl text-[13px] text-gray-500"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
              ← 뒤로
            </button>
          </div>
        )}

        {/* ── Step 4: 환영 ── */}
        {step === 'welcome' && selectedMember && team && (
          <div className="text-center">
            <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 text-4xl"
              style={{ background: `${S.green}20`, border: `2px solid ${S.green}40` }}>
              {selectedMember.is_leader ? '👑' : '👋'}
            </div>
            <h2 className="text-2xl font-black text-white mb-2">
              환영해요, {selectedMember.name}!
            </h2>
            <p className="text-[13px] text-gray-400 mb-1">
              {team.name} · {selectedMember.is_leader ? '팀장' : '팀원'}
            </p>
            {selectedMember.is_leader && (
              <div className="rounded-xl px-4 py-3 mt-4 mb-6 text-left"
                style={{ background: `${S.green}10`, border: `1px solid ${S.green}25` }}>
                <p className="text-[12px] font-bold mb-1" style={{ color: S.green }}>👑 팀장 안내</p>
                <p className="text-[11px] text-gray-400">결론 작성, AI 피드백 요청, 카드 완료 승인을 담당합니다.</p>
              </div>
            )}
            {!selectedMember.is_leader && (
              <div className="rounded-xl px-4 py-3 mt-4 mb-6 text-left"
                style={{ background: `${S.aqua}10`, border: `1px solid ${S.aqua}25` }}>
                <p className="text-[12px] font-bold mb-1" style={{ color: S.aqua }}>💬 팀원 안내</p>
                <p className="text-[11px] text-gray-400">각 질문에 자유롭게 답변하고 토론에 참여합니다.</p>
              </div>
            )}
            <button onClick={handleStart}
              className="w-full py-4 font-black rounded-2xl text-[15px] transition-all hover:scale-[1.02]"
              style={{ background: S.green, color: S.navy }}>
              카드게임 시작하기 →
            </button>
          </div>
        )}

        <p className="text-center text-gray-700 text-[10px] mt-8 font-mono">© 2026 SIGNAL — ConnectAI</p>
      </div>
    </div>
  );
}
