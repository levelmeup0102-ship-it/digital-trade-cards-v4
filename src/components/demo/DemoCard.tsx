'use client';
import { useState, useEffect, Fragment, useRef, useLayoutEffect } from 'react';
import type { TopicCard, SubCard, CardCategory } from '@/types';
import { CARD_COLORS, parseTemplate } from '@/data/cardData';

const S = { green: '#E7FE55', aqua: '#C1E8EB', navy: '#111111', cyan: '#06B6D4', purple: '#8B5CF6' };
const TABS = ['주제', 'Q1', 'Q2', 'Q3', '결론'] as const;
type TabType = typeof TABS[number];

function textColorForCard(bgColor: string): string {
  if (bgColor === '#FFC72C' || bgColor === '#E7FE55') return S.navy;
  return '#fff';
}

function getCategoryStyle(category: CardCategory) {
  const styles: Record<CardCategory, { bg: string; color: string; label: string }> = {
    '시장 이해': { bg: 'rgba(6, 182, 212, 0.15)', color: '#06B6D4', label: '시장 이해' },
    '전략 설계': { bg: 'rgba(139, 92, 246, 0.15)', color: '#8B5CF6', label: '전략 설계' },
    '고객 인사이트': { bg: 'rgba(255, 111, 181, 0.15)', color: '#FF6FB5', label: '고객 인사이트' },
    '실행 설계': { bg: 'rgba(120, 190, 32, 0.15)', color: '#78BE20', label: '실행 설계' },
  };
  return styles[category];
}

function isFillInBlankComplete(template: string, values: string[]): boolean {
  const parts = parseTemplate(template);
  const blankCount = parts.length - 1;
  if (blankCount === 0) return true;
  for (let i = 0; i < blankCount; i++) {
    if (!values[i]?.trim()) return false;
  }
  return true;
}

function composeFromTemplate(template: string, values: string[]): string {
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

interface DemoCardProps {
  topic: TopicCard;
  currentTab: TabType;
  onTabChange: (tab: TabType) => void;
  isTabLocked: (tab: TabType) => boolean;
  completedSubCards: Set<string>;
  onCompleteSub: (subCardId: string) => void;
  responses: Record<string, string>;
  onSaveResponse: (subCardId: string, text: string) => void;
  interimConclusions: Record<string, string[]>;
  onSaveInterim: (subCardId: string, values: string[]) => void;
  finalStrategyValues: string[];
  onSaveFinalStrategy: (values: string[]) => void;
  isCardCompleted: boolean;
  onComplete: () => void;
}

export default function DemoCard({
  topic, currentTab, onTabChange,
  isTabLocked, completedSubCards, onCompleteSub,
  responses, onSaveResponse,
  interimConclusions, onSaveInterim,
  finalStrategyValues, onSaveFinalStrategy,
  isCardCompleted, onComplete,
}: DemoCardProps) {
  const color = CARD_COLORS[topic.id].bg;
  const categoryStyle = getCategoryStyle(topic.category);

  const getSubForTab = (tab: TabType): SubCard | null => {
    if (tab === '주제' || tab === '결론') return null;
    const qIdx = TABS.indexOf(tab) - 1;
    return topic.subs[qIdx] || null;
  };

  const sub = getSubForTab(currentTab);
  const subId = sub?.id || '';
  const currentResponse = responses[subId] || '';
  const currentInterimValues = interimConclusions[subId] || [];

  const isCurrentSubCompleted = sub ? completedSubCards.has(sub.id) : false;

  const isFinalStrategyFilled = isFillInBlankComplete(
    topic.finalStrategyTemplate,
    finalStrategyValues
  );

  const canCompleteSub = sub && !isCurrentSubCompleted &&
    currentResponse.trim().length > 0 &&
    isFillInBlankComplete(sub.conclusionTemplate, currentInterimValues);

  return (
    <div className="w-full max-w-[340px] md:max-w-4xl mx-auto md:flex md:gap-6 md:items-start">

      {/* ─── 카드 비주얼 (좌측) ─── */}
      <div className="mb-4 relative md:mb-0 md:w-[340px] md:flex-shrink-0 md:sticky md:top-4 md:self-start">
        <div className="rounded-2xl overflow-hidden bg-white border border-gray-200 relative"
          style={{
            aspectRatio: '70 / 95',
            boxShadow: '0 8px 24px rgba(0,0,0,0.15), 0 2px 8px rgba(0,0,0,0.08)',
          }}>
          {isCardCompleted && (
            <div className="absolute top-3 right-3 z-10 flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full"
              style={{ background: S.green, color: S.navy }}>
              ✓ 완료
            </div>
          )}
          <div className="p-5 flex flex-col h-full">
            <div className="grid grid-cols-4 gap-1.5 mb-4">
              <div className="aspect-square rounded-full flex items-center justify-center font-black"
                style={{
                  background: color,
                  color: textColorForCard(color),
                  boxShadow: `0 4px 12px ${color}66`,
                  fontSize: '14px',
                }}>
                {topic.id}
              </div>
              {Array.from({ length: 15 }).map((_, i) => (
                <div key={i} className="aspect-square rounded-md transition-colors duration-300"
                  style={{
                    background: currentTab === '주제' ? '#D1D5DB' : color,
                    opacity: currentTab === '주제' ? 1 : 0.85,
                  }} />
              ))}
            </div>

            <div className="mt-2">
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

      {/* ─── 우측 컨텐츠 ─── */}
      <div className="md:flex-1 md:min-w-0 w-full">

        {/* 탭 (잠금 + ✓ 표시) */}
        <div className="flex rounded-xl overflow-hidden mb-2"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
          {TABS.map((tab) => {
            const isActive = currentTab === tab;
            const isLocked = isTabLocked(tab);

            let isDone = false;
            if (tab === 'Q1') isDone = completedSubCards.has(`${topic.id}-1`);
            if (tab === 'Q2') isDone = completedSubCards.has(`${topic.id}-2`);
            if (tab === 'Q3') isDone = completedSubCards.has(`${topic.id}-3`);
            if (tab === '결론') isDone = isCardCompleted;

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
                    : isLocked ? 'rgba(255,255,255,0.3)' : isDone ? color : '#FFFFFF',
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

        {/* 컨텐츠 */}
        <div className="rounded-2xl overflow-hidden"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>

          {/* ── 주제 탭 ── */}
          {currentTab === '주제' && (
            <div className="p-4">
              <p className="text-[10px] font-bold mb-2 font-mono tracking-widest" style={{ color }}>개념 및 중요성</p>
              <p className="text-[13px] text-white leading-relaxed mb-4">{topic.overview}</p>
              <div className="rounded-xl p-3 mb-4" style={{ background: `${color}12`, border: `1px solid ${color}30` }}>
                <p className="text-[10px] font-bold mb-1 font-mono tracking-widest" style={{ color }}>핵심 통찰 질문</p>
                <p className="text-[13px] text-white font-bold leading-relaxed">{topic.insightQ}</p>
              </div>
              <button onClick={() => onTabChange('Q1')}
                className="w-full py-3 font-black rounded-xl text-[13px] transition-all hover:scale-[1.02]"
                style={{ background: S.green, color: S.navy }}>
                Q1 시작하기 →
              </button>
            </div>
          )}

          {/* ── Q1, Q2, Q3 탭 ── */}
          {sub && (currentTab === 'Q1' || currentTab === 'Q2' || currentTab === 'Q3') && (
            <div className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full"
                  style={{ background: `${color}22`, color }}>{sub.id}</span>
                <span className="text-[10px] text-white">
                  {currentTab === 'Q1' ? 'Fact 수집' : currentTab === 'Q2' ? 'Insight 해석' : 'Decision 결정'}
                </span>
                {isCurrentSubCompleted && (
                  <span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full"
                    style={{ background: `${S.green}22`, color: S.green }}>✓ 완료</span>
                )}
              </div>

              <div className="rounded-xl p-3 mb-2" style={{ background: `${color}10`, border: `1px solid ${color}25` }}>
                <p className="text-[13px] text-white font-bold leading-relaxed">{sub.question}</p>
              </div>

              <p className="text-[11px] text-white mb-4 italic" style={{ opacity: 0.85 }}>
                → 이 답변은 최종 <span className="font-bold" style={{ color }}>{`'${sub.resultUsage}'`}</span>에 사용됩니다
              </p>

              {/* 답변 입력 */}
              <DemoTextArea
                value={currentResponse}
                onChange={(text) => onSaveResponse(sub.id, text)}
                placeholder="자기 생각을 자유롭게 작성해보세요..."
                color={color}
                disabled={isCurrentSubCompleted}
              />

              {/* 중간 결론 빈칸 */}
              <div className="mt-4">
                <p className="text-[11px] font-bold mb-1.5 font-mono tracking-widest text-white">중간 결론</p>
                <p className="text-[11px] text-white mb-2" style={{ opacity: 0.8 }}>→ 빈칸을 채워서 한 문장으로 정리해보세요</p>
                <div className="rounded-xl p-3 transition-all"
                  style={{
                    background: isFillInBlankComplete(sub.conclusionTemplate, currentInterimValues)
                      ? `${color}12` : `${color}06`,
                    border: `1.5px solid ${isFillInBlankComplete(sub.conclusionTemplate, currentInterimValues) ? color + '88' : color + '40'}`,
                  }}>
                  <FillInBlankForm
                    key={`interim-${sub.id}`}
                    template={sub.conclusionTemplate}
                    values={currentInterimValues}
                    onChange={(idx, value) => {
                      const newValues = [...currentInterimValues];
                      newValues[idx] = value;
                      onSaveInterim(sub.id, newValues);
                    }}
                    cardColor={color}
                    disabled={isCurrentSubCompleted}
                  />
                </div>
              </div>

              {/* Q 완료 버튼 */}
              {isCurrentSubCompleted ? (
                <div className="w-full mt-4 py-3 rounded-xl text-center font-bold text-[13px]"
                  style={{ background: `${S.green}20`, color: S.green }}>
                  ✓ 이 단계 완료
                </div>
              ) : (
                <button
                  onClick={() => sub && onCompleteSub(sub.id)}
                  disabled={!canCompleteSub}
                  className="w-full mt-4 py-3 font-black rounded-xl text-[14px] transition-all disabled:opacity-30"
                  style={{
                    background: canCompleteSub ? S.green : 'rgba(255,255,255,0.06)',
                    color: canCompleteSub ? S.navy : '#FFFFFF',
                  }}>
                  {!currentResponse.trim()
                    ? '답변을 작성해주세요'
                    : !isFillInBlankComplete(sub.conclusionTemplate, currentInterimValues)
                      ? '중간 결론 빈칸을 채워주세요'
                      : `✅ ${currentTab} 완료하기`}
                </button>
              )}
            </div>
          )}

          {/* ── 결론 탭 ── */}
          {currentTab === '결론' && (
            <div className="p-4">
              {/* 답변 요약 */}
              <div className="mb-4">
                <p className="text-[11px] font-bold mb-2 font-mono tracking-widest text-white">내 답변 요약</p>
                <div className="space-y-2">
                  {topic.subs.map((s, i) => {
                    const interimValues = interimConclusions[s.id] || [];
                    const interimText = composeFromTemplate(s.conclusionTemplate, interimValues);
                    const r = responses[s.id] || '';
                    const filled = r.trim().length > 0;
                    const interimFilled = isFillInBlankComplete(s.conclusionTemplate, interimValues);
                    return (
                      <div key={s.id} className="rounded-lg p-2.5 transition-all"
                        style={{
                          background: filled ? `${color}12` : `${color}06`,
                          border: `1.5px solid ${filled ? color + '80' : color + '40'}`,
                        }}>
                        <p className="text-[10px] font-bold font-mono mb-1" style={{ color }}>Q{i + 1}</p>
                        {interimFilled
                          ? <p className="text-[12px] text-white">→ {interimText}</p>
                          : r
                            ? <p className="text-[11px] text-white line-clamp-2" style={{ opacity: 0.7 }}>{r}</p>
                            : <p className="text-[11px] text-white" style={{ opacity: 0.5 }}>미작성</p>}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 한 문장 전략 */}
              <div className="mb-4">
                <p className="text-[11px] font-bold mb-1.5 font-mono tracking-widest text-white">한 문장 전략</p>
                <p className="text-[11px] text-white mb-3" style={{ opacity: 0.8 }}>
                  Q1·Q2·Q3 답변을 종합해서 빈칸을 채워보세요.
                </p>

                <div className="rounded-xl p-3 mb-2"
                  style={{
                    background: `${color}10`,
                    border: `1.5px solid ${color}50`,
                    boxShadow: isFinalStrategyFilled ? `0 0 16px ${color}25` : 'none',
                  }}>
                  <FillInBlankForm
                    key={`final-${topic.id}`}
                    template={topic.finalStrategyTemplate}
                    values={finalStrategyValues}
                    onChange={(idx, value) => {
                      const newValues = [...finalStrategyValues];
                      newValues[idx] = value;
                      onSaveFinalStrategy(newValues);
                    }}
                    cardColor={color}
                    disabled={isCardCompleted}
                  />
                </div>

                {isFinalStrategyFilled && (
                  <p className="text-[10px] text-right" style={{ color: S.green }}>✓ 모든 빈칸 작성됨</p>
                )}
              </div>

              {/* 카드 완료 버튼 */}
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
                    color: isFinalStrategyFilled ? S.navy : '#FFFFFF',
                  }}>
                  {isFinalStrategyFilled ? '✅ 다음 카드로' : '한 문장 전략의 빈칸을 채워주세요'}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
function FillInBlankForm({
  template, values, onChange, cardColor, disabled,
}: {
  template: string;
  values: string[];
  onChange: (idx: number, value: string) => void;
  cardColor: string;
  disabled?: boolean;
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
              cardColor={cardColor}
              disabled={disabled}
            />
          )}
        </Fragment>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// ⭐ BlankInput v6 - 보이지 않는 span으로 글자 너비 측정
//   (canvas measureText 대신 실제 DOM 측정으로 모바일에서도 정확)
// ═══════════════════════════════════════════════════════
function BlankInput({
  value, onChange, cardColor, disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  cardColor: string;
  disabled?: boolean;
}) {
  const [localValue, setLocalValue] = useState(value);
  const [width, setWidth] = useState(60); // 빈칸 기본 너비
  const measureRef = useRef<HTMLSpanElement>(null);

  const isComposingRef = useRef(false);
  const localValueRef = useRef(localValue);
  const externalValueRef = useRef(value);
  const onChangeRef = useRef(onChange);

  useEffect(() => { localValueRef.current = localValue; }, [localValue]);
  useEffect(() => { externalValueRef.current = value; }, [value]);
  useEffect(() => { onChangeRef.current = onChange; }, [onChange]);

  // 외부 value 동기화
  useEffect(() => {
    if (isComposingRef.current) return;
    if (value !== localValueRef.current) {
      setLocalValue(value);
    }
  }, [value]);

  // 디바운스 저장
  useEffect(() => {
    if (isComposingRef.current) return;
    if (localValue === value) return;
    const t = setTimeout(() => onChange(localValue), 200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localValue, value]);

  // ⭐ 핵심: 보이지 않는 span의 실제 너비를 측정해서 input 너비로 사용
  useLayoutEffect(() => {
    if (measureRef.current) {
      const measured = measureRef.current.offsetWidth;
      // 양쪽 padding(20px) + border(2px) + 여유(10px) = 32px
      const newWidth = Math.max(60, measured + 32);
      if (newWidth !== width) {
        setWidth(newWidth);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localValue]);

  const flushSave = () => {
    if (localValueRef.current !== externalValueRef.current) {
      onChangeRef.current(localValueRef.current);
    }
  };

  const NEON_YELLOW = '#FFE680';

  // 동일한 폰트로 측정 span 스타일
  const measureStyle: React.CSSProperties = {
    position: 'absolute',
    visibility: 'hidden',
    whiteSpace: 'pre',
    fontSize: '13px',
    fontWeight: 600,
    fontFamily: 'inherit',
    padding: 0,
    margin: 0,
    pointerEvents: 'none',
    left: '-9999px',
    top: 0,
  };

  return (
    <>
      {/* ⭐ 숨겨진 측정용 span — 글자 너비를 정확히 측정 */}
      <span ref={measureRef} style={measureStyle} aria-hidden="true">
        {localValue || ''}
      </span>

      <input
        type="text"
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        onCompositionStart={() => { isComposingRef.current = true; }}
        onCompositionEnd={(e) => {
          isComposingRef.current = false;
          const v = (e.target as HTMLInputElement).value;
          setLocalValue(v);
          if (v !== externalValueRef.current) {
            onChangeRef.current(v);
          }
        }}
        onBlur={() => flushSave()}
        disabled={disabled}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        style={{
          display: 'inline-block',
          width: `${width}px`,
          height: '26px',
          boxSizing: 'border-box',
          background: localValue ? `${NEON_YELLOW}15` : `${NEON_YELLOW}08`,
          color: localValue ? NEON_YELLOW : '#FFFFFF',
          border: `1px solid ${localValue ? NEON_YELLOW : NEON_YELLOW + '44'}`,
          borderRadius: '5px',
          padding: '0 10px',
          margin: '0 3px',
          fontSize: '13px',
          fontWeight: 600,
          lineHeight: '24px',
          outline: 'none',
          verticalAlign: 'middle',
          minWidth: '60px',
          transition: 'background 0.2s, border-color 0.2s, box-shadow 0.2s',
          boxShadow: localValue ? `0 0 4px ${NEON_YELLOW}33` : 'none',
          opacity: disabled ? 0.7 : 1,
        }}
      />
    </>
  );
}

// ═══════════════════════════════════════════════════════
// DemoTextArea - 답변 입력창
// ═══════════════════════════════════════════════════════
function DemoTextArea({
  value, onChange, placeholder, color, disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  color: string;
  disabled?: boolean;
}) {
  const [localValue, setLocalValue] = useState(value);
  const isComposingRef = useRef(false);
  const localValueRef = useRef(localValue);
  const externalValueRef = useRef(value);
  const onChangeRef = useRef(onChange);

  useEffect(() => { localValueRef.current = localValue; }, [localValue]);
  useEffect(() => { externalValueRef.current = value; }, [value]);
  useEffect(() => { onChangeRef.current = onChange; }, [onChange]);

  useEffect(() => {
    if (isComposingRef.current) return;
    if (value !== localValueRef.current) setLocalValue(value);
  }, [value]);

  useEffect(() => {
    if (isComposingRef.current) return;
    if (localValue === value) return;
    const t = setTimeout(() => onChange(localValue), 200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localValue, value]);

  const flushSave = () => {
    if (localValueRef.current !== externalValueRef.current) {
      onChangeRef.current(localValueRef.current);
    }
  };

  return (
    <div>
      <p className="text-[11px] font-bold mb-2 font-mono tracking-widest text-white">내 답변</p>
      <textarea
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        onCompositionStart={() => { isComposingRef.current = true; }}
        onCompositionEnd={(e) => {
          isComposingRef.current = false;
          const v = (e.target as HTMLTextAreaElement).value;
          setLocalValue(v);
          if (v !== externalValueRef.current) {
            onChangeRef.current(v);
          }
        }}
        onBlur={() => flushSave()}
        placeholder={placeholder}
        disabled={disabled}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        className="w-full px-3 py-2.5 rounded-xl text-[13px] text-white leading-relaxed resize-none transition disabled:opacity-70"
        rows={5}
        style={{
          background: localValue ? `${color}10` : `${color}06`,
          border: `1.5px solid ${localValue ? color : color + '40'}`,
          outline: 'none',
          boxShadow: localValue ? `0 0 12px ${color}30` : 'none',
        }}
      />
      <div className="flex justify-end mt-1">
        <span className="text-[10px] text-white" style={{ opacity: 0.7 }}>{localValue.length}자</span>
      </div>
    </div>
  );
}
