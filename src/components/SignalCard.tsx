'use client';
import { useState } from 'react';
import type { TopicCard, SubCard } from '@/types';
import { CARD_COLORS } from '@/data/cardData';

// SIGNAL 브랜드 컬러
const S = { green: '#E7FE55', aqua: '#C1E8EB', navy: '#111111' };

const TABS = ['주제', 'Q1', 'Q2', 'Q3', '결론'] as const;
type TabType = typeof TABS[number];

interface SignalCardProps {
  topic: TopicCard;
  currentTab: TabType;
  onTabChange: (tab: TabType) => void;
  // 체크리스트
  checkStates: Record<string, Record<number, boolean>>;
  onCheck: (cardId: string, idx: number) => void;
  // 답변
  responses: Record<string, any>;
  onSaveResponse: (cardId: string, text: string) => void;
  // 중간 결론
  interimConclusions: Record<string, string>;
  onSaveInterim: (cardId: string, text: string) => void;
  // 팀장 결론
  leaderConclusion: LeaderConclusionState;
  onLeaderConclusionChange: (key: keyof LeaderConclusionState, value: any) => void;
  // 완료
  completedCards: Set<string>;
  onComplete: () => void;
  isCardCompleted: boolean;
  // AI
  isLeader: boolean;
  aiLoading: boolean;
  aiDraftLoading: string | null;
  onRequestFeedback: (cardId: string) => void;
  onRequestDraft: (cardId: string) => void;
  aiFeedbacks: Record<string, any>;
  aiUsed: Set<string>;
  // 기타
  displayItem: string;
  level: string;
  minChars: number;
}

export interface LeaderConclusionState {
  fields: string[]; // ['산업', '고객', '문제', '채널']
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
  isLeader, aiLoading, aiDraftLoading,
  onRequestFeedback, onRequestDraft, aiFeedbacks, aiUsed,
  displayItem, level, minChars,
}: SignalCardProps) {
  const color = CARD_COLORS[topic.id].bg;
  const tabIdx = TABS.indexOf(currentTab);

  // Q탭별 sub카드
  const getSubForTab = (tab: TabType): SubCard | null => {
    if (tab === '주제' || tab === '결론') return null;
    const qIdx = TABS.indexOf(tab) - 1; // Q1=0, Q2=1, Q3=2
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
  const getLen = (cardId: string) => {
    const r = responses[cardId];
    if (!r) return 0;
    return Object.values(r.texts || {}).reduce((s: number, t: any) => s + (t?.trim()?.length || 0), 0);
  };
  const isCheckDone = (cardId: string) => {
    const c = checkStates[cardId];
    if (!c) return false;
    const s = topic.subs.find(x => x.id === cardId);
    return s?.checklist.every((_, i) => c[i]) || false;
  };
  const canFeedback = (cardId: string) => hasResponse(cardId) && isCheckDone(cardId) && getLen(cardId) >= minChars;

  // 결론 조건
  const allQsDone = topic.subs.every(s => hasResponse(s.id));
  const oneSentenceSynthesis = `우리는 ${leaderConclusion.fields[0] || '[산업]'}에서 ${leaderConclusion.fields[1] || '[고객]'}을 대상으로 ${leaderConclusion.fields[2] || '[문제]'}를 해결하며 ${leaderConclusion.fields[3] || '[채널]'}을 통해 시장에 진입한다`;
  const canComplete = isLeader && !isCardCompleted && Boolean(leaderConclusion.oneSentence?.trim()) && allQsDone;

  return (
    <div className="w-full max-w-[400px] flex flex-col" style={{ minHeight: '560px' }}>
      {/* 탭 헤더 */}
      <div className="flex mb-0 relative">
        {TABS.map((tab, i) => {
          const isActive = currentTab === tab;
          const isDone = tab !== '주제' && tab !== '결론'
            ? completedCards.has(topic.subs[i - 1]?.id || '')
            : tab === '결론' ? isCardCompleted : false;
          return (
            <button key={tab} onClick={() => onTabChange(tab)}
              className="flex-1 py-2 text-[11px] font-bold transition-all relative"
              style={{
                color: isActive ? '#fff' : isDone ? color : '#555',
                background: isActive ? color : 'transparent',
                borderBottom: isActive ? `2px solid ${color}` : '2px solid rgba(255,255,255,0.06)',
                borderRadius: isActive ? '8px 8px 0 0' : '0',
              }}>
              {isDone && !isActive ? '✓ ' : ''}{tab}
            </button>
          );
        })}
      </div>

      {/* 카드 본문 */}
      <div className="flex-1 rounded-b-2xl rounded-tr-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderTop: 'none' }}>

        {/* ── 주제 탭 ── */}
        {currentTab === '주제' && (
          <div className="h-full flex flex-col">
            {/* 카드 그래픽 */}
            <div className="p-5 flex-shrink-0" style={{ background: `linear-gradient(135deg, ${color}dd, ${color}88)` }}>
              <div className="flex items-start justify-between mb-3">
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-[13px] font-black font-mono" style={{ background: 'rgba(0,0,0,0.25)' }}>{topic.id}</div>
                <div className="text-right">
                  <div className="text-white/60 text-[9px] font-mono tracking-widest">SIGNAL CARD</div>
                  <div className="text-white/80 text-[10px]">{'★'.repeat(topic.difficulty)}{'☆'.repeat(5-topic.difficulty)}</div>
                </div>
              </div>
              {/* 4×4 그리드 */}
              <div className="grid grid-cols-4 gap-1 mb-3">
                {Array.from({ length: 16 }).map((_, i) => (
                  <div key={i} className="h-4 rounded-sm" style={{ background: i === 0 ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.15)' }} />
                ))}
              </div>
              <h2 className="text-white font-black text-lg leading-tight">{topic.title}</h2>
              <p className="text-white/70 text-[11px] mt-1">{topic.titleEn}</p>
            </div>
            {/* 콘텐츠 */}
            <div className="flex-1 overflow-y-auto p-4">
              <div className="mb-4">
                <p className="text-[10px] font-bold mb-2 font-mono tracking-widest" style={{ color: color }}>개념 및 중요성</p>
                <p className="text-[13px] text-gray-300 leading-relaxed">{topic.overview}</p>
              </div>
              <div className="rounded-xl p-3" style={{ background: `${color}12`, border: `1px solid ${color}30` }}>
                <p className="text-[10px] font-bold mb-1 font-mono tracking-widest" style={{ color: color }}>핵심 통찰 질문</p>
                <p className="text-[13px] text-white font-bold leading-relaxed">{topic.insightQ}</p>
              </div>
            </div>
            {/* Q1 시작 버튼 */}
            <div className="p-4 flex-shrink-0">
              <button onClick={() => onTabChange('Q1')}
                className="w-full py-3 font-black rounded-xl text-[14px] transition-all hover:scale-[1.02]"
                style={{ background: S.green, color: S.navy }}>
                Q1 시작하기 →
              </button>
            </div>
          </div>
        )}

        {/* ── Q1 / Q2 / Q3 탭 ── */}
        {sub && (currentTab === 'Q1' || currentTab === 'Q2' || currentTab === 'Q3') && (
          <div className="h-full flex flex-col">
            {/* 카드 그래픽 (힌트카드) */}
            <div className="p-4 flex-shrink-0" style={{ background: `linear-gradient(135deg, ${color}cc, ${color}66)` }}>
              <div className="flex items-center gap-2 mb-2">
                <div className="px-2 py-0.5 rounded-full text-[9px] font-bold font-mono" style={{ background: 'rgba(0,0,0,0.25)', color: '#fff' }}>
                  {sub.id} · 힌트카드
                </div>
                <div className="text-white/60 text-[9px]">{currentTab === 'Q1' ? 'Fact 수집' : currentTab === 'Q2' ? 'Insight 해석' : 'Decision 결정'}</div>
              </div>
              {/* 4×4 컬러 그리드 */}
              <div className="grid grid-cols-4 gap-1 mb-2">
                {Array.from({ length: 16 }).map((_, i) => (
                  <div key={i} className="h-3 rounded-sm" style={{ background: `rgba(255,255,255,${0.1 + (i % 4) * 0.08})` }} />
                ))}
              </div>
              <p className="text-white font-bold text-[13px] leading-snug">{sub.question}</p>
            </div>

            {/* 스크롤 콘텐츠 */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* 체크리스트 */}
              <div>
                <p className="text-[10px] font-bold mb-2 font-mono tracking-widest text-gray-500">체크리스트</p>
                <div className="space-y-2">
                  {sub.checklist.map((item, i) => (
                    <button key={i} onClick={() => onCheck(subId, i)}
                      className="w-full flex items-start gap-2.5 text-left transition-all"
                      style={{ opacity: currentChecks[i] ? 0.6 : 1 }}>
                      <div className="w-4 h-4 rounded flex-shrink-0 mt-0.5 flex items-center justify-center transition-all"
                        style={{ background: currentChecks[i] ? color : 'rgba(255,255,255,0.06)', border: `1px solid ${currentChecks[i] ? color : 'rgba(255,255,255,0.15)'}` }}>
                        {currentChecks[i] && <svg width="8" height="8" viewBox="0 0 10 10"><path d="M1.5 5l2.5 2.5 4.5-5" stroke="#fff" strokeWidth="1.5" fill="none" strokeLinecap="round"/></svg>}
                      </div>
                      <span className="text-[12px] text-gray-300 leading-relaxed" style={{ textDecoration: currentChecks[i] ? 'line-through' : 'none' }}>{item}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* 답변 입력 */}
              <div>
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
              <div>
                <p className="text-[10px] font-bold mb-2 font-mono tracking-widest text-gray-500">중간 결론</p>
                <div className="rounded-xl p-3" style={{ background: `${color}10`, border: `1px solid ${color}20` }}>
                  <p className="text-[11px] text-gray-500 mb-2">→ {topic.title}에서 우리가 내린 결론:</p>
                  <input
                    value={currentInterim}
                    onChange={e => onSaveInterim(subId, e.target.value)}
                    placeholder="한 문장으로 정리하세요..."
                    className="w-full bg-transparent text-[13px] text-white outline-none border-b pb-1"
                    style={{ borderColor: `${color}50` }}
                  />
                </div>
              </div>

              {/* AI 버튼 (팀장만) */}
              {isLeader && !completedCards.has(subId) && (
                <div className="space-y-2 pb-2">
                  {canFeedback(subId) && (
                    <button onClick={() => onRequestFeedback(subId)} disabled={aiLoading}
                      className="w-full py-2 font-bold rounded-xl text-[12px] transition disabled:opacity-50"
                      style={{ background: 'rgba(0,118,129,0.3)', border: '1px solid rgba(0,118,129,0.5)', color: S.aqua }}>
                      {aiLoading ? '🤖 AI 분석 중...' : '🤖 AI 피드백 받기'}
                    </button>
                  )}
                  {!hasResponse(subId) && (
                    <button onClick={() => onRequestDraft(subId)} disabled={!!aiDraftLoading}
                      className="w-full py-2 font-bold rounded-xl text-[12px] transition disabled:opacity-50"
                      style={{ background: 'rgba(255,199,44,0.15)', border: '1px solid rgba(255,199,44,0.25)', color: '#FFC72C' }}>
                      {aiDraftLoading === subId ? '⚡ 생성 중...' : '⚡ AI 초안 생성 (팀장)'}
                    </button>
                  )}
                  {/* AI 피드백 결과 */}
                  {aiFeedbacks[subId] && (
                    <div className="rounded-xl p-3 space-y-2" style={{ background: 'rgba(79,176,198,0.08)', border: '1px solid rgba(79,176,198,0.2)' }}>
                      <div className="flex items-center gap-2">
                        <span className="text-xl font-black" style={{ color: S.aqua }}>{aiFeedbacks[subId].score}</span>
                        <span className="text-[11px] text-gray-600">/5점</span>
                        <div className="flex-1 h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.08)' }}>
                          <div className="h-full rounded-full" style={{ width: `${aiFeedbacks[subId].score * 20}%`, background: S.green }} />
                        </div>
                      </div>
                      <p className="text-[11px] text-gray-400 leading-relaxed">✅ {aiFeedbacks[subId].highlight}</p>
                      <p className="text-[11px] text-gray-400 leading-relaxed">💡 {aiFeedbacks[subId].improve}</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 다음 탭 버튼 */}
            <div className="p-3 flex-shrink-0 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
              <button
                onClick={() => onTabChange(currentTab === 'Q1' ? 'Q2' : currentTab === 'Q2' ? 'Q3' : '결론')}
                className="w-full py-2.5 font-bold rounded-xl text-[13px] transition-all"
                style={{ background: currentResponse ? `${color}` : 'rgba(255,255,255,0.06)', color: currentResponse ? '#fff' : '#555' }}>
                {currentTab === 'Q3' ? '결론 탭으로 →' : `${currentTab === 'Q1' ? 'Q2' : 'Q3'}로 →`}
              </button>
            </div>
          </div>
        )}

        {/* ── 결론 탭 ── */}
        {currentTab === '결론' && (
          <div className="h-full flex flex-col">
            {/* 헤더 */}
            <div className="p-4 flex-shrink-0" style={{ background: `linear-gradient(135deg, ${color}88, ${color}33)` }}>
              <p className="text-[10px] font-bold font-mono tracking-widest text-white/60 mb-1">CONCLUSION</p>
              <h3 className="text-white font-black text-base">{topic.title}</h3>
              <p className="text-white/60 text-[11px]">팀장이 통합 결론을 작성합니다</p>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Q1~Q3 답변 요약 */}
              <div>
                <p className="text-[10px] font-bold mb-2 font-mono tracking-widest text-gray-500">팀 답변 요약</p>
                <div className="space-y-2">
                  {topic.subs.map((s, i) => {
                    const r = responses[s.id]?.texts?.['0'] || '';
                    const interim = interimConclusions[s.id] || '';
                    return (
                      <div key={s.id} className="rounded-lg p-2.5" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                        <p className="text-[10px] font-bold font-mono mb-1" style={{ color: color }}>Q{i+1}</p>
                        {interim ? <p className="text-[12px] text-gray-300">→ {interim}</p> : r ? <p className="text-[11px] text-gray-500 line-clamp-2">{r}</p> : <p className="text-[11px] text-gray-700">미작성</p>}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 4필드 입력 */}
              {isLeader && (
                <div>
                  <p className="text-[10px] font-bold mb-2 font-mono tracking-widest text-gray-500">한 문장 전략 재료</p>
                  <div className="grid grid-cols-2 gap-2">
                    {['산업', '고객', '해결할 문제', '진입 채널'].map((label, i) => (
                      <div key={i} className="rounded-lg p-2.5" style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${leaderConclusion.fields[i] ? color + '60' : 'rgba(255,255,255,0.06)'}` }}>
                        <p className="text-[9px] font-mono text-gray-600 mb-1">{label}</p>
                        <input
                          value={leaderConclusion.fields[i] || ''}
                          onChange={e => {
                            const newFields = [...leaderConclusion.fields];
                            newFields[i] = e.target.value;
                            onLeaderConclusionChange('fields', newFields);
                          }}
                          placeholder={`예) ${['K-뷰티', '20대 여성', '가격 장벽', '올리브영'][i]}`}
                          className="w-full bg-transparent text-[12px] text-white outline-none"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 한 문장 전략 */}
              {isLeader && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[10px] font-bold font-mono tracking-widest text-gray-500">한 문장 전략</p>
                    {!leaderConclusion.isEditing && (
                      <button onClick={() => {
                        onLeaderConclusionChange('oneSentence', oneSentenceSynthesis);
                        onLeaderConclusionChange('isEditing', true);
                      }}
                        className="text-[10px] font-bold px-2 py-0.5 rounded transition"
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
                      className="w-full px-3 py-2.5 rounded-xl text-[13px] text-white leading-relaxed resize-none transition"
                      rows={3}
                      style={{ background: 'rgba(255,255,255,0.06)', border: `1px solid ${color}`, outline: 'none' }}
                    />
                  )}
                </div>
              )}

              {/* 판단 기준 */}
              {isLeader && (
                <div>
                  <p className="text-[10px] font-bold mb-2 font-mono tracking-widest text-gray-500">팀장 판단 기준</p>
                  {['정의가 구체적인가?', '답변 간 연결이 논리적인가?', '현실성이 있는가?', '실행 가능한 수준인가?'].map((criterion, i) => (
                    <button key={i} onClick={() => {
                      const newJ = [...leaderConclusion.judgments];
                      newJ[i] = !newJ[i];
                      onLeaderConclusionChange('judgments', newJ);
                    }}
                      className="w-full flex items-center gap-2.5 mb-2 text-left">
                      <div className="w-4 h-4 rounded flex-shrink-0 flex items-center justify-center transition-all"
                        style={{ background: leaderConclusion.judgments[i] ? S.green : 'rgba(255,255,255,0.06)', border: `1px solid ${leaderConclusion.judgments[i] ? S.green : 'rgba(255,255,255,0.15)'}` }}>
                        {leaderConclusion.judgments[i] && <svg width="8" height="8" viewBox="0 0 10 10"><path d="M1.5 5l2.5 2.5 4.5-5" stroke="#111" strokeWidth="1.5" fill="none" strokeLinecap="round"/></svg>}
                      </div>
                      <span className="text-[12px] text-gray-400">{criterion}</span>
                    </button>
                  ))}
                </div>
              )}

              {!isLeader && (
                <div className="rounded-xl p-4 text-center" style={{ background: `${S.aqua}10`, border: `1px solid ${S.aqua}20` }}>
                  <p className="text-[12px]" style={{ color: S.aqua }}>💬 팀원 모드</p>
                  <p className="text-[11px] text-gray-600 mt-1">결론 작성은 팀장이 합니다</p>
                </div>
              )}
            </div>

            {/* 완료 버튼 */}
            {isLeader && (
              <div className="p-4 flex-shrink-0 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                {isCardCompleted ? (
                  <div className="w-full py-3 rounded-xl text-center font-bold text-[13px]"
                    style={{ background: `${S.green}20`, color: S.green }}>
                    {aiUsed.has(topic.id) ? '🤖 ' : ''}✓ 완료된 카드
                  </div>
                ) : (
                  <button onClick={onComplete} disabled={!canComplete}
                    className="w-full py-3 font-black rounded-xl text-[14px] transition-all disabled:opacity-30"
                    style={{ background: canComplete ? S.green : 'rgba(255,255,255,0.06)', color: canComplete ? S.navy : '#555' }}>
                    {canComplete ? '✅ 이 카드 완료하기' : allQsDone ? '한 문장 전략을 작성하세요' : 'Q1~Q3 답변 후 완료 가능'}
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
