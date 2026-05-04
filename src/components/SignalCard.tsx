'use client';
import { useState, useEffect } from 'react';
import type { TopicCard, SubCard } from '@/types';
import { CARD_COLORS } from '@/data/cardData';
import { getCardTemplate } from '@/data/cardTemplates';
import { ROLES, getRole, type RoleCode } from '@/data/roleData';
import { getRolePrompt, getInsightMinChars } from '@/data/rolePrompts';
import {
  saveMemberInsight,
  type MemberInsight,
  type SubCardLock,
  isSubCardLocked,
  isSubCardCompleted,
  areAllMembersComplete,
} from '@/lib/collaborative';

const S = { green: '#E7FE55', aqua: '#C1E8EB', navy: '#111111', cyan: '#06B6D4', purple: '#8B5CF6' };
const TABS = ['주제', 'Q1', 'Q2', 'Q3', '결론'] as const;
type TabType = typeof TABS[number];

interface SignalCardProps {
  topic: TopicCard;
  currentTab: TabType;
  onTabChange: (tab: TabType) => void;
  checkStates: Record<string, Record<number, boolean>>;
  onCheck: (cardId: string, idx: number) => void;
  responses: Record<string, any>;
  onSaveResponse: (cardId: string, text: string) => void;
  interimConclusions: Record<string, string>;
  onSaveInterim: (cardId: string, text: string) => void;
  leaderConclusion: LeaderConclusionState;
  onLeaderConclusionChange: (key: keyof LeaderConclusionState, value: any) => void;
  completedCards: Set<string>;
  onComplete: () => void;
  isCardCompleted: boolean;
  isLeader: boolean;
  displayItem: string;
  level: string;
  minChars: number;

  // ⭐ 협업 시스템 props
  teamId: string;
  myMemberId: string;
  myRoleCode: RoleCode | null;
  teamMembers: Array<{ id: string; name: string; is_leader: boolean; role_code: string | null }>;
  memberInsights: MemberInsight[];
  subCardLocks: SubCardLock[];
  onLeaderCompleteSubCard: (subCardId: string) => Promise<void>;
}

export interface LeaderConclusionState {
  fields: string[];
  oneSentence: string;
  isEditing: boolean;
  judgments: boolean[];
}

export default function SignalCard({
  topic, currentTab, onTabChange,
  checkStates, onCheck,
  responses, onSaveResponse,
  interimConclusions, onSaveInterim,
  leaderConclusion, onLeaderConclusionChange,
  completedCards, onComplete, isCardCompleted,
  isLeader, displayItem, level, minChars,
  teamId, myMemberId, myRoleCode, teamMembers,
  memberInsights, subCardLocks, onLeaderCompleteSubCard,
}: SignalCardProps) {
  const color = CARD_COLORS[topic.id].bg;
  const accentColor =
    topic.id === '03' ? '#5B8DEE' :
    topic.id === '16' ? '#C44569' :
    color;

  const template = getCardTemplate(topic.id);
  const insightMinChars = getInsightMinChars(level);

  const getSubForTab = (tab: TabType): SubCard | null => {
    if (tab === '주제' || tab === '결론') return null;
    const qIdx = TABS.indexOf(tab) - 1;
    return topic.subs[qIdx] || null;
  };

  const sub = getSubForTab(currentTab);
  const subId = sub?.id || '';
  const currentChecks = checkStates[subId] || {};
  const currentResponse = responses[subId]?.texts?.['0'] || '';
  const currentInterim = interimConclusions[subId] || '';

  const hasResponse = (cardId: string) => {
    const r = responses[cardId];
    return r && Object.values(r.texts || {}).some((t: any) => t?.trim());
  };
  const allQsDone = topic.subs.every(s => hasResponse(s.id));

  const oneSentenceSynthesis = template.buildSentence(
    leaderConclusion.fields[0] || '',
    leaderConclusion.fields[1] || '',
    leaderConclusion.fields[2] || '',
    leaderConclusion.fields[3] || '',
  );

  // ⭐ 잠금 상태 계산
  const subLockStatus = topic.subs.map(s => ({
    id: s.id,
    isLocked: isSubCardLocked(s.id, subCardLocks),
    isCompleted: isSubCardCompleted(s.id, subCardLocks),
  }));

  const isCurrentSubLocked = sub ? isSubCardLocked(sub.id, subCardLocks) : false;
  const isCurrentSubCompleted = sub ? isSubCardCompleted(sub.id, subCardLocks) : false;

  // 결론 탭은 Q3가 완료되어야 열림
  const q3Id = `${topic.id}-3`;
  const isConclusionLocked = isSubCardLocked(q3Id, subCardLocks) || !isSubCardCompleted(q3Id, subCardLocks);

  // 팀원 ID 목록 (CEO 제외)
  const nonLeaderMemberIds = teamMembers
    .filter(m => !m.is_leader)
    .map(m => m.id);

  // 현재 sub의 팀원 인사이트 + 완료 여부
  const currentSubInsights = memberInsights.filter(i => i.sub_card_id === subId);
  const allMembersDone = sub ? areAllMembersComplete(sub.id, memberInsights, nonLeaderMemberIds) : false;

  // 팀장 Q 완료 가능 조건: 팀원 전원 완료 + 팀장 답변 입력 + 중간 결론 입력
  const canLeaderCompleteSub =
    isLeader &&
    !isCurrentSubCompleted &&
    allMembersDone &&
    currentResponse.trim().length >= minChars &&
    currentInterim.trim().length > 0;

  return (
    <div className="w-full max-w-[340px] mx-auto">

      {/* 카드 비주얼 */}
      <div className="mb-4 relative">
        <div className="rounded-2xl overflow-hidden bg-white border border-gray-200 relative"
          style={{ boxShadow: '0 8px 24px rgba(0,0,0,0.15), 0 2px 8px rgba(0,0,0,0.08)' }}>
          {isCardCompleted && (
            <div className="absolute top-3 right-3 z-10 flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full"
              style={{ background: S.green, color: S.navy }}>
              ✓ 완료
            </div>
          )}
          <div className="p-5 flex flex-col">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-black text-base flex-shrink-0"
                style={{ background: color, boxShadow: `0 4px 12px ${color}66` }}>
                {topic.id}
              </div>
              <div className="flex-1 grid grid-cols-4 gap-1.5">
                {Array.from({ length: 16 }).map((_, i) => (
                  <div key={i} className="aspect-square rounded-md transition-colors duration-300"
                    style={{
                      background: currentTab === '주제' ? '#D1D5DB' : color,
                      opacity: currentTab === '주제' ? 1 : 0.85,
                    }} />
                ))}
              </div>
            </div>

            <div className="mt-2">
              <span className="inline-block px-3 py-1 rounded-full text-[11px] font-semibold mb-2"
                style={{ border: `1.5px solid ${color}`, color }}>
                {topic.id}. 주제카드
              </span>
              <h3 className="text-lg font-black text-gray-900 leading-tight">{topic.title}</h3>
              <p className="text-[13px] font-extrabold text-gray-400 leading-tight mt-0.5">{topic.titleEn}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ⭐ 탭 바 — 잠금 자물쇠 표시 */}
      <div className="flex rounded-xl overflow-hidden mb-2"
        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
        {TABS.map((tab, i) => {
          const isActive = currentTab === tab;
          let isLocked = false;
          let isDone = false;

          if (tab === '주제') {
            // 주제 탭은 항상 열려있음
          } else if (tab === '결론') {
            isLocked = isConclusionLocked;
            isDone = isCardCompleted;
          } else {
            // Q1/Q2/Q3
            const subStatus = subLockStatus[i - 1];
            isLocked = subStatus?.isLocked || false;
            isDone = subStatus?.isCompleted || false;
          }

          return (
            <button
              key={tab}
              onClick={() => !isLocked && onTabChange(tab)}
              disabled={isLocked}
              className={`flex-1 py-2 text-[11px] font-bold transition-all flex items-center justify-center gap-1 ${isLocked ? 'cursor-not-allowed' : ''} ${!isLocked && !isActive ? 'tab-unlocked' : ''}`}
              style={{
                background: isActive ? color : 'transparent',
                color: isActive
                  ? (color === S.green ? S.navy : '#fff')
                  : isLocked
                    ? '#555'
                    : isDone
                      ? color
                      : '#999',
                opacity: isLocked ? 0.5 : 1,
              }}
              title={isLocked ? '이전 단계를 완료하면 열려요' : ''}
            >
              {isLocked && (
                <svg width="11" height="13" viewBox="0 0 12 14" fill="none" style={{ flexShrink: 0 }}>
                  <rect x="2" y="6" width="8" height="7" rx="1" stroke="currentColor" strokeWidth="1.3" fill="none"/>
                  <path d="M3.5 6V4a2.5 2.5 0 015 0v2" stroke="currentColor" strokeWidth="1.3" fill="none" strokeLinecap="round"/>
                </svg>
              )}
              {!isLocked && isDone && !isActive && '✓'}
              <span>{tab}</span>
            </button>
          );
        })}
      </div>

      {/* 탭 콘텐츠 */}
      <div className="rounded-2xl overflow-hidden"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>

        {/* ─── 주제 탭 ─── */}
        {currentTab === '주제' && (
          <div className="p-4">
            <p className="text-[10px] font-bold mb-2 font-mono tracking-widest" style={{ color: accentColor }}>개념 및 중요성</p>
            <p className="text-[13px] text-gray-300 leading-relaxed mb-4">{topic.overview}</p>
            <div className="rounded-xl p-3 mb-4" style={{ background: `${color}12`, border: `1px solid ${color}30` }}>
              <p className="text-[10px] font-bold mb-1 font-mono tracking-widest" style={{ color: accentColor }}>핵심 통찰 질문</p>
              <p className="text-[13px] text-white font-bold leading-relaxed">{topic.insightQ}</p>
            </div>
            <button onClick={() => !subLockStatus[0].isLocked && onTabChange('Q1')}
              disabled={subLockStatus[0].isLocked}
              className="w-full py-3 font-black rounded-xl text-[13px] transition-all hover:scale-[1.02] disabled:opacity-50"
              style={{ background: S.green, color: S.navy }}>
              {subLockStatus[0].isLocked ? '🔒 Q1 잠금 중' : 'Q1 시작하기 →'}
            </button>
          </div>
        )}

        {/* ─── Q1/Q2/Q3 탭 — 잠긴 상태 ─── */}
        {sub && (currentTab === 'Q1' || currentTab === 'Q2' || currentTab === 'Q3') && isCurrentSubLocked && (
          <div className="p-8 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <svg width="28" height="32" viewBox="0 0 12 14" fill="none">
                <rect x="2" y="6" width="8" height="7" rx="1" stroke="#888" strokeWidth="1.2" fill="none"/>
                <path d="M3.5 6V4a2.5 2.5 0 015 0v2" stroke="#888" strokeWidth="1.2" fill="none" strokeLinecap="round"/>
              </svg>
            </div>
            <h3 className="text-[15px] font-bold text-gray-300 mb-2">아직 잠겨있어요</h3>
            <p className="text-[12px] text-gray-500 leading-relaxed">
              {currentTab === 'Q1' ? '주제 탭을 먼저 확인해주세요' : `이전 ${currentTab === 'Q2' ? 'Q1' : 'Q2'}을 팀장이 완료하면 열려요`}
            </p>
          </div>
        )}

        {/* ─── Q1/Q2/Q3 탭 — 열린 상태 (팀장 vs 팀원 분기) ─── */}
        {sub && (currentTab === 'Q1' || currentTab === 'Q2' || currentTab === 'Q3') && !isCurrentSubLocked && (
          <div className="p-4">
            {/* 공통: Q 라벨 + 질문 */}
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full"
                style={{ background: `${color}22`, color: accentColor }}>{sub.id}</span>
              <span className="text-[10px] text-gray-500">
                {currentTab === 'Q1' ? 'Fact 수집' : currentTab === 'Q2' ? 'Insight 해석' : 'Decision 결정'}
              </span>
              {isCurrentSubCompleted && (
                <span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full"
                  style={{ background: `${S.green}22`, color: S.green }}>✓ 완료</span>
              )}
            </div>

            <div className="rounded-xl p-3 mb-4" style={{ background: `${color}10`, border: `1px solid ${color}25` }}>
              <p className="text-[13px] text-white font-bold leading-relaxed">{sub.question}</p>
            </div>

            {/* ⭐⭐⭐ 팀장 화면 ⭐⭐⭐ */}
            {isLeader ? (
              <LeaderQView
                sub={sub}
                color={color}
                accentColor={accentColor}
                currentChecks={currentChecks}
                onCheck={onCheck}
                currentResponse={currentResponse}
                onSaveResponse={onSaveResponse}
                currentInterim={currentInterim}
                onSaveInterim={onSaveInterim}
                displayItem={displayItem}
                minChars={minChars}
                memberInsights={currentSubInsights}
                teamMembers={teamMembers}
                allMembersDone={allMembersDone}
                isCurrentSubCompleted={isCurrentSubCompleted}
                canComplete={canLeaderCompleteSub}
                onCompleteSubCard={() => onLeaderCompleteSubCard(sub.id)}
              />
            ) : (
              /* ⭐⭐⭐ 팀원 화면 ⭐⭐⭐ */
              <MemberQView
                sub={sub}
                color={color}
                accentColor={accentColor}
                myMemberId={myMemberId}
                myRoleCode={myRoleCode}
                teamId={teamId}
                memberInsights={memberInsights}
                insightMinChars={insightMinChars}
                isCurrentSubCompleted={isCurrentSubCompleted}
              />
            )}
          </div>
        )}

        {/* ─── 결론 탭 ─── */}
        {currentTab === '결론' && isConclusionLocked && (
          <div className="p-8 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <svg width="28" height="32" viewBox="0 0 12 14" fill="none">
                <rect x="2" y="6" width="8" height="7" rx="1" stroke="#888" strokeWidth="1.2" fill="none"/>
                <path d="M3.5 6V4a2.5 2.5 0 015 0v2" stroke="#888" strokeWidth="1.2" fill="none" strokeLinecap="round"/>
              </svg>
            </div>
            <h3 className="text-[15px] font-bold text-gray-300 mb-2">결론은 Q3 완료 후</h3>
            <p className="text-[12px] text-gray-500">팀장이 Q3까지 마쳐야 결론을 작성할 수 있어요</p>
          </div>
        )}

        {currentTab === '결론' && !isConclusionLocked && (
          <div className="p-4">
            <div className="mb-4">
              <p className="text-[10px] font-bold mb-2 font-mono tracking-widest text-gray-500">팀 답변 요약</p>
              <div className="space-y-2">
                {topic.subs.map((s, i) => {
                  const interim = interimConclusions[s.id] || '';
                  const r = responses[s.id]?.texts?.['0'] || '';
                  const filled = hasResponse(s.id);
                  return (
                    <div key={s.id} className="rounded-lg p-2.5 transition-all"
                      style={{
                        background: filled ? `${color}12` : `${color}06`,
                        border: `1.5px solid ${filled ? color + '80' : color + '40'}`,
                        boxShadow: filled ? `0 0 12px ${color}25` : 'none',
                      }}>
                      <p className="text-[10px] font-bold font-mono mb-1" style={{ color: accentColor }}>Q{i + 1}</p>
                      {interim
                        ? <p className="text-[12px] text-gray-300">→ {interim}</p>
                        : r
                          ? <p className="text-[11px] text-gray-500 line-clamp-2">{r}</p>
                          : <p className="text-[11px] text-gray-700">미작성</p>}
                    </div>
                  );
                })}
              </div>
            </div>

            {isLeader ? (
              <>
                <div className="mb-4">
                  <p className="text-[10px] font-bold mb-2 font-mono tracking-widest text-gray-500">한 문장 전략 재료</p>
                  <div className="grid grid-cols-2 gap-2">
                    {template.fieldLabels.map((label, i) => (
                      <div key={i} className="rounded-lg p-2.5 transition-all"
                        style={{
                          background: leaderConclusion.fields[i] ? `${color}12` : `${color}06`,
                          border: `1.5px solid ${leaderConclusion.fields[i] ? color + '88' : color + '40'}`,
                          boxShadow: leaderConclusion.fields[i] ? `0 0 12px ${color}30` : 'none',
                        }}>
                        <p className="text-[9px] font-mono mb-1" style={{ color: `${color}DD` }}>{label}</p>
                        <input
                          value={leaderConclusion.fields[i] || ''}
                          onChange={e => {
                            const f = [...leaderConclusion.fields];
                            f[i] = e.target.value;
                            onLeaderConclusionChange('fields', f);
                          }}
                          placeholder={template.placeholders[i]}
                          className="w-full bg-transparent text-[12px] text-white outline-none"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mb-4">
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-[10px] font-bold font-mono tracking-widest text-gray-500">한 문장 전략</p>
                    {!leaderConclusion.isEditing && (
                      <button onClick={() => {
                        onLeaderConclusionChange('oneSentence', oneSentenceSynthesis);
                        onLeaderConclusionChange('isEditing', true);
                      }}
                        className="text-[10px] font-bold px-2 py-0.5 rounded"
                        style={{ background: `${S.green}20`, color: S.green }}>
                        팀과 함께 다듬기
                      </button>
                    )}
                  </div>
                  {!leaderConclusion.isEditing ? (
                    <div className="rounded-xl p-3"
                      style={{
                        background: `${color}15`,
                        border: `1.5px solid ${color}80`,
                        boxShadow: `0 0 16px ${color}25`,
                      }}>
                      <p className="text-[13px] text-gray-200 leading-relaxed font-medium">{oneSentenceSynthesis}</p>
                    </div>
                  ) : (
                    <textarea
                      value={leaderConclusion.oneSentence}
                      onChange={e => onLeaderConclusionChange('oneSentence', e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl text-[13px] text-white leading-relaxed resize-none"
                      rows={3}
                      style={{ background: 'rgba(255,255,255,0.06)', border: `1px solid ${color}`, outline: 'none' }}
                    />
                  )}
                </div>

                <div className="mb-4">
                  <p className="text-[10px] font-bold mb-2 font-mono tracking-widest text-gray-500">팀장 판단 기준</p>
                  {['정의가 구체적인가?', '논리적으로 연결되는가?', '현실성이 있는가?', '실행 가능한가?'].map((c, i) => (
                    <button key={i} onClick={() => {
                      const j = [...leaderConclusion.judgments];
                      j[i] = !j[i];
                      onLeaderConclusionChange('judgments', j);
                    }} className="w-full flex items-center gap-2.5 mb-2 text-left">
                      <div className="w-4 h-4 rounded flex-shrink-0 flex items-center justify-center"
                        style={{ background: leaderConclusion.judgments[i] ? S.green : 'rgba(255,255,255,0.06)', border: `1px solid ${leaderConclusion.judgments[i] ? S.green : 'rgba(255,255,255,0.15)'}` }}>
                        {leaderConclusion.judgments[i] && (
                          <svg width="8" height="8" viewBox="0 0 10 10">
                            <path d="M1.5 5l2.5 2.5 4.5-5" stroke={S.navy} strokeWidth="1.5" fill="none" strokeLinecap="round" />
                          </svg>
                        )}
                      </div>
                      <span className="text-[12px] text-gray-400">{c}</span>
                    </button>
                  ))}
                </div>

                {isCardCompleted ? (
                  <div className="w-full py-3 rounded-xl text-center font-bold text-[13px]"
                    style={{ background: `${S.green}20`, color: S.green }}>
                    ✓ 완료된 카드
                  </div>
                ) : (
                  <button onClick={onComplete} disabled={!leaderConclusion.oneSentence?.trim()}
                    className="w-full py-3 font-black rounded-xl text-[14px] transition-all disabled:opacity-30"
                    style={{ background: leaderConclusion.oneSentence?.trim() ? S.green : 'rgba(255,255,255,0.06)', color: leaderConclusion.oneSentence?.trim() ? S.navy : '#555' }}>
                    {leaderConclusion.oneSentence?.trim() ? '✅ 이 카드 완료하기' : '한 문장 전략을 작성하세요'}
                  </button>
                )}
              </>
            ) : (
              <div className="rounded-xl p-4 text-center"
                style={{ background: `${S.aqua}10`, border: `1px solid ${S.aqua}20` }}>
                <p className="text-[12px]" style={{ color: S.aqua }}>💬 팀원 모드</p>
                <p className="text-[11px] text-gray-600 mt-1">결론 작성은 팀장이 합니다</p>
              </div>
            )}
          </div>
        )}
      </div>

      <style jsx>{`
        /* 잠금 풀린 직후 펄스 효과 */
        .tab-unlocked {
          animation: tabUnlockPulse 1.5s ease-out;
        }
        @keyframes tabUnlockPulse {
          0% { background: rgba(6, 182, 212, 0.3); }
          100% { background: transparent; }
        }
      `}</style>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// 팀장 Q 화면 컴포넌트
// ═══════════════════════════════════════════════════════
interface LeaderQViewProps {
  sub: SubCard;
  color: string;
  accentColor: string;
  currentChecks: Record<number, boolean>;
  onCheck: (cardId: string, idx: number) => void;
  currentResponse: string;
  onSaveResponse: (cardId: string, text: string) => void;
  currentInterim: string;
  onSaveInterim: (cardId: string, text: string) => void;
  displayItem: string;
  minChars: number;
  memberInsights: MemberInsight[];
  teamMembers: Array<{ id: string; name: string; is_leader: boolean; role_code: string | null }>;
  allMembersDone: boolean;
  isCurrentSubCompleted: boolean;
  canComplete: boolean;
  onCompleteSubCard: () => void;
}

function LeaderQView({
  sub, color, accentColor,
  currentChecks, onCheck,
  currentResponse, onSaveResponse,
  currentInterim, onSaveInterim,
  displayItem, minChars,
  memberInsights, teamMembers,
  allMembersDone, isCurrentSubCompleted,
  canComplete, onCompleteSubCard,
}: LeaderQViewProps) {
  const [showSidebar, setShowSidebar] = useState(false);

  // 팀원 (CEO 제외)
  const nonLeaders = teamMembers.filter(m => !m.is_leader);
  const completedCount = memberInsights.filter(i => i.is_completed).length;

  return (
    <>
      {/* 체크리스트 */}
      <div className="mb-4">
        <p className="text-[10px] font-bold mb-2 font-mono tracking-widest text-gray-500">체크리스트</p>
        <div className="space-y-2">
          {sub.checklist.map((item, i) => (
            <button key={i} onClick={() => onCheck(sub.id, i)}
              className="w-full flex items-start gap-2.5 text-left"
              style={{ opacity: currentChecks[i] ? 0.55 : 1 }}>
              <div className="w-4 h-4 rounded flex-shrink-0 mt-0.5 flex items-center justify-center transition-all"
                style={{ background: currentChecks[i] ? color : 'rgba(255,255,255,0.06)', border: `1px solid ${currentChecks[i] ? color : 'rgba(255,255,255,0.15)'}` }}>
                {currentChecks[i] && (
                  <svg width="8" height="8" viewBox="0 0 10 10">
                    <path d="M1.5 5l2.5 2.5 4.5-5" stroke={color === S.green ? S.navy : '#fff'} strokeWidth="1.5" fill="none" strokeLinecap="round" />
                  </svg>
                )}
              </div>
              <span className="text-[12px] text-gray-300 leading-relaxed"
                style={{ textDecoration: currentChecks[i] ? 'line-through' : 'none' }}>{item}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 팀 답변 */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[10px] font-bold font-mono tracking-widest text-gray-500">팀 답변</p>
          <button
            onClick={() => setShowSidebar(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-all hover:scale-[1.03]"
            style={{
              background: `${S.cyan}15`,
              border: `1px solid ${S.cyan}40`,
            }}>
            <div className="w-1.5 h-1.5 rounded-full"
              style={{ background: completedCount === nonLeaders.length && nonLeaders.length > 0 ? '#4ADE80' : S.cyan }} />
            <span className="text-[10px] font-mono font-bold" style={{ color: S.cyan }}>
              팀원 인사이트 {completedCount}/{nonLeaders.length}
            </span>
          </button>
        </div>
        <textarea
          value={currentResponse}
          onChange={e => onSaveResponse(sub.id, e.target.value)}
          placeholder={`팀원 인사이트를 종합해서 ${displayItem} 기준 팀 답변을 작성하세요...`}
          disabled={isCurrentSubCompleted}
          className="w-full px-3 py-2.5 rounded-xl text-[13px] text-white leading-relaxed resize-none transition disabled:opacity-60"
          rows={4}
          style={{
            background: currentResponse ? `${color}10` : `${color}06`,
            border: `1.5px solid ${currentResponse ? color : color + '40'}`,
            outline: 'none',
            boxShadow: currentResponse ? `0 0 12px ${color}30` : 'none',
          }}
        />
        <div className="flex justify-between mt-1">
          <span className="text-[10px] text-gray-600">{currentResponse.length}자 / 최소 {minChars}자</span>
          {currentResponse.length >= minChars && <span className="text-[10px]" style={{ color: S.green }}>✓ 충족</span>}
        </div>
      </div>

      {/* 중간 결론 */}
      <div className="mb-4">
        <p className="text-[10px] font-bold mb-1.5 font-mono tracking-widest text-gray-500">중간 결론</p>
        <div className="rounded-xl p-3 transition-all"
          style={{
            background: currentInterim ? `${color}12` : `${color}06`,
            border: `1.5px solid ${currentInterim ? color + '88' : color + '40'}`,
            boxShadow: currentInterim ? `0 0 12px ${color}25` : 'none',
          }}>
          <p className="text-[10px] mb-1.5" style={{ color: `${color}DD` }}>→ 이 질문에서 우리가 내린 결론:</p>
          <input
            value={currentInterim}
            onChange={e => onSaveInterim(sub.id, e.target.value)}
            disabled={isCurrentSubCompleted}
            placeholder="한 문장으로 정리하세요..."
            className="w-full bg-transparent text-[13px] text-white outline-none border-b pb-1 disabled:opacity-60"
            style={{ borderColor: `${color}66` }}
          />
        </div>
      </div>

      {/* ⭐ 팀장 완료 버튼 */}
      {isCurrentSubCompleted ? (
        <div className="w-full py-3 rounded-xl text-center font-bold text-[13px]"
          style={{ background: `${S.green}20`, color: S.green }}>
          ✓ 이 단계 완료
        </div>
      ) : (
        <button
          onClick={onCompleteSubCard}
          disabled={!canComplete}
          className="w-full py-3 font-black rounded-xl text-[14px] transition-all disabled:opacity-30"
          style={{
            background: canComplete ? S.green : 'rgba(255,255,255,0.06)',
            color: canComplete ? S.navy : '#555',
          }}>
          {!allMembersDone
            ? `팀원 인사이트 대기 중 (${completedCount}/${nonLeaders.length})`
            : currentResponse.trim().length < minChars
              ? `팀 답변 작성 (${currentResponse.length}/${minChars}자)`
              : !currentInterim.trim()
                ? '중간 결론 작성'
                : `✅ ${sub.id.split('-')[1] === '3' ? '결론 단계로' : `Q${parseInt(sub.id.split('-')[1]) + 1}로 넘어가기`}`}
        </button>
      )}

      {/* ⭐ 사이드바 (모바일 슬라이드업 / 데스크톱 모달) */}
      {showSidebar && (
        <TeamInsightSidebar
          subId={sub.id}
          color={color}
          memberInsights={memberInsights}
          teamMembers={teamMembers}
          onClose={() => setShowSidebar(false)}
        />
      )}
    </>
  );
}

// ═══════════════════════════════════════════════════════
// 팀원 인사이트 사이드바 (슬라이드업 패널)
// ═══════════════════════════════════════════════════════
interface SidebarProps {
  subId: string;
  color: string;
  memberInsights: MemberInsight[];
  teamMembers: Array<{ id: string; name: string; is_leader: boolean; role_code: string | null }>;
  onClose: () => void;
}

function TeamInsightSidebar({ subId, color, memberInsights, teamMembers, onClose }: SidebarProps) {
  const nonLeaders = teamMembers.filter(m => !m.is_leader);
  const completedCount = memberInsights.filter(i => i.is_completed).length;

  return (
    <div className="fixed inset-0 z-[200]" onClick={onClose}>
      {/* 어두운 배경 */}
      <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.6)' }} />

      {/* 슬라이드업 패널 */}
      <div
        onClick={e => e.stopPropagation()}
        className="absolute bottom-0 left-0 right-0 sidebar-slideup"
        style={{
          background: 'linear-gradient(180deg, #0A1228 0%, #0F1B3D 100%)',
          borderTop: `1px solid ${S.purple}40`,
          borderRadius: '16px 16px 0 0',
          padding: '14px 16px 24px',
          maxHeight: '70vh',
          overflowY: 'auto',
          boxShadow: '0 -8px 32px rgba(0,0,0,0.5)',
        }}>
        {/* 그래버 */}
        <div className="w-10 h-1 rounded-full mx-auto mb-4" style={{ background: 'rgba(255,255,255,0.2)' }} />

        {/* 헤더 */}
        <div className="flex items-center gap-2 mb-4">
          <div className="font-mono text-[11px] font-bold tracking-widest" style={{ color: S.cyan }}>
            팀원 인사이트
          </div>
          <div className="font-mono text-[12px] font-bold" style={{ color: S.cyan }}>
            {completedCount} / {nonLeaders.length}
          </div>
          <button onClick={onClose} className="ml-auto text-gray-400 text-lg leading-none">×</button>
        </div>

        {/* 팀원별 카드 */}
        <div className="space-y-2">
          {nonLeaders.map(m => {
            const insight = memberInsights.find(i => i.member_id === m.id);
            const role = m.role_code ? getRole(m.role_code) : null;
            const isDone = !!insight?.is_completed;

            return (
              <div key={m.id} className="rounded-lg p-2.5"
                style={{
                  background: isDone ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.02)',
                  borderLeft: isDone
                    ? `2px solid ${role?.color || S.cyan}`
                    : '2px dashed rgba(107,123,149,0.5)',
                  opacity: isDone ? 1 : 0.6,
                }}>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <div className="w-5 h-5 rounded flex items-center justify-center text-[10px] flex-shrink-0"
                    style={{ background: isDone ? (role?.color || S.cyan) : 'rgba(107,123,149,0.3)' }}>
                    {role?.icon || '?'}
                  </div>
                  <span className="text-[11px] text-white font-bold">{m.name}</span>
                  {role && (
                    <span className="text-[9px] font-mono" style={{ color: isDone ? role.color : '#6B7B95' }}>
                      {role.nameKr}
                    </span>
                  )}
                  <span className="ml-auto text-[9px] font-mono"
                    style={{ color: isDone ? '#4ADE80' : '#F9A825' }}>
                    {isDone ? '✓' : '대기'}
                  </span>
                </div>
                {isDone && insight ? (
                  <p className="text-[11.5px] text-gray-300 leading-relaxed">{insight.content}</p>
                ) : (
                  <p className="text-[11px] text-gray-600 italic">아직 작성 중...</p>
                )}
              </div>
            );
          })}
        </div>

        {nonLeaders.length === 0 && (
          <div className="text-center py-6">
            <p className="text-[12px] text-gray-500">팀원이 없어요. 혼자 진행됩니다.</p>
          </div>
        )}
      </div>

      <style jsx>{`
        .sidebar-slideup {
          animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        @keyframes slideUp {
          0% { transform: translateY(100%); }
          100% { transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// 팀원 Q 화면 컴포넌트 (자기 직무 인사이트만 작성)
// ═══════════════════════════════════════════════════════
interface MemberQViewProps {
  sub: SubCard;
  color: string;
  accentColor: string;
  myMemberId: string;
  myRoleCode: RoleCode | null;
  teamId: string;
  memberInsights: MemberInsight[];
  insightMinChars: number;
  isCurrentSubCompleted: boolean;
}

function MemberQView({
  sub, color, accentColor,
  myMemberId, myRoleCode, teamId,
  memberInsights, insightMinChars, isCurrentSubCompleted,
}: MemberQViewProps) {
  // 본인 인사이트
  const myInsight = memberInsights.find(i =>
    i.sub_card_id === sub.id && i.member_id === myMemberId
  );

  const [content, setContent] = useState(myInsight?.content || '');
  const [isCompleted, setIsCompleted] = useState(!!myInsight?.is_completed);
  const [saving, setSaving] = useState(false);

  // myInsight 변경 시 동기화
  useEffect(() => {
    if (myInsight) {
      setContent(myInsight.content);
      setIsCompleted(myInsight.is_completed);
    } else {
      setContent('');
      setIsCompleted(false);
    }
  }, [sub.id, myInsight?.id]);

  const myRole = myRoleCode ? getRole(myRoleCode) : null;
  const prompt = myRoleCode
    ? getRolePrompt(sub.id, myRoleCode)
    : '자기 관점에서 인사이트를 작성하세요';

  const canComplete = content.trim().length >= insightMinChars && !isCompleted;

  // 자동 저장 (작성 중)
  useEffect(() => {
    if (!myRoleCode || isCompleted) return;
    const t = setTimeout(() => {
      saveMemberInsight({
        teamId,
        memberId: myMemberId,
        subCardId: sub.id,
        roleCode: myRoleCode,
        content,
        isCompleted: false,
      });
    }, 800);
    return () => clearTimeout(t);
  }, [content, sub.id, myRoleCode, isCompleted, teamId, myMemberId]);

  const handleComplete = async () => {
    if (!myRoleCode || !canComplete) return;
    setSaving(true);
    await saveMemberInsight({
      teamId,
      memberId: myMemberId,
      subCardId: sub.id,
      roleCode: myRoleCode,
      content,
      isCompleted: true,
    });
    setIsCompleted(true);
    setSaving(false);
  };

  return (
    <>
      {/* 직무 헤더 */}
      {myRole && (
        <div className="mb-3 rounded-xl p-3 flex items-center gap-2.5"
          style={{
            background: `${myRole.color}15`,
            border: `1px solid ${myRole.color}40`,
          }}>
          <div className="w-9 h-9 rounded-lg flex items-center justify-center text-base flex-shrink-0"
            style={{ background: `${myRole.color}30`, border: `1px solid ${myRole.color}` }}>
            {myRole.icon}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-mono tracking-widest" style={{ color: myRole.color }}>
              YOUR ROLE
            </p>
            <p className="text-[13px] font-bold text-white leading-tight">
              {myRole.nameKr} · {myRole.nameEn}
            </p>
          </div>
        </div>
      )}

      {/* 직무별 프롬프트 */}
      <div className="mb-3 rounded-xl p-3"
        style={{ background: `${color}10`, border: `1px solid ${color}30` }}>
        <p className="text-[10px] font-bold mb-1 font-mono tracking-widest" style={{ color: accentColor }}>
          내 직무 관점 미션
        </p>
        <p className="text-[12.5px] text-white leading-relaxed">{prompt}</p>
      </div>

      {/* 인사이트 입력창 */}
      <div className="mb-4">
        <p className="text-[10px] font-bold mb-2 font-mono tracking-widest text-gray-500">
          내 인사이트 {isCompleted && <span style={{ color: S.green }}>· ✓ 제출됨</span>}
        </p>
        <textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          disabled={isCompleted}
          placeholder="자기 직무 관점에서 한두 문장으로..."
          className="w-full px-3 py-2.5 rounded-xl text-[13px] text-white leading-relaxed resize-none transition disabled:opacity-70"
          rows={4}
          style={{
            background: content ? `${color}10` : `${color}06`,
            border: `1.5px solid ${content ? color : color + '40'}`,
            outline: 'none',
            boxShadow: content ? `0 0 12px ${color}30` : 'none',
          }}
        />
        <div className="flex justify-between mt-1">
          <span className="text-[10px] text-gray-600">
            {content.length}자 / 최소 {insightMinChars}자
          </span>
          {content.length >= insightMinChars && (
            <span className="text-[10px]" style={{ color: S.green }}>✓ 충족</span>
          )}
        </div>
      </div>

      {/* 완료 버튼 */}
      {isCompleted ? (
        <div className="space-y-2">
          <div className="w-full py-3 rounded-xl text-center font-bold text-[13px]"
            style={{ background: `${S.green}20`, color: S.green, border: `1px solid ${S.green}40` }}>
            ✓ 인사이트 제출 완료
          </div>
          <p className="text-[11px] text-gray-500 text-center">
            팀장이 종합하는 동안 잠시 기다려주세요
          </p>
        </div>
      ) : (
        <button
          onClick={handleComplete}
          disabled={!canComplete || saving}
          className="w-full py-3 font-black rounded-xl text-[14px] transition-all disabled:opacity-30"
          style={{
            background: canComplete ? S.green : 'rgba(255,255,255,0.06)',
            color: canComplete ? S.navy : '#555',
          }}>
          {saving
            ? '제출 중...'
            : canComplete
              ? '✅ 인사이트 제출하기'
              : `${insightMinChars - content.length}자 더 작성해주세요`}
        </button>
      )}

      {/* 안내 */}
      {!isCompleted && (
        <p className="text-[10.5px] text-gray-600 text-center mt-3 leading-relaxed">
          제출 후에는 수정할 수 없어요. 신중히 작성하세요.
        </p>
      )}
    </>
  );
}
