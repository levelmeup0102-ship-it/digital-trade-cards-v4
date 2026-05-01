'use client';
import { useState } from 'react';
import type { TopicCard, SubCard } from '@/types';
import { CARD_COLORS } from '@/data/cardData';

const S = { green: '#E7FE55', aqua: '#C1E8EB', navy: '#111111' };
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
  isLeader,
  displayItem, level, minChars,
}: SignalCardProps) {
  const color = CARD_COLORS[topic.id].bg;

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
  const oneSentenceSynthesis = `우리는 ${leaderConclusion.fields[0] || '[산업]'}에서 ${leaderConclusion.fields[1] || '[고객]'}을 대상으로 ${leaderConclusion.fields[2] || '[문제]'}를 해결하며 ${leaderConclusion.fields[3] || '[채널]'}을 통해 시장에 진입한다`;
  const canComplete = isLeader && !isCardCompleted && Boolean(leaderConclusion.oneSentence?.trim()) && allQsDone;

  return (
    <div className="w-full max-w-[340px]">

      {/* ── 카드 비주얼 (기존 디자인 유지) ── */}
      <div className="relative mb-4" style={{ aspectRatio: '70/45', perspective: 1200 }}>
        {/* 그림자 카드 */}
        {[2, 1].map(offset => (
          <div key={offset} className="absolute rounded-2xl border border-gray-200"
            style={{ top: offset * 4, left: offset * 3, right: -offset * 3, bottom: -offset * 4, background: '#f0f0f0', transform: `rotate(${offset * 1.5}deg)` }} />
        ))}
        {/* 메인 카드 — 기존 CardFront 디자인 */}
        <div className="absolute inset-0 rounded-2xl overflow-hidden bg-white border border-gray-200 shadow-lg">
          {/* 완료 뱃지 */}
          {isCardCompleted && (
            <div className="absolute top-2 right-2 z-10 flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full"
              style={{ background: S.green, color: S.navy }}>
              ✓ 완료
            </div>
          )}
          <div className="p-5 h-full flex flex-col justify-between">
            {/* 카드 상단: 뱃지 + 그리드 */}
            <div className="relative">
              <div className="absolute -top-1 -left-1 w-10 h-10 rounded-full flex items-center justify-center text-white font-black text-base z-[2]"
                style={{ background: color, boxShadow: `0 4px 12px ${color}66` }}>
                {topic.id}
              </div>
              <div className="ml-11">
                <div className="grid grid-cols-4 gap-1 w-full">
                  {Array.from({ length: 16 }).map((_, i) => (
                    <div key={i} className="aspect-square rounded"
                      style={{ background: color, opacity: 0.85 }} />
                  ))}
                </div>
              </div>
            </div>
            {/* 카드 하단: 라벨 + 제목 */}
            <div className="mt-3">
              <span className="inline-block px-3 py-1 rounded-full text-[11px] font-semibold mb-2"
                style={{ border: `1.5px solid ${color}`, color }}>
                {topic.id}. 주제카드
              </span>
              <h3 className="text-lg font-black text-gray-900 leading-tight">{topic.title}</h3>
              <p className="text-[13px] font-extrabold text-gray-400 leading-tight">{topic.titleEn}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── 탭 바 ── */}
      <div className="flex rounded-xl overflow-hidden mb-2"
        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
        {TABS.map((tab, i) => {
          const isActive = currentTab === tab;
          const isDone = tab !== '주제' && tab !== '결론'
            ? completedCards.has(topic.subs[i - 1]?.id || '')
            : tab === '결론' ? isCardCompleted : false;
          return (
            <button key={tab} onClick={() => onTabChange(tab)}
              className="flex-1 py-2 text-[11px] font-bold transition-all"
              style={{
                background: isActive ? color : 'transparent',
                color: isActive ? (color === S.green ? S.navy : '#fff') : isDone ? color : '#666',
              }}>
              {isDone && !isActive ? '✓' : tab}
            </button>
          );
        })}
      </div>

      {/* ── 탭 콘텐츠 ── */}
      <div className="rounded-2xl overflow-hidden"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>

        {/* 주제 탭 */}
        {currentTab === '주제' && (
          <div className="p-4">
            <p className="text-[10px] font-bold mb-2 font-mono tracking-widest" style={{ color: color }}>개념 및 중요성</p>
            <p className="text-[13px] text-gray-300 leading-relaxed mb-4">{topic.overview}</p>
            <div className="rounded-xl p-3 mb-4" style={{ background: `${color}12`, border: `1px solid ${color}30` }}>
              <p className="text-[10px] font-bold mb-1 font-mono tracking-widest" style={{ color: color }}>핵심 통찰 질문</p>
              <p className="text-[13px] text-white font-bold leading-relaxed">{topic.insightQ}</p>
            </div>
            <button onClick={() => onTabChange('Q1')}
              className="w-full py-3 font-black rounded-xl text-[13px] transition-all hover:scale-[1.02]"
              style={{ background: S.green, color: S.navy }}>
              Q1 시작하기 →
            </button>
          </div>
        )}

        {/* Q1 / Q2 / Q3 탭 */}
        {sub && (currentTab === 'Q1' || currentTab === 'Q2' || currentTab === 'Q3') && (
          <div className="p-4">
            {/* 탭 역할 표시 */}
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full"
                style={{ background: `${color}22`, color: color }}>{sub.id}</span>
              <span className="text-[10px] text-gray-500">
                {currentTab === 'Q1' ? 'Fact 수집' : currentTab === 'Q2' ? 'Insight 해석' : 'Decision 결정'}
              </span>
            </div>

            {/* 메인 질문 */}
            <div className="rounded-xl p-3 mb-4" style={{ background: `${color}10`, border: `1px solid ${color}25` }}>
              <p className="text-[13px] text-white font-bold leading-relaxed">{sub.question}</p>
            </div>

            {/* 체크리스트 */}
            <div className="mb-4">
              <p className="text-[10px] font-bold mb-2 font-mono tracking-widest text-gray-500">체크리스트</p>
              <div className="space-y-2">
                {sub.checklist.map((item, i) => (
                  <button key={i} onClick={() => onCheck(subId, i)}
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

            {/* 답변 입력 */}
            <div className="mb-4">
              <p className="text-[10px] font-bold mb-2 font-mono tracking-widest text-gray-500">팀 답변</p>
              <textarea
                value={currentResponse}
                onChange={e => onSaveResponse(subId, e.target.value)}
                placeholder={`${displayItem}를 기준으로 팀의 답변을 작성하세요...`}
                className="w-full px-3 py-2.5 rounded-xl text-[13px] text-white leading-relaxed resize-none transition"
                rows={4}
                style={{ background: 'rgba(255,255,255,0.05)', border: currentResponse ? `1px solid ${color}` : '1px solid rgba(255,255,255,0.08)', outline: 'none' }}
              />
              <div className="flex justify-between mt-1">
                <span className="text-[10px] text-gray-600">{currentResponse.length}자 / 최소 {minChars}자</span>
                {currentResponse.length >= minChars && <span className="text-[10px]" style={{ color: S.green }}>✓ 충족</span>}
              </div>
            </div>

            {/* 중간 결론 */}
            <div className="mb-4">
              <p className="text-[10px] font-bold mb-1.5 font-mono tracking-widest text-gray-500">중간 결론</p>
              <div className="rounded-xl p-3" style={{ background: `${color}08`, border: `1px solid ${color}20` }}>
                <p className="text-[10px] text-gray-600 mb-1.5">→ 이 질문에서 우리가 내린 결론:</p>
                <input
                  value={currentInterim}
                  onChange={e => onSaveInterim(subId, e.target.value)}
                  placeholder="한 문장으로 정리하세요..."
                  className="w-full bg-transparent text-[13px] text-white outline-none border-b pb-1"
                  style={{ borderColor: `${color}40` }}
                />
              </div>
            </div>

            {/* 다음 탭 버튼 */}
            <button
              onClick={() => onTabChange(currentTab === 'Q1' ? 'Q2' : currentTab === 'Q2' ? 'Q3' : '결론')}
              className="w-full py-2.5 font-bold rounded-xl text-[13px] transition-all mt-3"
              style={{ background: currentResponse ? color : 'rgba(255,255,255,0.06)', color: currentResponse ? (color === S.green ? S.navy : '#fff') : '#555' }}>
              {currentTab === 'Q3' ? '결론 탭으로 →' : `${currentTab === 'Q1' ? 'Q2' : 'Q3'}로 →`}
            </button>
          </div>
        )}

        {/* 결론 탭 */}
        {currentTab === '결론' && (
          <div className="p-4">
            {/* Q1~Q3 답변 요약 */}
            <div className="mb-4">
              <p className="text-[10px] font-bold mb-2 font-mono tracking-widest text-gray-500">팀 답변 요약</p>
              <div className="space-y-2">
                {topic.subs.map((s, i) => {
                  const interim = interimConclusions[s.id] || '';
                  const r = responses[s.id]?.texts?.['0'] || '';
                  return (
                    <div key={s.id} className="rounded-lg p-2.5"
                      style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${hasResponse(s.id) ? color + '30' : 'rgba(255,255,255,0.06)'}` }}>
                      <p className="text-[10px] font-bold font-mono mb-1" style={{ color: color }}>Q{i + 1}</p>
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
                {/* 4필드 입력 */}
                <div className="mb-4">
                  <p className="text-[10px] font-bold mb-2 font-mono tracking-widest text-gray-500">한 문장 전략 재료</p>
                  <div className="grid grid-cols-2 gap-2">
                    {['산업', '고객', '해결할 문제', '진입 채널'].map((label, i) => (
                      <div key={i} className="rounded-lg p-2.5"
                        style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${leaderConclusion.fields[i] ? color + '50' : 'rgba(255,255,255,0.06)'}` }}>
                        <p className="text-[9px] font-mono text-gray-600 mb-1">{label}</p>
                        <input
                          value={leaderConclusion.fields[i] || ''}
                          onChange={e => {
                            const f = [...leaderConclusion.fields];
                            f[i] = e.target.value;
                            onLeaderConclusionChange('fields', f);
                          }}
                          placeholder={['K-뷰티', '20대 여성', '가격 장벽', '올리브영'][i]}
                          className="w-full bg-transparent text-[12px] text-white outline-none"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* 한 문장 전략 */}
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
                    <div className="rounded-xl p-3" style={{ background: `${color}12`, border: `1px solid ${color}30` }}>
                      <p className="text-[13px] text-gray-300 leading-relaxed">{oneSentenceSynthesis}</p>
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

                {/* 판단 기준 */}
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

                {/* 완료 버튼 */}
                {isCardCompleted ? (
                  <div className="w-full py-3 rounded-xl text-center font-bold text-[13px]"
                    style={{ background: `${S.green}20`, color: S.green }}>
                    ✓ 완료된 카드
                  </div>
                ) : (
                  <button onClick={onComplete} disabled={!canComplete}
                    className="w-full py-3 font-black rounded-xl text-[14px] transition-all disabled:opacity-30"
                    style={{ background: canComplete ? S.green : 'rgba(255,255,255,0.06)', color: canComplete ? S.navy : '#555' }}>
                    {canComplete ? '✅ 이 카드 완료하기' : allQsDone ? '한 문장 전략을 작성하세요' : 'Q1~Q3 답변 후 완료 가능'}
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
    </div>
  );
}
