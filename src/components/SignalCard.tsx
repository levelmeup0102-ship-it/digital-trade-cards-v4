'use client';
import { useState, useEffect, Fragment } from 'react';
import type { TopicCard, SubCard, CardCategory } from '@/types';
import { CARD_COLORS, parseTemplate } from '@/data/cardData';
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

// ⭐ 노란색 카드는 텍스트를 어둡게
function textColorForCard(bgColor: string): string {
  // 노란색 계열: #FFC72C(카드05), #E7FE55(green)
  if (bgColor === '#FFC72C' || bgColor === '#E7FE55') return S.navy;
  return '#fff';
}

// ⭐ 카테고리별 색상 배지
function getCategoryStyle(category: CardCategory) {
  const styles: Record<CardCategory, { bg: string; color: string; label: string }> = {
    '시장 이해': { bg: 'rgba(6, 182, 212, 0.15)', color: '#06B6D4', label: '시장 이해' },
    '전략 설계': { bg: 'rgba(139, 92, 246, 0.15)', color: '#8B5CF6', label: '전략 설계' },
    '고객 인사이트': { bg: 'rgba(255, 111, 181, 0.15)', color: '#FF6FB5', label: '고객 인사이트' },
    '실행 설계': { bg: 'rgba(120, 190, 32, 0.15)', color: '#78BE20', label: '실행 설계' },
  };
  return styles[category];
}

// ⭐ 빈칸 다 채워졌는지 검사
function isFillInBlankComplete(template: string, values: string[]): boolean {
  const parts = parseTemplate(template);
  const blankCount = parts.length - 1;
  if (blankCount === 0) return true;
  for (let i = 0; i < blankCount; i++) {
    if (!values[i]?.trim()) return false;
  }
  return true;
}

interface SignalCardProps {
  topic: TopicCard;
  currentTab: TabType;
  onTabChange: (tab: TabType) => void;
  responses: Record<string, any>;
  onSaveResponse: (cardId: string, text: string) => void;

  // ⭐ V3: 빈칸 채우기 값 배열
  interimConclusions: Record<string, string[]>;
  onSaveInterim: (cardId: string, values: string[]) => void;

  leaderConclusion: LeaderConclusionState;
  onLeaderConclusionChange: (key: keyof LeaderConclusionState, value: any) => void;
  completedCards: Set<string>;
  onComplete: () => void;
  isCardCompleted: boolean;
  isLeader: boolean;
  displayItem: string;
  level: string;
  minChars: number;

  // 협업 시스템 props
  teamId: string;
  myMemberId: string;
  myRoleCode: RoleCode | null;
  teamMembers: Array<{ id: string; name: string; is_leader: boolean; role_code?: string | null }>;
  memberInsights: MemberInsight[];
  subCardLocks: SubCardLock[];
  onLeaderCompleteSubCard: (subCardId: string) => Promise<void>;
}

export interface LeaderConclusionState {
  fields: string[];        // ⭐ 한 문장 전략 빈칸 채우기 값들 (가변)
  oneSentence: string;     // 자동 합성 결과 (계산값, 백업용)
  isEditing: boolean;      // 호환용
  judgments: boolean[];    // 호환용
}

export default function SignalCard({
  topic, currentTab, onTabChange,
  responses, onSaveResponse,
  interimConclusions, onSaveInterim,
  leaderConclusion, onLeaderConclusionChange,
  completedCards, onComplete, isCardCompleted,
  isLeader, displayItem, level, minChars,
  teamId, myMemberId, myRoleCode, teamMembers,
  memberInsights, subCardLocks, onLeaderCompleteSubCard,
}: SignalCardProps) {
  const color = CARD_COLORS[topic.id].bg;
  const categoryStyle = getCategoryStyle(topic.category);

  const insightMinChars = getInsightMinChars(level);

  const getSubForTab = (tab: TabType): SubCard | null => {
    if (tab === '주제' || tab === '결론') return null;
    const qIdx = TABS.indexOf(tab) - 1;
    return topic.subs[qIdx] || null;
  };

  const sub = getSubForTab(currentTab);
  const subId = sub?.id || '';
  const currentResponse = responses[subId]?.texts?.['0'] || '';
  const currentInterimValues = interimConclusions[subId] || [];

  const hasResponse = (cardId: string) => {
    const r = responses[cardId];
    return r && Object.values(r.texts || {}).some((t: any) => t?.trim());
  };

  // 잠금 상태
  const subLockStatus = topic.subs.map(s => ({
    id: s.id,
    isLocked: isSubCardLocked(s.id, subCardLocks),
    isCompleted: isSubCardCompleted(s.id, subCardLocks),
  }));

  const isCurrentSubLocked = sub ? isSubCardLocked(sub.id, subCardLocks) : false;
  const isCurrentSubCompleted = sub ? isSubCardCompleted(sub.id, subCardLocks) : false;

  const q3Id = `${topic.id}-3`;
  const isConclusionLocked = isSubCardLocked(q3Id, subCardLocks) || !isSubCardCompleted(q3Id, subCardLocks);

  // 팀원 인사이트
  const nonLeaderMemberIds = teamMembers.filter(m => !m.is_leader).map(m => m.id);
  const currentSubInsights = memberInsights.filter(i => i.sub_card_id === subId);
  const allMembersDone = sub ? areAllMembersComplete(sub.id, memberInsights, nonLeaderMemberIds) : false;

  // 중간 결론 완료 여부 (빈칸 다 채워야 함)
  const isInterimFilled = sub ? isFillInBlankComplete(sub.conclusionTemplate, currentInterimValues) : false;

  // 팀장 Q 완료 가능 조건
  const canLeaderCompleteSub =
    isLeader &&
    !isCurrentSubCompleted &&
    allMembersDone &&
    currentResponse.trim().length >= minChars &&
    isInterimFilled;

  // 한 문장 전략 완료 여부
  const isFinalStrategyFilled = isFillInBlankComplete(
    topic.finalStrategyTemplate,
    leaderConclusion.fields || []
  );

  return (
    <div className="w-full max-w-[340px] md:max-w-4xl mx-auto md:flex md:gap-6 md:items-start">

      {/* 카드 비주얼 — PC에서 왼쪽 고정 */}
      <div className="mb-4 relative md:mb-0 md:w-[340px] md:flex-shrink-0 md:sticky md:top-4 md:self-start">
        {/* ⭐⭐⭐ PDF 명세 적용: 비율 70:95 + 카드번호 그리드 [0,0] 통합 ⭐⭐⭐ */}
        <div className="rounded-2xl overflow-hidden bg-white border border-gray-200 relative"
          style={{
            aspectRatio: '70 / 95',  // ⭐ PDF 카드 비율
            boxShadow: '0 8px 24px rgba(0,0,0,0.15), 0 2px 8px rgba(0,0,0,0.08)',
          }}>
          {isCardCompleted && (
            <div className="absolute top-3 right-3 z-10 flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full"
              style={{ background: S.green, color: S.navy }}>
              ✓ 완료
            </div>
          )}
          <div className="p-5 flex flex-col h-full">
            {/* ⭐ 4x4 그리드 (16칸) — 첫 칸은 카드번호 동그라미, 나머지 15칸은 정사각형 */}
            <div className="grid grid-cols-4 gap-1.5 mb-4">
              {/* [0,0]: 카드번호 동그라미 */}
              <div className="aspect-square rounded-full flex items-center justify-center font-black"
                style={{
                  background: color,
                  color: textColorForCard(color),
                  boxShadow: `0 4px 12px ${color}66`,
                  fontSize: '14px',
                }}>
                {topic.id}
              </div>
              {/* 나머지 15칸 (정사각형 그리드) */}
              {Array.from({ length: 15 }).map((_, i) => (
                <div key={i} className="aspect-square rounded-md transition-colors duration-300"
                  style={{
                    background: currentTab === '주제' ? '#D1D5DB' : color,
                    opacity: currentTab === '주제' ? 1 : 0.85,
                  }} />
              ))}
            </div>

            <div className="mt-2">
              {/* ⭐ 카테고리 + 주제카드 라벨 */}
              <div className="flex items-center gap-1.5 mb-2 flex-wrap">
                <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold"
                  style={{ background: categoryStyle.bg, color: categoryStyle.color, border: `1px solid ${categoryStyle.color}50` }}>
                  {categoryStyle.label}
                </span>
                <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold"
                  style={{ border: `1.5px solid ${color}`, color }}>
                  {topic.id}. 주제카드
                </span>
              </div>
              <h3 className="text-lg font-black text-gray-900 leading-tight">{topic.title}</h3>
              <p className="text-[13px] font-extrabold text-gray-400 leading-tight mt-0.5">{topic.titleEn}</p>
            </div>
          </div>
        </div>
      </div>

      {/* PC에서 우측 영역 (탭 + 콘텐츠) */}
      <div className="md:flex-1 md:min-w-0 w-full">

      {/* 탭 바 */}
      <div className="flex rounded-xl overflow-hidden mb-2"
        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
        {TABS.map((tab, i) => {
          const isActive = currentTab === tab;
          let isLocked = false;
          let isDone = false;

          if (tab === '주제') {
            // 항상 열림
          } else if (tab === '결론') {
            isLocked = isConclusionLocked;
            isDone = isCardCompleted;
          } else {
            const subStatus = subLockStatus[i - 1];
            isLocked = subStatus?.isLocked || false;
            isDone = subStatus?.isCompleted || false;
          }

          return (
            <button
              key={tab}
              onClick={() => !isLocked && onTabChange(tab)}
              disabled={isLocked}
              className={`flex-1 py-2 text-[11px] font-bold transition-all flex items-center justify-center gap-1 ${isLocked ? 'cursor-not-allowed' : ''}`}
              style={{
                background: isActive ? color : 'transparent',
                color: isActive
                  ? textColorForCard(color)
                  : isLocked ? '#555' : isDone ? color : '#999',
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
            <p className="text-[10px] font-bold mb-2 font-mono tracking-widest" style={{ color }}>개념 및 중요성</p>
            <p className="text-[13px] text-gray-300 leading-relaxed mb-4">{topic.overview}</p>
            <div className="rounded-xl p-3 mb-4" style={{ background: `${color}12`, border: `1px solid ${color}30` }}>
              <p className="text-[10px] font-bold mb-1 font-mono tracking-widest" style={{ color }}>핵심 통찰 질문</p>
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

        {/* ─── Q탭 잠긴 상태 ─── */}
        {sub && (currentTab === 'Q1' || currentTab === 'Q2' || currentTab === 'Q3') && isCurrentSubLocked && (
          <LockedView message={
            currentTab === 'Q1' ? '주제 탭을 먼저 확인해주세요'
              : `이전 ${currentTab === 'Q2' ? 'Q1' : 'Q2'}을 팀장이 완료하면 열려요`
          } />
        )}

        {/* ─── Q탭 열린 상태 ─── */}
        {sub && (currentTab === 'Q1' || currentTab === 'Q2' || currentTab === 'Q3') && !isCurrentSubLocked && (
          <div className="p-4">
            {/* Q 라벨 + 단계명 */}
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full"
                style={{ background: `${color}22`, color }}>{sub.id}</span>
              <span className="text-[10px] text-gray-500">
                {currentTab === 'Q1' ? 'Fact 수집' : currentTab === 'Q2' ? 'Insight 해석' : 'Decision 결정'}
              </span>
              {isCurrentSubCompleted && (
                <span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full"
                  style={{ background: `${S.green}22`, color: S.green }}>✓ 완료</span>
              )}
            </div>

            {/* 질문 박스 */}
            <div className="rounded-xl p-3 mb-2" style={{ background: `${color}10`, border: `1px solid ${color}25` }}>
              <p className="text-[13px] text-white font-bold leading-relaxed">{sub.question}</p>
            </div>

            {/* ⭐ 결과 사용처 */}
            <p className="text-[10px] text-gray-500 mb-4 italic">
              → 이 답변은 최종 <span className="font-bold" style={{ color }}>{`'${sub.resultUsage}'`}</span>에 사용됩니다
            </p>

            {/* 팀장 vs 팀원 분기 */}
            {isLeader ? (
              <LeaderQView
                sub={sub}
                color={color}
                currentResponse={currentResponse}
                onSaveResponse={onSaveResponse}
                currentInterimValues={currentInterimValues}
                onSaveInterim={onSaveInterim}
                isInterimFilled={isInterimFilled}
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
              <MemberQView
                sub={sub}
                color={color}
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

        {/* ─── 결론 탭 잠긴 상태 ─── */}
        {currentTab === '결론' && isConclusionLocked && (
          <LockedView
            title="결론은 Q3 완료 후"
            message="팀장이 Q3까지 마쳐야 결론을 작성할 수 있어요"
          />
        )}

        {/* ─── 결론 탭 열린 상태 ─── */}
        {currentTab === '결론' && !isConclusionLocked && (
          <div className="p-4">
            {/* 팀 답변 요약 */}
            <div className="mb-4">
              <p className="text-[10px] font-bold mb-2 font-mono tracking-widest text-gray-500">팀 답변 요약</p>
              <div className="space-y-2">
                {topic.subs.map((s, i) => {
                  const interimValues = interimConclusions[s.id] || [];
                  const interimText = composeInterim(s.conclusionTemplate, interimValues);
                  const r = responses[s.id]?.texts?.['0'] || '';
                  const filled = hasResponse(s.id);
                  const interimFilled = isFillInBlankComplete(s.conclusionTemplate, interimValues);
                  return (
                    <div key={s.id} className="rounded-lg p-2.5 transition-all"
                      style={{
                        background: filled ? `${color}12` : `${color}06`,
                        border: `1.5px solid ${filled ? color + '80' : color + '40'}`,
                      }}>
                      <p className="text-[10px] font-bold font-mono mb-1" style={{ color }}>Q{i + 1}</p>
                      {interimFilled
                        ? <p className="text-[12px] text-gray-300">→ {interimText}</p>
                        : r
                          ? <p className="text-[11px] text-gray-500 line-clamp-2">{r}</p>
                          : <p className="text-[11px] text-gray-700">미작성</p>}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 팀장: 한 문장 전략 빈칸 채우기 */}
            {isLeader ? (
              <>
                <div className="mb-4">
                  <p className="text-[10px] font-bold mb-1 font-mono tracking-widest text-gray-500">한 문장 전략</p>
                  <p className="text-[11px] text-gray-600 mb-3">
                    Q1·Q2·Q3 답변을 종합해서 빈칸을 채우세요. 노란 칸만 입력하면 돼요.
                  </p>

                  <div className="rounded-xl p-3 mb-2"
                    style={{
                      background: `${color}10`,
                      border: `1.5px solid ${color}50`,
                      boxShadow: isFinalStrategyFilled ? `0 0 16px ${color}25` : 'none',
                    }}>
                    <FillInBlankForm
                      template={topic.finalStrategyTemplate}
                      values={leaderConclusion.fields || []}
                      onChange={(idx, value) => {
                        const newFields = [...(leaderConclusion.fields || [])];
                        newFields[idx] = value;
                        onLeaderConclusionChange('fields', newFields);
                      }}
                      disabled={isCardCompleted}
                      cardColor={color}
                    />
                  </div>

                  {isFinalStrategyFilled && (
                    <p className="text-[10px] text-right" style={{ color: S.green }}>✓ 모든 빈칸 작성됨</p>
                  )}
                </div>

                {isCardCompleted ? (
                  <div className="w-full py-3 rounded-xl text-center font-bold text-[13px]"
                    style={{ background: `${S.green}20`, color: S.green }}>
                    ✓ 완료된 카드
                  </div>
                ) : (
                  <button
                    onClick={onComplete}
                    disabled={!isFinalStrategyFilled}
                    className="w-full py-3 font-black rounded-xl text-[14px] transition-all disabled:opacity-30"
                    style={{
                      background: isFinalStrategyFilled ? S.green : 'rgba(255,255,255,0.06)',
                      color: isFinalStrategyFilled ? S.navy : '#555'
                    }}>
                    {isFinalStrategyFilled ? '✅ 이 카드 완료하기' : '모든 빈칸을 채워주세요'}
                  </button>
                )}
              </>
            ) : (
              /* 팀원: 한 문장 전략 읽기 전용 */
              (() => {
                // ⭐ 팀원 동기화: oneSentence 우선, 없으면 fields 합성
                const composed = leaderConclusion.oneSentence ||
                  composeInterim(topic.finalStrategyTemplate, leaderConclusion.fields || []);
                const hasContent = (
                  // fields가 모두 채워졌거나
                  isFinalStrategyFilled ||
                  // oneSentence가 있고 ___ (빈칸)이 없으면
                  (leaderConclusion.oneSentence && leaderConclusion.oneSentence.trim() && !leaderConclusion.oneSentence.includes('___'))
                );
                return (
                  <div className="mb-4">
                    <p className="text-[10px] font-bold mb-1.5 font-mono tracking-widest text-gray-500">
                      한 문장 전략
                    </p>
                    {hasContent ? (
                      <div className="rounded-xl p-3 transition-all"
                        style={{
                          background: `${color}15`,
                          border: `1.5px solid ${color}80`,
                          boxShadow: `0 0 16px ${color}25`,
                        }}>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-[9px] font-mono font-bold tracking-widest px-1.5 py-0.5 rounded"
                            style={{ background: `${S.green}20`, color: S.green }}>
                            팀장 작성
                          </span>
                          <span className="text-[9px] font-mono text-gray-500">읽기 전용</span>
                        </div>
                        <p className="text-[13px] text-gray-200 leading-relaxed font-medium">
                          {composed}
                        </p>
                      </div>
                    ) : (
                      <div className="rounded-xl p-4 text-center"
                        style={{ background: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(255,255,255,0.1)' }}>
                        <p className="text-[12px] text-gray-500">⏳ 팀장이 작성 중이에요</p>
                        <p className="text-[10px] text-gray-700 mt-1">조금만 기다려주세요</p>
                      </div>
                    )}
                    {isCardCompleted && (
                      <div className="mt-3 w-full py-2.5 rounded-xl text-center font-bold text-[12px]"
                        style={{ background: `${S.green}15`, color: S.green, border: `1px solid ${S.green}30` }}>
                        ✓ 이 카드 완료됨
                      </div>
                    )}
                  </div>
                );
              })()
            )}
          </div>
        )}
      </div>

      </div>
      {/* 우측 영역 끝 */}

    </div>
  );
}

// ═══════════════════════════════════════════════════════
// 빈칸 채우기 폼 컴포넌트
// ═══════════════════════════════════════════════════════
function FillInBlankForm({
  template,
  values,
  onChange,
  disabled,
  cardColor,
}: {
  template: string;
  values: string[];
  onChange: (idx: number, value: string) => void;
  disabled?: boolean;
  cardColor: string;
}) {
  const parts = parseTemplate(template);

  return (
    <div className="text-[14px] text-white leading-[2.2]"
      style={{ wordBreak: 'keep-all', overflowWrap: 'anywhere' }}>
      {parts.map((part, idx) => (
        <Fragment key={idx}>
          <span className="whitespace-pre-wrap">{part}</span>
          {idx < parts.length - 1 && (
            <BlankInput
              value={values[idx] || ''}
              onChange={(v) => onChange(idx, v)}
              disabled={disabled}
              cardColor={cardColor}
            />
          )}
        </Fragment>
      ))}
    </div>
  );
}

// 빈칸 입력 박스 (자동 너비 조절, 네온 노란 테마)
function BlankInput({
  value,
  onChange,
  disabled,
  cardColor,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  cardColor: string;
}) {
  // 한글은 글자당 ~16px, 영어는 ~8px. 평균 ~13px로 잡고 패딩 추가
  const calcWidth = (v: string) => {
    const chars = v.length || 0;
    return Math.max(60, Math.min(280, chars * 14 + 24));
  };

  // ⭐ 네온 노란색 테마 (다른 답변 박스와 통일된 느낌)
  const NEON_YELLOW = '#FFE680';

  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      style={{
        display: 'inline-block',
        width: `${calcWidth(value)}px`,
        background: value ? `${NEON_YELLOW}15` : `${NEON_YELLOW}08`,
        color: value ? NEON_YELLOW : '#888',
        border: `1.5px solid ${value ? NEON_YELLOW : NEON_YELLOW + '44'}`,
        borderRadius: '6px',
        padding: '2px 8px',
        margin: '0 2px',
        fontSize: '13.5px',
        fontWeight: 600,
        outline: 'none',
        verticalAlign: 'baseline',
        minWidth: '60px',
        maxWidth: '280px',
        transition: 'all 0.2s',
        boxShadow: value
          ? `0 0 12px ${NEON_YELLOW}55, inset 0 0 6px ${NEON_YELLOW}10`
          : 'none',
        textShadow: value ? `0 0 6px ${NEON_YELLOW}AA` : 'none',
      }}
      onFocus={(e) => {
        e.currentTarget.style.boxShadow = `0 0 18px ${NEON_YELLOW}AA, inset 0 0 8px ${NEON_YELLOW}22`;
        e.currentTarget.style.borderColor = NEON_YELLOW;
        e.currentTarget.style.background = `${NEON_YELLOW}1A`;
      }}
      onBlur={(e) => {
        if (value) {
          e.currentTarget.style.boxShadow = `0 0 12px ${NEON_YELLOW}55, inset 0 0 6px ${NEON_YELLOW}10`;
          e.currentTarget.style.background = `${NEON_YELLOW}15`;
        } else {
          e.currentTarget.style.boxShadow = 'none';
          e.currentTarget.style.borderColor = `${NEON_YELLOW}44`;
          e.currentTarget.style.background = `${NEON_YELLOW}08`;
        }
      }}
    />
  );
}

// 잠긴 상태 뷰
function LockedView({ title = '아직 잠겨있어요', message }: { title?: string; message: string }) {
  return (
    <div className="p-8 text-center">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4"
        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}>
        <svg width="28" height="32" viewBox="0 0 12 14" fill="none">
          <rect x="2" y="6" width="8" height="7" rx="1" stroke="#888" strokeWidth="1.2" fill="none"/>
          <path d="M3.5 6V4a2.5 2.5 0 015 0v2" stroke="#888" strokeWidth="1.2" fill="none" strokeLinecap="round"/>
        </svg>
      </div>
      <h3 className="text-[15px] font-bold text-gray-300 mb-2">{title}</h3>
      <p className="text-[12px] text-gray-500 leading-relaxed">{message}</p>
    </div>
  );
}

// 빈칸 채우기 결과 합성
function composeInterim(template: string, values: string[]): string {
  const parts = parseTemplate(template);
  let result = '';
  for (let i = 0; i < parts.length; i++) {
    result += parts[i];
    if (i < parts.length - 1) {
      result += values[i] || '___';
    }
  }
  return result;
}

// ═══════════════════════════════════════════════════════
// 팀장 Q 화면 (체크리스트 제거됨)
// ═══════════════════════════════════════════════════════
interface LeaderQViewProps {
  sub: SubCard;
  color: string;
  currentResponse: string;
  onSaveResponse: (cardId: string, text: string) => void;
  currentInterimValues: string[];
  onSaveInterim: (cardId: string, values: string[]) => void;
  isInterimFilled: boolean;
  displayItem: string;
  minChars: number;
  memberInsights: MemberInsight[];
  teamMembers: Array<{ id: string; name: string; is_leader: boolean; role_code?: string | null }>;
  allMembersDone: boolean;
  isCurrentSubCompleted: boolean;
  canComplete: boolean;
  onCompleteSubCard: () => void;
}

function LeaderQView({
  sub, color,
  currentResponse, onSaveResponse,
  currentInterimValues, onSaveInterim, isInterimFilled,
  displayItem, minChars,
  memberInsights, teamMembers,
  allMembersDone, isCurrentSubCompleted,
  canComplete, onCompleteSubCard,
}: LeaderQViewProps) {
  const [showSidebar, setShowSidebar] = useState(false);

  const nonLeaders = teamMembers.filter(m => !m.is_leader);
  const completedCount = memberInsights.filter(i => i.is_completed).length;

  return (
    <>
      {/* 팀 답변 */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[10px] font-bold font-mono tracking-widest text-gray-500">팀 답변</p>
          <button
            onClick={() => setShowSidebar(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-all hover:scale-[1.03]"
            style={{ background: `${S.cyan}15`, border: `1px solid ${S.cyan}40` }}>
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
          rows={5}
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

      {/* ⭐ 중간 결론 — 빈칸 채우기 */}
      <div className="mb-4">
        <p className="text-[10px] font-bold mb-1.5 font-mono tracking-widest text-gray-500">중간 결론</p>
        <p className="text-[10px] text-gray-600 mb-2">→ 빈칸을 채워서 한 문장으로 정리하세요</p>
        <div className="rounded-xl p-3 transition-all"
          style={{
            background: isInterimFilled ? `${color}12` : `${color}06`,
            border: `1.5px solid ${isInterimFilled ? color + '88' : color + '40'}`,
            boxShadow: isInterimFilled ? `0 0 12px ${color}25` : 'none',
          }}>
          <FillInBlankForm
            template={sub.conclusionTemplate}
            values={currentInterimValues}
            onChange={(idx, value) => {
              const newValues = [...currentInterimValues];
              newValues[idx] = value;
              onSaveInterim(sub.id, newValues);
            }}
            disabled={isCurrentSubCompleted}
            cardColor={color}
          />
        </div>
        {isInterimFilled && (
          <p className="text-[10px] text-right mt-1" style={{ color: S.green }}>✓ 빈칸 모두 작성됨</p>
        )}
      </div>

      {/* 팀장 완료 버튼 */}
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
              : !isInterimFilled
                ? '중간 결론 빈칸 채우기'
                : `✅ ${sub.id.split('-')[1] === '3' ? '결론 단계로' : `Q${parseInt(sub.id.split('-')[1]) + 1}로 넘어가기`}`}
        </button>
      )}

      {showSidebar && (
        <TeamInsightSidebar
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
// 팀원 인사이트 사이드바
// ═══════════════════════════════════════════════════════
function TeamInsightSidebar({
  color,
  memberInsights,
  teamMembers,
  onClose,
}: {
  color: string;
  memberInsights: MemberInsight[];
  teamMembers: Array<{ id: string; name: string; is_leader: boolean; role_code?: string | null }>;
  onClose: () => void;
}) {
  const nonLeaders = teamMembers.filter(m => !m.is_leader);
  const completedCount = memberInsights.filter(i => i.is_completed).length;

  return (
    <div className="fixed inset-0 z-[200]" onClick={onClose}>
      <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.6)' }} />

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
        <div className="w-10 h-1 rounded-full mx-auto mb-4" style={{ background: 'rgba(255,255,255,0.2)' }} />

        <div className="flex items-center gap-2 mb-4">
          <div className="font-mono text-[11px] font-bold tracking-widest" style={{ color: S.cyan }}>팀원 인사이트</div>
          <div className="font-mono text-[12px] font-bold" style={{ color: S.cyan }}>
            {completedCount} / {nonLeaders.length}
          </div>
          <button onClick={onClose} className="ml-auto text-gray-400 text-lg leading-none">×</button>
        </div>

        <div className="space-y-2">
          {nonLeaders.map(m => {
            const insight = memberInsights.find(i => i.member_id === m.id);
            const role = m.role_code ? getRole(m.role_code) : null;
            const isDone = !!insight?.is_completed;

            return (
              <div key={m.id} className="rounded-lg p-2.5"
                style={{
                  background: isDone ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.02)',
                  borderLeft: isDone ? `2px solid ${role?.color || S.cyan}` : '2px dashed rgba(107,123,149,0.5)',
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
        .sidebar-slideup { animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
        @keyframes slideUp {
          0% { transform: translateY(100%); }
          100% { transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// 팀원 Q 화면
// ═══════════════════════════════════════════════════════
function MemberQView({
  sub, color,
  myMemberId, myRoleCode, teamId,
  memberInsights, insightMinChars, isCurrentSubCompleted,
}: {
  sub: SubCard;
  color: string;
  myMemberId: string;
  myRoleCode: RoleCode | null;
  teamId: string;
  memberInsights: MemberInsight[];
  insightMinChars: number;
  isCurrentSubCompleted: boolean;
}) {
  const myInsight = memberInsights.find(i =>
    i.sub_card_id === sub.id && i.member_id === myMemberId
  );

  const [content, setContent] = useState(myInsight?.content || '');
  const [isCompleted, setIsCompleted] = useState(!!myInsight?.is_completed);
  const [saving, setSaving] = useState(false);

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

  // 자동 저장
  useEffect(() => {
    if (!myRoleCode || isCompleted) return;
    const t = setTimeout(() => {
      saveMemberInsight({
        teamId, memberId: myMemberId, subCardId: sub.id,
        roleCode: myRoleCode, content, isCompleted: false,
      });
    }, 800);
    return () => clearTimeout(t);
  }, [content, sub.id, myRoleCode, isCompleted, teamId, myMemberId]);

  const handleComplete = async () => {
    if (!myRoleCode || !canComplete) return;
    setSaving(true);
    await saveMemberInsight({
      teamId, memberId: myMemberId, subCardId: sub.id,
      roleCode: myRoleCode, content, isCompleted: true,
    });
    setIsCompleted(true);
    setSaving(false);
  };

  return (
    <>
      {myRole && (
        <div className="mb-3 rounded-xl p-3 flex items-center gap-2.5"
          style={{ background: `${myRole.color}15`, border: `1px solid ${myRole.color}40` }}>
          <div className="w-9 h-9 rounded-lg flex items-center justify-center text-base flex-shrink-0"
            style={{ background: `${myRole.color}30`, border: `1px solid ${myRole.color}` }}>
            {myRole.icon}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-mono tracking-widest" style={{ color: myRole.color }}>YOUR ROLE</p>
            <p className="text-[13px] font-bold text-white leading-tight">
              {myRole.nameKr} · {myRole.nameEn}
            </p>
          </div>
        </div>
      )}

      <div className="mb-3 rounded-xl p-3"
        style={{ background: `${color}10`, border: `1px solid ${color}30` }}>
        <p className="text-[10px] font-bold mb-1 font-mono tracking-widest" style={{ color }}>내 직무 관점 미션</p>
        <p className="text-[12.5px] text-white leading-relaxed">{prompt}</p>
      </div>

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
          {saving ? '제출 중...' : canComplete ? '✅ 인사이트 제출하기' : `${insightMinChars - content.length}자 더 작성해주세요`}
        </button>
      )}

      {!isCompleted && (
        <p className="text-[10.5px] text-gray-600 text-center mt-3 leading-relaxed">
          제출 후에는 수정할 수 없어요. 신중히 작성하세요.
        </p>
      )}
    </>
  );
}
