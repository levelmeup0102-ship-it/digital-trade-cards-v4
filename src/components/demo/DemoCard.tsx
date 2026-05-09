'use client';
import { useState, useEffect, Fragment, useRef } from 'react';
import type { TopicCard, SubCard, CardCategory } from '@/types';
import { CARD_COLORS, parseTemplate } from '@/data/cardData';

const S = { green: '#E7FE55', aqua: '#C1E8EB', navy: '#111111', cyan: '#06B6D4', purple: '#8B5CF6' };
const TABS = ['주제', 'Q1', 'Q2', 'Q3', '결론'] as const;
type TabType = typeof TABS[number];

// canvas 기반 텍스트 너비 측정
let _measureCanvas: HTMLCanvasElement | null = null;
function measureTextWidth(text: string, font: string): number {
  if (typeof document === 'undefined') return text.length * 11;
  if (!_measureCanvas) _measureCanvas = document.createElement('canvas');
  const ctx = _measureCanvas.getContext('2d');
  if (!ctx) return text.length * 11;
  ctx.font = font;
  return ctx.measureText(text).width;
}

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

  const allQsCompleted = topic.subs.every(s => {
    const r = responses[s.id] || '';
    const interim = interimConclusions[s.id] || [];
    return r.trim().length > 0 && isFillInBlankComplete(s.conclusionTemplate, interim);
  });

  const isFinalStrategyFilled = isFillInBlankComplete(
    topic.finalStrategyTemplate,
    finalStrategyValues
  );

  const canMoveToNextQ = sub && currentResponse.trim().length > 0 &&
    isFillInBlankComplete(sub.conclusionTemplate, currentInterimValues);

  const handleNextQ = () => {
    const qIdx = TABS.indexOf(currentTab);
    if (qIdx < TABS.length - 1) {
      onTabChange(TABS[qIdx + 1]);
    }
  };

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

        {/* 탭 */}
        <div className="flex rounded-xl overflow-hidden mb-2"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
          {TABS.map((tab) => {
            const isActive = currentTab === tab;
            return (
              <button
                key={tab}
                onClick={() => onTabChange(tab)}
                className="flex-1 py-2 text-[11px] font-bold transition-all flex items-center justify-center gap-1"
                style={{
                  background: isActive ? color : 'transparent',
                  color: isActive ? textColorForCard(color) : '#FFFFFF',
                }}
              >
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
                  />
                </div>
              </div>

              {/* 다음 Q 버튼 */}
              <button
                onClick={handleNextQ}
                disabled={!canMoveToNextQ}
                className="w-full mt-4 py-3 font-black rounded-xl text-[14px] transition-all disabled:opacity-30"
                style={{
                  background: canMoveToNextQ ? S.green : 'rgba(255,255,255,0.06)',
                  color: canMoveToNextQ ? S.navy : '#FFFFFF',
                }}>
                {!currentResponse.trim()
                  ? '답변을 작성해주세요'
                  : !isFillInBlankComplete(sub.conclusionTemplate, currentInterimValues)
                    ? '중간 결론 빈칸을 채워주세요'
                    : currentTab === 'Q3'
                      ? '✅ 결론 단계로'
                      : `✅ ${currentTab === 'Q1' ? 'Q2' : 'Q3'}로 넘어가기`}
              </button>
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
// FillInBlankForm
// ═══════════════════════════════════════════════════════
function FillInBlankForm({
  template,
  values,
  onChange,
  cardColor,
}: {
  template: string;
  values: string[];
  onChange: (idx: number, value: string) => void;
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
              cardColor={cardColor}
            />
          )}
        </Fragment>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// BlankInput
// ═══════════════════════════════════════════════════════
function BlankInput({
  value,
  onChange,
  cardColor,
}: {
  value: string;
  onChange: (v: string) => void;
  cardColor: string;
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
    if (value !== localValueRef.current) {
      setLocalValue(value);
    }
  }, [value]);

  useEffect(() => {
    if (isComposingRef.current) return;
    if (localValue === value) return;
    const t = setTimeout(() => onChange(localValue), 200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localValue, value]);

  const calcWidth = (v: string) => {
    if (!v) return 40;
    const FONT = '600 12px Pretendard, -apple-system, BlinkMacSystemFont, sans-serif';
    const w = measureTextWidth(v, FONT);
    return Math.max(40, Math.ceil(w) + 16);
  };

  const NEON_YELLOW = '#FFE680';

  return (
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
      style={{
        display: 'inline-block',
        width: `${calcWidth(localValue)}px`,
        height: '20px',
        boxSizing: 'border-box',
        background: localValue ? `${NEON_YELLOW}15` : `${NEON_YELLOW}08`,
        color: localValue ? NEON_YELLOW : '#FFFFFF',
        border: `1px solid ${localValue ? NEON_YELLOW : NEON_YELLOW + '44'}`,
        borderRadius: '4px',
        padding: '0 6px',
        margin: '0 2px',
        fontSize: '12px',
        fontWeight: 600,
        lineHeight: '18px',
        outline: 'none',
        verticalAlign: 'middle',
        minWidth: '40px',
        transition: 'width 0.15s, background 0.2s, border-color 0.2s, box-shadow 0.2s',
        boxShadow: localValue ? `0 0 4px ${NEON_YELLOW}33` : 'none',
      }}
    />
  );
}

// ═══════════════════════════════════════════════════════
// DemoTextArea (간단한 답변 입력창)
// ═══════════════════════════════════════════════════════
function DemoTextArea({
  value,
  onChange,
  placeholder,
  color,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  color: string;
}) {
  const [localValue, setLocalValue] = useState(value);
  const isComposingRef = useRef(false);

  useEffect(() => {
    if (isComposingRef.current) return;
    if (value !== localValue) setLocalValue(value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  useEffect(() => {
    if (isComposingRef.current) return;
    if (localValue === value) return;
    const t = setTimeout(() => onChange(localValue), 200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localValue, value]);

  return (
    <div>
      <p className="text-[11px] font-bold mb-2 font-mono tracking-widest text-white">내 답변</p>
      <textarea
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        onCompositionStart={() => { isComposingRef.current = true; }}
        onCompositionEnd={(e) => {
          isComposingRef.current = false;
          setLocalValue((e.target as HTMLTextAreaElement).value);
        }}
        placeholder={placeholder}
        className="w-full px-3 py-2.5 rounded-xl text-[13px] text-white leading-relaxed resize-none transition"
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
