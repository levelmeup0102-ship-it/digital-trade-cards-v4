'use client';
import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ALL_CARDS, CARD_COLORS, TOPICS } from '@/data/cardData';
import SignalCard, { type LeaderConclusionState } from '@/components/SignalCard';
import type { SubCard } from '@/types';
import {
  getOrCreateSession, restoreSession,
  saveCardResponse, loadCardResponses, saveCardProgress, loadCardProgress,
} from '@/lib/session';
import { supabase, type Session } from '@/lib/supabase';
import { getRole, type RoleCode } from '@/data/roleData';
import {
  loadTeamInsights,
  subscribeToTeamInsights,
  loadSubCardLocks,
  subscribeToSubCardLocks,
  ensureFirstSubCardUnlocked,
  leaderCompleteSubCard,
  getNextSubCardId,
  type MemberInsight,
  type SubCardLock,
} from '@/lib/collaborative';
import { getTeamMembers } from '@/lib/teacher';
import type { TeamMember } from '@/lib/teacher';

const LEVELS: Record<string, { label: string; emoji: string; timer: number; minChars: number; color: string }> = {
  basic:    { label: '초급', emoji: '🌱', timer: 1800, minChars: 20,  color: '#059669' },
  standard: { label: '표준', emoji: '📘', timer: 1200, minChars: 50,  color: '#4FB0C6' },
  advanced: { label: '심화', emoji: '🚀', timer: 900,  minChars: 100, color: '#582C83' },
};

const S = {
  green: '#E7FE55',
  aqua: '#C1E8EB',
  cyan: '#06B6D4',
  purple: '#8B5CF6',
  blue: '#3B82F6',
  pink: '#FF6FB5',
  navy: '#111111',
  bg: '#0A0A0A',
};
const TABS = ['주제', 'Q1', 'Q2', 'Q3', '결론'] as const;
type TabType = typeof TABS[number];

const SHOW_PDF_BUTTON = false;

function fmt(s: number) { return `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`; }

const defaultLeaderConclusion = (): LeaderConclusionState => ({
  fields: [],
  oneSentence: '',
  isEditing: false,
  judgments: [],
});

// ═══════════════════════════════════════════════════════
// ⭐ V3 동기화 함수 (빈칸 채우기 string[] 처리)
// ═══════════════════════════════════════════════════════

// 중간 결론 저장 — values를 JSON으로 직렬화
async function saveInterimConclusionDB(teamId: string, subCardId: string, values: string[]) {
  try {
    await supabase.from('sub_card_interim_conclusions').upsert({
      team_id: teamId,
      sub_card_id: subCardId,
      content: JSON.stringify(values),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'team_id,sub_card_id' });
  } catch (e) {
    console.error('interim 저장 실패', e);
  }
}

// 중간 결론 로드 — JSON 파싱해서 string[]로 반환
async function loadInterimConclusionsDB(teamId: string): Promise<Record<string, string[]>> {
  try {
    const { data } = await supabase
      .from('sub_card_interim_conclusions')
      .select('sub_card_id, content')
      .eq('team_id', teamId);
    const map: Record<string, string[]> = {};
    (data || []).forEach((r: any) => {
      try {
        const parsed = JSON.parse(r.content || '[]');
        map[r.sub_card_id] = Array.isArray(parsed) ? parsed : [];
      } catch {
        map[r.sub_card_id] = [];
      }
    });
    return map;
  } catch (e) {
    console.error('interim 로드 실패', e);
    return {};
  }
}

// 한 문장 전략 저장 — fields[] + oneSentence 모두 저장
async function saveLeaderConclusionDB(
  teamId: string,
  cardId: string,
  fields: string[],
  oneSentence: string,
) {
  try {
    await supabase.from('card_leader_conclusions').upsert({
      team_id: teamId,
      card_id: cardId,
      one_sentence: oneSentence,
      fields_json: JSON.stringify(fields),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'team_id,card_id' });
  } catch (e) {
    console.error('leader 결론 저장 실패', e);
  }
}

// 한 문장 전략 로드 — fields[] 복원
async function loadLeaderConclusionsDB(teamId: string): Promise<Record<string, LeaderConclusionState>> {
  try {
    const { data } = await supabase
      .from('card_leader_conclusions')
      .select('card_id, one_sentence, fields_json')
      .eq('team_id', teamId);
    const map: Record<string, LeaderConclusionState> = {};
    (data || []).forEach((r: any) => {
      let fields: string[] = [];
      try {
        const parsed = JSON.parse(r.fields_json || '[]');
        fields = Array.isArray(parsed) ? parsed : [];
      } catch {}
      map[r.card_id] = {
        ...defaultLeaderConclusion(),
        fields,
        oneSentence: r.one_sentence || '',
      };
    });
    return map;
  } catch (e) {
    console.error('leader 결론 로드 실패', e);
    return {};
  }
}

// Realtime 구독 - 중간 결론
function subscribeInterimConclusions(
  teamId: string,
  callback: (m: Record<string, string[]>) => void,
) {
  const channel = supabase
    .channel(`interim:${teamId}`)
    .on('postgres_changes',
      { event: '*', schema: 'public', table: 'sub_card_interim_conclusions', filter: `team_id=eq.${teamId}` },
      async () => {
        const map = await loadInterimConclusionsDB(teamId);
        callback(map);
      }
    )
    .subscribe();
  return () => { supabase.removeChannel(channel); };
}

// Realtime 구독 - 한 문장 전략
function subscribeLeaderConclusions(
  teamId: string,
  callback: (m: Record<string, LeaderConclusionState>) => void,
) {
  const channel = supabase
    .channel(`leader_conc:${teamId}`)
    .on('postgres_changes',
      { event: '*', schema: 'public', table: 'card_leader_conclusions', filter: `team_id=eq.${teamId}` },
      async () => {
        const map = await loadLeaderConclusionsDB(teamId);
        callback(map);
      }
    )
    .subscribe();
  return () => { supabase.removeChannel(channel); };
}

// Realtime 구독 - Q1/Q2/Q3 답변
function subscribeCardResponses(teamId: string, callback: (m: Record<string, any>) => void) {
  const channel = supabase
    .channel(`responses:${teamId}`)
    .on('postgres_changes',
      { event: '*', schema: 'public', table: 'card_responses', filter: `team_id=eq.${teamId}` },
      async () => {
        const map = await loadCardResponses(teamId);
        callback(map);
      }
    )
    .subscribe();
  return () => { supabase.removeChannel(channel); };
}

// ═══════════════════════════════════════════════════════
// 모바일 검사 훅
// ═══════════════════════════════════════════════════════
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);
  return isMobile;
}

// ═══════════════════════════════════════════════════════
// 인트로 애니메이션 데이터
// ═══════════════════════════════════════════════════════
function getIntroCards(isMobile: boolean) {
  const distance = isMobile ? 130 : 240;
  return Array.from({ length: 16 }, (_, i) => {
    const id = String(i + 1).padStart(2, '0');
    const angle = (360 / 16) * i - 90;
    const finalRotate = angle + 90;
    return {
      id,
      color: CARD_COLORS[id]?.bg || '#4FB0C6',
      angle,
      distance,
      x: Math.cos((angle * Math.PI) / 180) * distance,
      y: Math.sin((angle * Math.PI) / 180) * distance,
      finalRotate,
      delay: 1.4 + i * 0.03,
    };
  });
}

function getFireworkParticles(isMobile: boolean) {
  const baseDistance = isMobile ? 150 : 250;
  return Array.from({ length: isMobile ? 18 : 24 }, (_, i) => {
    const angle = (360 / (isMobile ? 18 : 24)) * i + Math.random() * 10;
    const distance = baseDistance + Math.random() * (isMobile ? 60 : 150);
    const colors = [S.green, S.aqua, '#FFC72C', '#FF6F61', '#C1A8F0', '#4FB0C6', '#FF671F', '#FFFFFF'];
    return {
      id: i,
      angle,
      distance,
      x: Math.cos((angle * Math.PI) / 180) * distance,
      y: Math.sin((angle * Math.PI) / 180) * distance,
      color: colors[i % colors.length],
      size: (isMobile ? 3 : 4) + Math.random() * 4,
      delay: Math.random() * 0.15,
    };
  });
}

// ═══════════════════════════════════════════════════════
// 메인 컴포넌트
// ═══════════════════════════════════════════════════════
export default function Home() {
  const router = useRouter();
  const isMobile = useIsMobile();

  const [screen, setScreen] = useState<'intro'|'landing'|'guide'|'game'>('intro');
  const [sessionLoading, setSessionLoading] = useState(true);
  const [introDone, setIntroDone] = useState(false);
  const [exiting, setExiting] = useState(false);

  const [item, setItem] = useState('');
  const [customItem, setCustomItem] = useState('');
  const [role, setRole] = useState<'leader'|'member'>('leader');
  const [playerName, setPlayerName] = useState('');
  const [level, setLevel] = useState('standard');
  const [roleCode, setRoleCode] = useState<RoleCode | null>(null);

  const [session, setSession] = useState<Session | null>(null);
  const [teamId, setTeamId] = useState<string | null>(null);

  // 협업 시스템 state
  const [myMemberId, setMyMemberId] = useState<string>('');
  const [teamName, setTeamName] = useState<string>('');
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [memberInsights, setMemberInsights] = useState<MemberInsight[]>([]);
  const [subCardLocks, setSubCardLocks] = useState<SubCardLock[]>([]);

  const [currentCardIdx, setCurrentCardIdx] = useState(0);
  const [currentTab, setCurrentTab] = useState<TabType>('주제');

  const [showList, setShowList] = useState(false);
  const [savedToast, setSavedToast] = useState(false);
  const [showPdfToast, setShowPdfToast] = useState(false);
  const [responses, setResponses] = useState<Record<string, any>>({});

  // ⭐ V3: interimConclusions를 string[]로 다룸
  const [interimConclusions, setInterimConclusions] = useState<Record<string, string[]>>({});
  const [leaderConclusions, setLeaderConclusions] = useState<Record<string, LeaderConclusionState>>({});
  const [completedCards, setCompletedCards] = useState<Set<string>>(new Set());
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [swipeOffset, setSwipeOffset] = useState(0);

  const [timer, setTimer] = useState(1200);
  const [timerActive, setTimerActive] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // debounce용 ref
  const interimSaveTimers = useRef<Record<string, NodeJS.Timeout>>({});
  const leaderSaveTimers = useRef<Record<string, NodeJS.Timeout>>({});

  const topic = TOPICS[currentCardIdx];
  const color = CARD_COLORS[topic.id].bg;
  const lv = LEVELS[level];
  const isLeader = role === 'leader';
  const displayItem = item === '✏️ 직접 입력' ? customItem : item;
  const currentLeaderConclusion = leaderConclusions[topic.id] || defaultLeaderConclusion();
  const isCardCompleted = completedCards.has(topic.id);

  const myRole = roleCode ? getRole(roleCode) : null;

  const introCards = getIntroCards(isMobile);
  const fireworkParticles = getFireworkParticles(isMobile);

  useEffect(() => {
    if (screen !== 'intro') return;
    const t = setTimeout(() => {
      setIntroDone(true);
      setTimeout(() => setScreen('landing'), 300);
    }, 9000);
    return () => clearTimeout(t);
  }, [screen]);

  // 데이터 로드
  useEffect(() => {
    (async () => {
      try {
        const saved = await restoreSession();
        if (saved) {
          setSession(saved); setTeamId(saved.team_id);
          setPlayerName(saved.player_name); setRole(saved.role);
          setLevel(saved.level); setItem(saved.item || '');

          if (saved.role === 'leader') {
            await ensureFirstSubCardUnlocked(saved.team_id);
          }

          const [resps, prog, members, insights, locks, interims, leaderConcs] = await Promise.all([
            loadCardResponses(saved.team_id),
            loadCardProgress(saved.team_id),
            getTeamMembers(saved.team_id),
            loadTeamInsights(saved.team_id),
            loadSubCardLocks(saved.team_id),
            loadInterimConclusionsDB(saved.team_id),
            loadLeaderConclusionsDB(saved.team_id),
          ]);
          setResponses(resps);
          setCompletedCards(prog.completedCards);
          setTeamMembers(members);
          setMemberInsights(insights);
          setSubCardLocks(locks);
          setInterimConclusions(interims);
          setLeaderConclusions(leaderConcs);

          const myMember = members.find(m => m.name === saved.player_name);
          if (myMember) setMyMemberId(myMember.id);

          setTimer(LEVELS[saved.level]?.timer || 1200);
          setScreen('game');
          setSessionLoading(false);
          return;
        }

        const v2Raw = typeof window !== 'undefined' ? localStorage.getItem('dtc_session_token_v2') : null;
        if (v2Raw) {
          const v2 = JSON.parse(v2Raw);
          const v2Role: 'leader' | 'member' = v2.isLeader ? 'leader' : 'member';
          const v2Level = v2.level || 'standard';
          const sess = await getOrCreateSession({
            playerName: v2.memberName,
            teamId: v2.teamId,
            role: v2Role,
            level: v2Level,
            item: v2.item || '',
          });
          if (sess) {
            setSession(sess); setTeamId(v2.teamId);
            setPlayerName(v2.memberName); setRole(v2Role);
            setLevel(v2Level); setItem(v2.item || '');
            if (v2.roleCode) setRoleCode(v2.roleCode as RoleCode);

            if (v2.memberId) setMyMemberId(v2.memberId);
            if (v2.teamName) setTeamName(v2.teamName);

            if (v2.isLeader) {
              await ensureFirstSubCardUnlocked(v2.teamId);
            }

            const [resps, prog, members, insights, locks, interims, leaderConcs] = await Promise.all([
              loadCardResponses(v2.teamId),
              loadCardProgress(v2.teamId),
              getTeamMembers(v2.teamId),
              loadTeamInsights(v2.teamId),
              loadSubCardLocks(v2.teamId),
              loadInterimConclusionsDB(v2.teamId),
              loadLeaderConclusionsDB(v2.teamId),
            ]);
            setResponses(resps);
            setCompletedCards(prog.completedCards);
            setTeamMembers(members);
            setMemberInsights(insights);
            setSubCardLocks(locks);
            setInterimConclusions(interims);
            setLeaderConclusions(leaderConcs);
            setTimer(LEVELS[v2Level]?.timer || 1200);
            setScreen('game');
            setSessionLoading(false);
            return;
          }
        }

        setSessionLoading(false);
      } catch (e) {
        setSessionLoading(false);
      }
    })();
  }, []);

  // ⭐ Realtime 구독: 5종류 (인사이트/잠금/답변/중간결론/한문장전략)
  useEffect(() => {
    if (screen !== 'game' || !teamId) return;

    const unsubInsights = subscribeToTeamInsights(teamId, (insights) => {
      setMemberInsights(insights);
    });

    const unsubLocks = subscribeToSubCardLocks(teamId, (locks) => {
      setSubCardLocks(locks);
    });

    const unsubResponses = subscribeCardResponses(teamId, (resps) => {
      setResponses(resps);
    });

    const unsubInterims = subscribeInterimConclusions(teamId, (interims) => {
      // ⭐ merge: DB 데이터 + 저장 미반영 로컬 데이터 보호
      setInterimConclusions(prev => ({ ...prev, ...interims }));
    });

    const unsubLeaderConcs = subscribeLeaderConclusions(teamId, (leaderConcs) => {
      setLeaderConclusions(prev => {
        const merged = { ...prev };
        Object.keys(leaderConcs).forEach(cardId => {
          merged[cardId] = {
            ...defaultLeaderConclusion(),
            ...merged[cardId],
            fields: leaderConcs[cardId].fields || [],
            oneSentence: leaderConcs[cardId].oneSentence,
          };
        });
        return merged;
      });
    });

    return () => {
      unsubInsights();
      unsubLocks();
      unsubResponses();
      unsubInterims();
      unsubLeaderConcs();
    };
  }, [screen, teamId]);

  // ⭐ Realtime 보완 — 카드 변경 시 + 5초마다 데이터 강제 새로고침
  // (Realtime 이벤트 누락이나 지연 대비, 자기 입력 중 데이터는 보호)
  useEffect(() => {
    if (!teamId || screen !== 'game') return;

    const refetchAll = async () => {
      try {
        const [interims, leaderConcs] = await Promise.all([
          loadInterimConclusionsDB(teamId),
          loadLeaderConclusionsDB(teamId),
        ]);

        // interim 갱신 (저장 대기 중인 항목은 자기 데이터 유지)
        setInterimConclusions(prev => {
          const result: Record<string, string[]> = { ...interims };
          Object.keys(interimSaveTimers.current).forEach(subCardId => {
            if (prev[subCardId]) result[subCardId] = prev[subCardId];
          });
          return result;
        });

        // leader 갱신 (저장 대기 중인 항목은 자기 데이터 유지)
        setLeaderConclusions(prev => {
          const merged: Record<string, LeaderConclusionState> = {};
          Object.keys(leaderConcs).forEach(cardId => {
            merged[cardId] = {
              ...defaultLeaderConclusion(),
              fields: leaderConcs[cardId].fields || [],
              oneSentence: leaderConcs[cardId].oneSentence,
            };
          });
          Object.keys(leaderSaveTimers.current).forEach(cardId => {
            if (prev[cardId]) merged[cardId] = prev[cardId];
          });
          return merged;
        });
      } catch (e) {
        console.error('데이터 새로고침 실패', e);
      }
    };

    refetchAll(); // 카드 변경 시 즉시
    const interval = setInterval(refetchAll, 5000); // 5초 폴링
    return () => clearInterval(interval);
  }, [topic.id, screen, teamId]);

  useEffect(() => {
    if (timerActive && timer > 0) {
      timerRef.current = setInterval(() => setTimer(t => t - 1), 1000);
      return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }
    if (timer <= 0 && timerRef.current) clearInterval(timerRef.current);
  }, [timerActive, timer]);

  // ⭐ 카드 이동 전 모든 pending save 즉시 실행 (저장 못한 데이터 보호)
  const flushPendingSaves = useCallback(() => {
    if (!teamId) return;

    // interim pending saves 즉시 실행
    Object.entries(interimSaveTimers.current).forEach(([subCardId, timer]) => {
      clearTimeout(timer);
      const values = interimConclusions[subCardId];
      if (values && values.length > 0) {
        saveInterimConclusionDB(teamId, subCardId, values);
      }
    });
    interimSaveTimers.current = {};

    // leader pending saves 즉시 실행
    Object.entries(leaderSaveTimers.current).forEach(([cardId, timer]) => {
      clearTimeout(timer);
      const lc = leaderConclusions[cardId];
      if (lc) {
        saveLeaderConclusionDB(teamId, cardId, lc.fields || [], lc.oneSentence || '');
      }
    });
    leaderSaveTimers.current = {};
  }, [teamId, interimConclusions, leaderConclusions]);

  const goToCard = useCallback((idx: number) => {
    if (idx >= 0 && idx < TOPICS.length) {
      // ⭐ 이전 카드의 pending save 즉시 실행 (이동 전에 데이터 보호)
      flushPendingSaves();
      setCurrentCardIdx(idx);
      setCurrentTab('주제');
      setSwipeOffset(0);
    }
  }, [flushPendingSaves]);

  const handleSaveResponse = async (cardId: string, text: string) => {
    setResponses(prev => ({ ...prev, [cardId]: { texts: { '0': text }, images: {} } }));
    if (session && teamId) {
      await saveCardResponse({ teamId, sessionId: session.id, cardId, texts: { '0': text } });
    }
  };

  // ⭐ 중간 결론 저장 — 빈칸 채우기 values 배열
  const handleSaveInterim = (cardId: string, values: string[]) => {
    setInterimConclusions(prev => ({ ...prev, [cardId]: values }));

    if (!teamId) return;
    if (interimSaveTimers.current[cardId]) {
      clearTimeout(interimSaveTimers.current[cardId]);
    }
    interimSaveTimers.current[cardId] = setTimeout(() => {
      saveInterimConclusionDB(teamId, cardId, values);
    }, 200);  // ⚡ 200ms로 단축 (빠른 이동 시 저장 보호)
  };

  // ⭐ 한 문장 전략 변경 (fields 배열 또는 oneSentence)
  const handleLeaderConclusionChange = (key: keyof LeaderConclusionState, value: any) => {
    setLeaderConclusions(prev => {
      const existing = prev[topic.id] || defaultLeaderConclusion();
      const updated = { ...existing, [key]: value };

      // ⭐ fields 변경 시 oneSentence도 자동으로 합성 (팀원 동기화 강화)
      if (key === 'fields' && Array.isArray(value)) {
        const parts = topic.finalStrategyTemplate.split('___');
        let composed = '';
        for (let i = 0; i < parts.length; i++) {
          composed += parts[i];
          if (i < parts.length - 1) {
            composed += value[i] || '___';
          }
        }
        updated.oneSentence = composed;
      }

      const next = {
        ...prev,
        [topic.id]: updated,
      };

      // fields 변경 시 DB 저장 (debounced)
      if ((key === 'fields' || key === 'oneSentence') && teamId) {
        const cardId = topic.id;
        if (leaderSaveTimers.current[cardId]) {
          clearTimeout(leaderSaveTimers.current[cardId]);
        }
        leaderSaveTimers.current[cardId] = setTimeout(() => {
          const state = next[cardId];
          saveLeaderConclusionDB(
            teamId,
            cardId,
            state.fields || [],
            state.oneSentence || '',
          );
        }, 200);  // ⚡ 200ms로 단축
      }

      return next;
    });
  };

  // ⭐ 카드 이동 전 모든 pending save 즉시 실행 (저장 못한 데이터 보호)
  const handleComplete = async () => {
    setCompletedCards(prev => new Set([...prev, topic.id]));
    setSavedToast(true); setTimeout(() => setSavedToast(false), 2000);
    if (session && teamId) {
      // ⭐ 모든 pending save 즉시 실행 (저장 누락 방지)
      flushPendingSaves();
      await saveCardProgress({ teamId, sessionId: session.id, cardId: topic.id, checklistStatus: {}, completed: true });
      // 한 문장 전략 즉시 저장 (다시 한번 보장)
      const lc = leaderConclusions[topic.id] || defaultLeaderConclusion();
      if (lc.fields && lc.fields.length > 0) {
        await saveLeaderConclusionDB(teamId, topic.id, lc.fields, lc.oneSentence || '');
      }
    }

    // 다음 카드 Q1 잠금 해제
    if (teamId && currentCardIdx < TOPICS.length - 1) {
      const nextTopicId = TOPICS[currentCardIdx + 1].id;
      const nextSubCardId = `${nextTopicId}-1`;
      await leaderCompleteSubCard({
        teamId,
        subCardId: `${topic.id}-3`,
        nextSubCardId,
      });
      setTimeout(() => goToCard(currentCardIdx + 1), 1000);
    }
  };

  // 팀장 Q1/Q2/Q3 완료
  const handleLeaderCompleteSubCard = useCallback(async (subCardId: string) => {
    if (!teamId || !isLeader) return;

    // 완료 직전 interim 즉시 저장
    const currentValues = interimConclusions[subCardId] || [];
    if (currentValues.length > 0) {
      await saveInterimConclusionDB(teamId, subCardId, currentValues);
    }

    const nextSubCardId = getNextSubCardId(subCardId);
    await leaderCompleteSubCard({ teamId, subCardId, nextSubCardId });

    const qNum = parseInt(subCardId.split('-')[1], 10);
    if (qNum === 1) setCurrentTab('Q2');
    else if (qNum === 2) setCurrentTab('Q3');
    else if (qNum === 3) setCurrentTab('결론');
  }, [teamId, isLeader, interimConclusions]);

  const onTouchStart = (e: React.TouchEvent) => setTouchStart(e.touches[0].clientX);
  const onTouchMove = (e: React.TouchEvent) => { if (touchStart !== null) setSwipeOffset(e.touches[0].clientX - touchStart); };
  const onTouchEnd = () => {
    if (Math.abs(swipeOffset) > 80) {
      if (swipeOffset < 0 && currentCardIdx < TOPICS.length - 1) goToCard(currentCardIdx + 1);
      if (swipeOffset > 0 && currentCardIdx > 0) goToCard(currentCardIdx - 1);
    }
    setSwipeOffset(0); setTouchStart(null);
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (screen !== 'game') return;
      if (e.key === 'ArrowRight') goToCard(currentCardIdx + 1);
      if (e.key === 'ArrowLeft') goToCard(currentCardIdx - 1);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [currentCardIdx, goToCard, screen]);

  const exitGame = () => {
    localStorage.removeItem('dtc_session_token');
    localStorage.removeItem('dtc_session_token_v2');
    if (timerRef.current) clearInterval(timerRef.current);
    setTimerActive(false);
    router.push('/student/join');
  };

  const handleStartClick = (path: string) => {
    setExiting(true);
    setTimeout(() => router.push(path), 600);
  };

  if (sessionLoading) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-500 font-mono text-sm">불러오는 중...</p>
    </div>
  );

  // ─── INTRO 화면 ───
  if (screen === 'intro') {
    const cardOneW = isMobile ? 70 : 110;
    const cardOneH = isMobile ? 100 : 155;
    const cardW = isMobile ? 42 : 60;
    const cardH = isMobile ? 60 : 84;
    const containerH = isMobile ? 400 : 600;

    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 md:p-6 relative overflow-hidden"
        style={{
          opacity: introDone ? 0 : 1,
          transition: 'opacity 0.3s ease-out',
        }}>

        <div className="relative w-full flex items-center justify-center"
          style={{ height: `${containerH}px`, maxWidth: '100%' }}>

          {[0, 1, 2, 3].map(i => (
            <div key={`pulse-${i}`} className="absolute signal-pulse-ring pointer-events-none"
              style={{
                width: `${isMobile ? 140 : 280}px`,
                height: `${isMobile ? 140 : 280}px`,
                top: '50%',
                left: '50%',
                borderRadius: '50%',
                border: `2px solid ${i % 2 === 0 ? S.cyan : S.purple}`,
                boxShadow: `0 0 20px ${i % 2 === 0 ? S.cyan : S.purple}AA, inset 0 0 20px ${i % 2 === 0 ? S.cyan : S.purple}44`,
                zIndex: 5,
                animationDelay: `${1.4 + i * 0.6}s, 0s`,
              }} />
          ))}

          <div className="absolute card-aurora-glow pointer-events-none"
            style={{
              width: `${cardOneW * 3}px`,
              height: `${cardOneW * 3}px`,
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              borderRadius: '50%',
              background: `radial-gradient(circle, ${S.cyan}33 0%, ${S.purple}22 35%, ${S.blue}11 60%, transparent 80%)`,
              filter: 'blur(20px)',
              zIndex: 4,
            }} />

          <div className="absolute cube-inner-card pointer-events-none"
            style={{
              width: `${cardOneW}px`,
              height: `${cardOneH}px`,
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              borderRadius: '8px',
              background: `linear-gradient(135deg, ${S.cyan}EE, ${S.purple}EE)`,
              border: `2px solid #FFFFFF`,
              boxShadow: `0 0 30px ${S.cyan}, 0 0 60px ${S.cyan}88, inset 0 0 20px rgba(255,255,255,0.3)`,
              opacity: 0,
              zIndex: 20,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'column',
              fontFamily: 'monospace',
              color: '#FFFFFF',
              textShadow: '0 0 8px rgba(255,255,255,0.8)',
            }}>
            <span style={{ fontSize: isMobile ? '9px' : '12px', opacity: 0.9, letterSpacing: '2px' }}>SIGNAL</span>
            <span style={{ fontSize: isMobile ? '24px' : '36px', fontWeight: 900, marginTop: '4px' }}>?</span>
          </div>

          {fireworkParticles.map(p => (
            <div
              key={p.id}
              className="absolute rounded-full"
              style={{
                top: '50%',
                left: '50%',
                width: `${p.size}px`,
                height: `${p.size}px`,
                background: p.color,
                boxShadow: `0 0 ${p.size * 4}px ${p.color}`,
                animation: `particleBurst 1.8s cubic-bezier(0.16, 1, 0.3, 1) ${3.8 + p.delay}s forwards`,
                opacity: 0,
                '--burst-x': `${p.x}px`,
                '--burst-y': `${p.y}px`,
                transform: 'translate(-50%, -50%)',
                zIndex: 20,
              } as React.CSSProperties}
            />
          ))}

          {introCards.map((card, i) => (
            <div
              key={card.id}
              className="absolute rounded-xl flex flex-col items-center justify-center text-white font-black"
              style={{
                top: '50%',
                left: '50%',
                width: `${cardW}px`,
                height: `${cardH}px`,
                background: card.color,
                boxShadow: `0 8px 24px ${card.color}66, 0 0 30px ${card.color}55`,
                animation: `cardElegantSpread 2.5s cubic-bezier(0.16, 1, 0.3, 1) ${3.8 + card.delay}s forwards, cardDimAndBrighten 3s ease-in-out 6.5s forwards`,
                transformOrigin: 'center center',
                transform: 'translate(-50%, -50%) scale(0)',
                opacity: 0,
                '--final-x': `${card.x}px`,
                '--final-y': `${card.y}px`,
                '--final-rotate': `${card.finalRotate}deg`,
                zIndex: 15,
              } as React.CSSProperties}
            >
              <span style={{ fontSize: isMobile ? '7px' : '9px', fontFamily: 'monospace', opacity: 0.8 }}>CARD</span>
              <span style={{ fontSize: isMobile ? '11px' : '14px', fontFamily: 'monospace' }}>{card.id}</span>
            </div>
          ))}
        </div>

        <div className="absolute pointer-events-none light-burst"
          style={{
            top: '50%',
            left: '50%',
            width: isMobile ? '300px' : '450px',
            height: isMobile ? '300px' : '450px',
            background: 'radial-gradient(circle, #FFFFFF 0%, #06B6D4 40%, #8B5CF6 70%, transparent 100%)',
            borderRadius: '50%',
            opacity: 0,
            zIndex: 25,
            filter: 'blur(6px)',
          }} />

        <div className="absolute pointer-events-none aurora-halo"
          style={{
            top: '50%',
            left: '50%',
            width: isMobile ? '700px' : '1100px',
            height: isMobile ? '700px' : '1100px',
            background: 'radial-gradient(circle, #06B6D455 0%, #8B5CF633 30%, #3B82F622 60%, transparent 85%)',
            borderRadius: '50%',
            opacity: 0,
            zIndex: 27,
            filter: 'blur(40px)',
          }} />

        <div className="absolute inset-0 flex items-center justify-center pointer-events-none"
          style={{
            opacity: 0,
            animation: 'introLogoFade 1.2s ease-out 7.0s forwards',
            zIndex: 30,
          }}>
          <div className="text-center relative">
            <p className="text-[10px] md:text-[12px] tracking-[5px] md:tracking-[7px] uppercase mb-2 md:mb-3 font-mono font-bold relative"
              style={{ color: '#06B6D4', textShadow: '0 0 12px #06B6D4AA' }}>
              ConnectAI
            </p>
            <h1 className="font-black text-white tracking-tight mb-2 md:mb-3 relative logo-glow-text"
              style={{
                fontSize: isMobile ? '4rem' : '7rem',
                lineHeight: 1,
                textShadow: `0 0 20px #FFFFFFAA, 0 0 40px #06B6D488, 0 0 80px #8B5CF666, 0 0 120px #3B82F644`,
              }}>
              SIGNAL
            </h1>
            <div className="flex items-center justify-center gap-2 md:gap-3 relative">
              <div className="h-[1px] w-8 md:w-12" style={{ background: `linear-gradient(to right, transparent, #06B6D4)` }} />
              <p className="text-[12px] md:text-base font-bold tracking-[2px] md:tracking-[3px] font-mono"
                style={{ color: '#C1E8EB', textShadow: '0 0 12px #06B6D466' }}>
                DIGITAL TRADE CARDS
              </p>
              <div className="h-[1px] w-8 md:w-12" style={{ background: `linear-gradient(to left, transparent, #8B5CF6)` }} />
            </div>
          </div>
        </div>

        <style jsx>{`
          .signal-pulse-ring {
            opacity: 0;
            transform: translate(-50%, -50%) scale(0);
            animation: signalPulseExpand 2.5s ease-out infinite, signalPulseFinalHide 0.3s ease-out 3.6s forwards;
          }
          @keyframes signalPulseExpand {
            0% { transform: translate(-50%, -50%) scale(0.3); opacity: 0; }
            15% { opacity: 0.8; }
            100% { transform: translate(-50%, -50%) scale(2.5); opacity: 0; }
          }
          @keyframes signalPulseFinalHide {
            0% { opacity: 0; }
            100% { opacity: 0; visibility: hidden; }
          }
          .card-aurora-glow {
            opacity: 0;
            animation: auroraGlowEnter 1.2s ease-out 1.2s forwards, auroraGlowPulse 2.5s ease-in-out 2.4s 1, auroraGlowFinalHide 0.6s ease-in 3.6s forwards;
          }
          @keyframes auroraGlowEnter {
            0% { opacity: 0; transform: translate(-50%, -50%) scale(0.5); }
            100% { opacity: 0.7; transform: translate(-50%, -50%) scale(1); }
          }
          @keyframes auroraGlowPulse {
            0%, 100% { opacity: 0.6; transform: translate(-50%, -50%) scale(1); }
            50% { opacity: 1; transform: translate(-50%, -50%) scale(1.15); }
          }
          @keyframes auroraGlowFinalHide {
            0% { opacity: 0.6; transform: translate(-50%, -50%) scale(1); }
            40% { opacity: 1; transform: translate(-50%, -50%) scale(1.6); filter: brightness(2); }
            100% { opacity: 0; transform: translate(-50%, -50%) scale(2.2); filter: brightness(3); visibility: hidden; }
          }
          .cube-inner-card {
            animation: cubeInnerCardEnter 1s ease-out 1.4s forwards, cubeInnerCardPulse 1.4s ease-in-out 2.4s infinite, cubeInnerCardExplode 0.6s ease-in 3.6s forwards;
          }
          @keyframes cubeInnerCardEnter {
            0% { opacity: 0; transform: translate(-50%, -50%) scale(0) rotate(-180deg); }
            60% { opacity: 1; transform: translate(-50%, -50%) scale(1.15) rotate(10deg); }
            100% { opacity: 1; transform: translate(-50%, -50%) scale(1) rotate(0deg); }
          }
          @keyframes cubeInnerCardPulse {
            0%, 100% { box-shadow: 0 0 30px ${S.cyan}, 0 0 60px ${S.cyan}88, inset 0 0 20px rgba(255,255,255,0.3); }
            50% { box-shadow: 0 0 50px #FFFFFF, 0 0 90px ${S.cyan}, inset 0 0 30px rgba(255,255,255,0.6); }
          }
          @keyframes cubeInnerCardExplode {
            0% { opacity: 1; transform: translate(-50%, -50%) scale(1); filter: brightness(1); }
            100% { opacity: 0; transform: translate(-50%, -50%) scale(2.5); filter: brightness(8); }
          }
          @keyframes cardElegantSpread {
            0% { opacity: 0; transform: translate(-50%, -50%) scale(0.3) rotate(0deg); }
            15% { opacity: 1; transform: translate(-50%, -50%) scale(1.1) rotate(0deg); }
            60% {
              opacity: 1;
              transform: translate(calc(-50% + var(--final-x) * 0.85), calc(-50% + var(--final-y) * 0.85)) scale(1.05) rotate(calc(var(--final-rotate) * 0.85));
            }
            100% {
              opacity: 1;
              transform: translate(calc(-50% + var(--final-x)), calc(-50% + var(--final-y))) scale(1) rotate(var(--final-rotate));
            }
          }
          @keyframes cardDimAndBrighten {
            0% { filter: brightness(1); }
            30% { filter: brightness(0.4); }
            60% { filter: brightness(0.4); }
            100% { filter: brightness(1.1); }
          }
          @keyframes particleBurst {
            0% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
            20% { opacity: 1; transform: translate(calc(-50% + var(--burst-x) * 0.3), calc(-50% + var(--burst-y) * 0.3)) scale(1.5); }
            100% { opacity: 0; transform: translate(calc(-50% + var(--burst-x)), calc(-50% + var(--burst-y))) scale(0.3); }
          }
          @keyframes introLogoFade {
            0% { opacity: 0; transform: scale(0.92); }
            100% { opacity: 1; transform: scale(1); }
          }
          .logo-glow-text { animation: logoGlowPulse 3s ease-in-out 8s infinite; }
          @keyframes logoGlowPulse {
            0%, 100% { text-shadow: 0 0 20px #FFFFFFAA, 0 0 40px #06B6D488, 0 0 80px #8B5CF666; }
            50% { text-shadow: 0 0 30px #FFFFFFFF, 0 0 60px #06B6D4DD, 0 0 100px #8B5CF688; }
          }
          .light-burst {
            transform: translate(-50%, -50%) scale(0.05);
            animation: lightBurstScale 0.8s ease-out 6.5s forwards;
          }
          @keyframes lightBurstScale {
            0% { opacity: 0; transform: translate(-50%, -50%) scale(0.05); }
            40% { opacity: 1; transform: translate(-50%, -50%) scale(0.7); }
            100% { opacity: 0; transform: translate(-50%, -50%) scale(1); }
          }
          .aurora-halo {
            transform: translate(-50%, -50%) scale(0.05);
            animation: auroraHaloScale 2.2s ease-out 6.7s forwards;
          }
          @keyframes auroraHaloScale {
            0% { opacity: 0; transform: translate(-50%, -50%) scale(0.05); }
            50% { opacity: 1; transform: translate(-50%, -50%) scale(0.75); }
            100% { opacity: 0.7; transform: translate(-50%, -50%) scale(1); }
          }
        `}</style>
      </div>
    );
  }

  // ─── LANDING 화면 ───
  if (screen === 'landing') return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 md:p-6 relative overflow-hidden"
      style={{
        opacity: exiting ? 0 : 1,
        transform: exiting ? 'scale(1.5)' : 'scale(1)',
        transition: 'all 0.6s cubic-bezier(0.7, 0, 0.84, 0)',
        filter: exiting ? 'blur(8px)' : 'blur(0)',
      }}>

      {/* ⭐ 사이버틱 회로 신호 라인 */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
        <div className="absolute landing-circuit-1"
          style={{
            top: '15%', left: 0, width: '80px', height: '2px',
            background: `linear-gradient(90deg, transparent, ${S.green}, transparent)`,
            boxShadow: `0 0 12px ${S.green}, 0 0 20px ${S.green}66`,
          }} />
        <div className="absolute landing-circuit-2"
          style={{
            top: '50%', right: 0, width: '100px', height: '2px',
            background: `linear-gradient(90deg, transparent, ${S.aqua}, transparent)`,
            boxShadow: `0 0 12px ${S.aqua}, 0 0 20px ${S.aqua}66`,
          }} />
        <div className="absolute landing-circuit-3"
          style={{
            top: '80%', left: 0, width: '60px', height: '2px',
            background: `linear-gradient(90deg, transparent, ${S.green}, transparent)`,
            boxShadow: `0 0 12px ${S.green}, 0 0 20px ${S.green}66`,
          }} />
        <div className="absolute landing-circuit-vertical"
          style={{
            left: '20%', top: 0, width: '2px', height: '60px',
            background: `linear-gradient(180deg, transparent, ${S.aqua}, transparent)`,
            boxShadow: `0 0 12px ${S.aqua}, 0 0 20px ${S.aqua}66`,
          }} />
      </div>

      {/* ⭐ 카드 색상 기반 그라디언트 배경 */}
      <div className="fixed inset-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(circle at 15% 25%, #00A9E020 0%, transparent 45%),
            radial-gradient(circle at 85% 30%, #003DA520 0%, transparent 50%),
            radial-gradient(circle at 50% 60%, #00B5AD18 0%, transparent 55%),
            radial-gradient(circle at 25% 80%, #582C8320 0%, transparent 50%),
            radial-gradient(circle at 80% 90%, #FFC72C12 0%, transparent 45%)
          `,
        }} />

      {/* ⭐ 스캔라인 */}
      <div className="fixed inset-0 pointer-events-none landing-scanline"
        style={{
          background: `linear-gradient(to bottom, transparent 0%, ${S.green}06 50%, transparent 100%)`,
          height: '120px',
        }} />

      {/* ⭐ 네온 파티클 */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {Array.from({ length: 20 }).map((_, i) => {
          const colors = [S.green, S.aqua, '#C1A8F0'];
          const left = (i * 7 + 13) % 100;
          const top = (i * 13 + 7) % 100;
          const size = 1.5 + (i % 3) * 0.5;
          const duration = 4 + (i % 4);
          const delay = (i % 5) * 0.7;
          return (
            <div key={i} className="absolute rounded-full landing-neon-particle"
              style={{
                left: `${left}%`, top: `${top}%`,
                width: `${size}px`, height: `${size}px`,
                background: colors[i % 3],
                boxShadow: `0 0 ${size * 4}px ${colors[i % 3]}`,
                animationDuration: `${duration}s`,
                animationDelay: `${delay}s`,
              }} />
          );
        })}
      </div>

      {/* ⭐ 4개 코너 L자 장식 */}
      <div className="fixed top-4 left-4 pointer-events-none z-0">
        <div className="w-12 h-12 relative">
          <div className="absolute top-0 left-0 w-6 h-[2px]" style={{ background: S.green, boxShadow: `0 0 8px ${S.green}` }} />
          <div className="absolute top-0 left-0 w-[2px] h-6" style={{ background: S.green, boxShadow: `0 0 8px ${S.green}` }} />
        </div>
      </div>
      <div className="fixed top-4 right-4 pointer-events-none z-0">
        <div className="w-12 h-12 relative">
          <div className="absolute top-0 right-0 w-6 h-[2px]" style={{ background: S.aqua, boxShadow: `0 0 8px ${S.aqua}` }} />
          <div className="absolute top-0 right-0 w-[2px] h-6" style={{ background: S.aqua, boxShadow: `0 0 8px ${S.aqua}` }} />
        </div>
      </div>
      <div className="fixed bottom-4 left-4 pointer-events-none z-0">
        <div className="w-12 h-12 relative">
          <div className="absolute bottom-0 left-0 w-6 h-[2px]" style={{ background: S.aqua, boxShadow: `0 0 8px ${S.aqua}` }} />
          <div className="absolute bottom-0 left-0 w-[2px] h-6" style={{ background: S.aqua, boxShadow: `0 0 8px ${S.aqua}` }} />
        </div>
      </div>
      <div className="fixed bottom-4 right-4 pointer-events-none z-0">
        <div className="w-12 h-12 relative">
          <div className="absolute bottom-0 right-0 w-6 h-[2px]" style={{ background: S.green, boxShadow: `0 0 8px ${S.green}` }} />
          <div className="absolute bottom-0 right-0 w-[2px] h-6" style={{ background: S.green, boxShadow: `0 0 8px ${S.green}` }} />
        </div>
      </div>

      <div className="relative z-10 text-center max-w-md w-full">
        <p className="text-[10px] md:text-[11px] tracking-[4px] md:tracking-[6px] uppercase mb-3 md:mb-4 font-mono font-bold landing-connectai"
          style={{ color: S.green, textShadow: `0 0 10px ${S.green}AA` }}>
          ConnectAI
        </p>

        {/* ⭐ 글리치 효과 적용된 SIGNAL 로고 */}
        <h1 className="text-5xl md:text-6xl font-black text-white mb-2 tracking-tight landing-glitch-text relative inline-block"
          style={{ textShadow: `0 0 20px ${S.green}66, 0 0 40px ${S.aqua}33` }}>
          SIGNAL
        </h1>

        <div className="flex items-center justify-center gap-2 mb-2">
          <div className="w-1 h-1 rounded-full" style={{ background: S.green, boxShadow: `0 0 6px ${S.green}` }} />
          <p className="text-[12px] md:text-[13px] font-mono font-bold tracking-[2px]"
            style={{ color: S.aqua, textShadow: `0 0 8px ${S.aqua}66` }}>
            DIGITAL TRADE CARDS
          </p>
          <div className="w-1 h-1 rounded-full" style={{ background: S.aqua, boxShadow: `0 0 6px ${S.aqua}` }} />
        </div>
        <p className="text-gray-400 text-[12px] md:text-[13px] mb-6 md:mb-8 leading-relaxed px-2">
          디지털 무역 전략을 직접 만들어보는<br />체험형 카드게임 학습 플랫폼
        </p>

        {/* 카드 5개 — 사용자 요청에 따라 그대로 유지 */}
        <div className="flex justify-center gap-2 md:gap-3 mb-8 md:mb-10">
          {['01','02','03','04','05'].map((id, i) => (
            <div key={id} className="relative rounded-xl overflow-hidden"
              style={{
                width: isMobile ? '40px' : '48px',
                height: isMobile ? '56px' : '64px',
                background: CARD_COLORS[id].bg,
                transform: `rotate(${(i-2)*6}deg)`,
                boxShadow: `0 4px 20px ${CARD_COLORS[id].bg}66`,
              }}>
              <div className="absolute inset-0 flex items-center justify-center text-white text-[10px] md:text-[11px] font-black font-mono"
                style={{ textShadow: '0 0 8px rgba(255,255,255,0.8)' }}>
                {id}
              </div>
            </div>
          ))}
        </div>

        {/* ⭐ 학생 입장 버튼 - 네온 펄스 효과 */}
        <button onClick={() => handleStartClick('/student/join')}
          className="relative w-full py-3.5 md:py-4 font-black rounded-2xl text-[15px] md:text-base mb-3 transition-all hover:scale-[1.02] landing-cta-btn overflow-hidden group"
          style={{
            background: S.green,
            color: S.navy,
            boxShadow: `0 0 30px ${S.green}66, 0 10px 30px -5px ${S.green}88`,
            border: `1px solid ${S.green}`,
          }}>
          <span className="relative z-10 tracking-wider">{`>`} 학생으로 입장 →</span>
          <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700"
            style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%)' }} />
        </button>

        <button onClick={() => handleStartClick('/teacher')}
          className="relative w-full py-3 md:py-3.5 font-bold rounded-2xl text-[13px] md:text-[14px] transition-all hover:scale-[1.01] mb-3"
          style={{
            background: 'rgba(6, 182, 212, 0.08)',
            border: `1px solid #06B6D466`,
            color: '#06B6D4',
            textShadow: '0 0 8px #06B6D466',
          }}>
          {`>`} 관리자 로그인
        </button>

        <button onClick={() => setScreen('guide')}
          className="relative w-full py-3 md:py-3.5 rounded-2xl text-[13px] md:text-[14px] font-bold transition-all hover:scale-[1.01]"
          style={{
            background: 'rgba(139, 92, 246, 0.08)',
            border: `1px solid #8B5CF666`,
            color: '#8B5CF6',
            textShadow: '0 0 8px #8B5CF666',
          }}>
          {`>`} 퍼실리테이터 가이드
        </button>

        <p className="text-gray-700 text-[10px] mt-6 md:mt-8 font-mono">© 2026 SIGNAL — ConnectAI</p>
      </div>

      {/* ⭐ 사이버틱 효과 CSS */}
      <style jsx>{`
        .landing-circuit-1 { animation: landingSignalRight 4s linear infinite; }
        @keyframes landingSignalRight {
          0% { transform: translateX(-80px); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateX(100vw); opacity: 0; }
        }
        .landing-circuit-2 { animation: landingSignalLeft 5s linear infinite 1s; }
        @keyframes landingSignalLeft {
          0% { transform: translateX(100px); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateX(-100vw); opacity: 0; }
        }
        .landing-circuit-3 { animation: landingSignalRight 6s linear infinite 2s; }
        .landing-circuit-vertical { animation: landingSignalDown 5s linear infinite 0.5s; }
        @keyframes landingSignalDown {
          0% { transform: translateY(-60px); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateY(100vh); opacity: 0; }
        }
        .landing-scanline { animation: landingScanlineMove 4s linear infinite; }
        @keyframes landingScanlineMove {
          0% { transform: translateY(-120px); }
          100% { transform: translateY(100vh); }
        }
        .landing-neon-particle {
          animation-name: landingNeonTwinkle;
          animation-iteration-count: infinite;
          animation-timing-function: ease-in-out;
        }
        @keyframes landingNeonTwinkle {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.5); }
        }
        .landing-glitch-text { animation: landingGlitchPulse 5s ease-in-out infinite; }
        @keyframes landingGlitchPulse {
          0%, 100% {
            text-shadow: 0 0 20px rgba(231, 254, 85, 0.4), 0 0 40px rgba(193, 232, 235, 0.2);
          }
          50% {
            text-shadow:
              -1px 0 0 rgba(193, 232, 235, 0.7),
              1px 0 0 rgba(231, 254, 85, 0.7),
              0 0 30px rgba(231, 254, 85, 0.6),
              0 0 60px rgba(193, 232, 235, 0.3);
          }
        }
        .landing-cta-btn { animation: landingBtnNeonPulse 2.5s ease-in-out infinite; }
        @keyframes landingBtnNeonPulse {
          0%, 100% { box-shadow: 0 0 20px rgba(231, 254, 85, 0.4), 0 10px 30px -5px rgba(231, 254, 85, 0.5); }
          50% { box-shadow: 0 0 40px rgba(231, 254, 85, 0.7), 0 10px 40px -5px rgba(231, 254, 85, 0.8); }
        }
      `}</style>
    </div>
  );

  // ─── GUIDE 화면 ───
  if (screen === 'guide') return (
    <div className="min-h-screen px-3 md:px-4 py-4 md:py-6 overflow-auto">
      <div className="max-w-2xl mx-auto">
        <button onClick={() => setScreen('landing')} className="text-gray-600 text-sm mb-3 md:mb-4">← 돌아가기</button>
        <div className="rounded-2xl p-4 md:p-6 mb-4 md:mb-6" style={{ background: `${S.green}08`, border: `1px solid ${S.green}20` }}>
          <p className="text-[10px] font-mono tracking-widest mb-2" style={{ color: S.green }}>FACILITATOR GUIDE</p>
          <h2 className="text-lg md:text-xl font-black text-white mb-1">퍼실리테이터 운영 가이드</h2>
          <p className="text-[11px] md:text-[12px] text-gray-500">카드 01 기준 · 45~60분 · 팀별 4~6명</p>
        </div>
        {[
          { time: '0–5분',   step: '주제 탭 — 카드 개념 확인', icon: '🎯', color: '#534AB7', tip: '주제 탭을 프로젝터에 띄워 핵심 통찰 질문을 함께 읽으세요.' },
          { time: '5–25분',  step: 'Q1~Q3 탭 — 팀 토론 + 답변', icon: '💬', color: '#00B5AD', tip: '각 Q탭마다 빈칸을 채워 중간 결론을 만드세요.' },
          { time: '25–40분', step: '결론 탭 — 한 문장 전략', icon: '✏️', color: '#78BE20', tip: '한 문장 전략 빈칸을 채워 카드를 마무리합니다.' },
          { time: '40–50분', step: '카드 완료 → 다음 카드', icon: '✅', color: '#4FB0C6', tip: 'Q1~Q3 답변 + 한 문장 전략 작성 후 카드 완료.' },
          { time: '50–60분', step: '팀별 발표', icon: '📌', color: '#FF6F61', tip: '각 팀의 한 문장 전략을 발표하고 강사가 피드백합니다.' },
        ].map((f, i) => (
          <div key={i} className="flex gap-2 md:gap-3 mb-3 md:mb-4">
            <div className="w-9 h-9 md:w-10 md:h-10 rounded-full flex items-center justify-center text-base md:text-lg flex-shrink-0"
              style={{ background: f.color + '22', border: `2px solid ${f.color}` }}>{f.icon}</div>
            <div className="flex-1 pt-0.5 md:pt-1">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="text-[12px] md:text-[13px] font-bold" style={{ color: f.color }}>{f.step}</span>
                <span className="text-[10px] md:text-[11px] text-gray-600 px-2 py-0.5 rounded" style={{ background: 'rgba(255,255,255,0.05)' }}>{f.time}</span>
              </div>
              <div className="text-[11px] px-3 py-1.5 rounded-lg" style={{ color: f.color, background: f.color + '10' }}>💡 {f.tip}</div>
            </div>
          </div>
        ))}
        <button onClick={() => setScreen('landing')} className="w-full py-3 rounded-xl text-sm mt-4 mb-8 text-gray-500 border border-white/10">← 돌아가기</button>
      </div>
    </div>
  );

  // ─── GAME 화면 ───
  return (
    <div className="min-h-screen flex flex-col items-center px-3 md:px-4 py-3 md:py-4 relative overflow-hidden">

      <div className="fixed inset-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(circle at 20% 25%, ${S.cyan}1A 0%, transparent 45%),
            radial-gradient(circle at 80% 60%, ${S.purple}1A 0%, transparent 50%),
            radial-gradient(circle at 50% 95%, ${S.blue}14 0%, transparent 60%)
          `,
          zIndex: 0,
        }} />

      <div className="fixed top-[20%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 md:w-96 md:h-96 rounded-full pointer-events-none"
        style={{ background: `radial-gradient(circle, ${color}25 0%, transparent 70%)`, zIndex: 1 }} />

      <div className="w-full max-w-md mb-3 relative z-10">
        {/* 헤더: SIGNAL · 팀이름 + 레벨 + 목록 */}
        <div className="flex items-start justify-between mb-2.5 gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
              <p className="text-[9px] md:text-[10px] tracking-[3px] md:tracking-[4px] text-gray-600 font-mono">SIGNAL</p>
              {teamName && (
                <>
                  <span className="text-gray-700 text-[10px]">·</span>
                  <p className="text-[10px] md:text-[11px] font-bold font-mono tracking-wide truncate"
                    style={{ color: S.cyan, textShadow: `0 0 6px ${S.cyan}66` }}>
                    {teamName}
                  </p>
                </>
              )}
            </div>
            <h1 className="text-xs md:text-sm font-extrabold text-white">디지털 무역 전략카드</h1>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-[9px] px-2 py-1 rounded-md font-bold" style={{ background: lv.color + '22', color: lv.color }}>{lv.emoji} {lv.label}</span>
            <button onClick={() => setShowList(!showList)}
              className="rounded-lg px-2.5 py-1 text-[11px] text-gray-400 transition"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
              {showList ? '닫기' : '목록'}
            </button>
          </div>
        </div>

        {/* 직무 카드 + 아이템 카드 */}
        <div className="flex flex-col md:flex-row gap-2 mb-2">
          {myRole ? (
            <div className="flex items-center gap-2.5 rounded-xl px-3 py-2 transition"
              style={{
                background: `linear-gradient(135deg, ${myRole.color}30 0%, ${myRole.color}10 100%)`,
                border: `1.5px solid ${myRole.color}`,
                boxShadow: `0 0 14px ${myRole.color}30`,
              }}>
              <div className="w-9 h-9 rounded-lg flex items-center justify-center text-lg flex-shrink-0"
                style={{ background: `${myRole.color}40`, border: `1px solid ${myRole.color}` }}>
                {myRole.icon}
              </div>
              <div className="flex flex-col leading-tight min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="text-[8px] px-1.5 py-0.5 rounded font-bold tracking-wider"
                    style={{
                      background: isLeader ? `${S.green}25` : `${S.pink}20`,
                      border: `1px solid ${isLeader ? S.green : S.pink}60`,
                      color: isLeader ? S.green : S.pink,
                    }}>
                    {isLeader ? '팀장' : '팀원'}
                  </span>
                  <span className="text-[12px] font-bold text-white truncate">{playerName}</span>
                </div>
                <span className="text-[9px] font-mono font-semibold truncate" style={{ color: myRole.color }}>
                  {myRole.nameKr}
                  <span className="hidden md:inline"> · {myRole.nameEn}</span>
                </span>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-xl px-3 py-2"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <span className="text-lg">{isLeader ? '👑' : '💬'}</span>
              <span className="text-[12px] font-bold text-white">{playerName}</span>
            </div>
          )}

          <div className="flex items-center gap-2 rounded-xl px-3 py-2 flex-1 min-w-0"
            style={{ background: `${S.green}08`, border: `1px solid ${S.green}30` }}>
            <span className="text-[8px] font-mono text-gray-500 tracking-wider flex-shrink-0">아이템</span>
            <span className="text-[11px] md:text-[12px] font-bold truncate"
              style={{ color: S.green, textShadow: `0 0 4px ${S.green}33` }}>
              {displayItem}
            </span>
          </div>
        </div>

        {/* 타이머 */}
        <div className="flex items-center gap-2 mb-2">
          <div className="flex-1" />
          <div className="flex items-center gap-1.5 rounded-lg px-2 py-1" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <span className={`text-[12px] font-mono font-bold ${timer <= 60 ? 'text-red-400' : 'text-white'}`}>{fmt(timer)}</span>
            <button onClick={() => setTimerActive(!timerActive)}
              className={`text-[10px] px-1.5 py-0.5 rounded ${timerActive ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>
              {timerActive ? '⏸' : '▶'}
            </button>
          </div>
        </div>

        {/* 진행도 바 */}
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[11px] text-gray-600 font-mono min-w-[50px]">{currentCardIdx + 1} / {TOPICS.length}</span>
          <div className="flex-1 h-[4px] rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
            <div className="h-full rounded-full transition-all"
              style={{
                width: `${((currentCardIdx+1)/TOPICS.length)*100}%`,
                background: color,
                boxShadow: `0 0 12px ${color}88`
              }} />
          </div>
        </div>

        {/* 카드 번호 점프 */}
        <div className="flex gap-0.5 flex-wrap">
          {TOPICS.map((t, i) => (
            <button key={t.id} onClick={() => goToCard(i)}
              className="flex-shrink-0 w-5 h-5 md:w-6 md:h-6 rounded-full flex items-center justify-center text-[8px] md:text-[9px] font-bold font-mono transition-all hover:scale-110"
              style={{
                background: currentCardIdx === i ? CARD_COLORS[t.id].bg : completedCards.has(t.id) ? CARD_COLORS[t.id].bg + '44' : 'rgba(255,255,255,0.06)',
                border: currentCardIdx === i ? `2px solid ${CARD_COLORS[t.id].bg}` : '1px solid rgba(255,255,255,0.08)',
                color: currentCardIdx === i ? '#fff' : completedCards.has(t.id) ? CARD_COLORS[t.id].bg : '#555',
                boxShadow: currentCardIdx === i ? `0 4px 12px ${CARD_COLORS[t.id].bg}66` : 'none',
              }}>
              {completedCards.has(t.id) && currentCardIdx !== i ? '✓' : t.id}
            </button>
          ))}
        </div>
      </div>

      {/* 직무 미션 안내 */}
      {myRole && myRole.primaryCards.includes(topic.id) && (
        <div className="w-full max-w-md mb-3 relative z-10">
          <div className="rounded-xl px-3 py-2 flex items-center gap-2 backdrop-blur-sm"
            style={{
              background: `${myRole.color}15`,
              border: `1px solid ${myRole.color}40`,
              boxShadow: `0 4px 20px ${myRole.color}22`,
            }}>
            <span className="text-base">{myRole.icon}</span>
            <div className="flex-1">
              <p className="text-[10px] font-mono tracking-widest" style={{ color: myRole.color }}>YOUR MISSION</p>
              <p className="text-[12px] font-bold text-white">이 카드는 {myRole.nameKr}님이 주도해주세요!</p>
            </div>
          </div>
        </div>
      )}

      {/* 카드 목록 모달 */}
      {showList && (
        <div className="fixed inset-0 backdrop-blur-xl z-[100] overflow-y-auto p-4 pt-14" style={{ background: 'rgba(0,0,0,0.92)' }}>
          <button onClick={() => setShowList(false)} className="fixed top-4 right-4 rounded-lg px-4 py-2 text-white text-sm z-10" style={{ background: 'rgba(255,255,255,0.1)' }}>닫기</button>
          <h2 className="text-lg font-extrabold text-white mb-4">전체 카드 목록</h2>
          <div className="grid grid-cols-2 gap-2">
            {TOPICS.map((t, i) => {
              const done = completedCards.has(t.id);
              const myCard = myRole && myRole.primaryCards.includes(t.id);
              return (
                <button key={t.id} onClick={() => { goToCard(i); setShowList(false); }}
                  className="text-left rounded-xl p-3 transition relative"
                  style={{ background: done ? `${CARD_COLORS[t.id].bg}22` : 'rgba(255,255,255,0.04)', border: `1px solid ${done ? CARD_COLORS[t.id].bg + '55' : 'rgba(255,255,255,0.08)'}` }}>
                  {myCard && (
                    <div className="absolute top-2 right-2 text-[12px]" title={`${myRole?.nameKr} 담당 카드`}>
                      {myRole?.icon}
                    </div>
                  )}
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-black font-mono flex-shrink-0" style={{ background: CARD_COLORS[t.id].bg }}>{t.id}</span>
                    {done && <span className="text-[10px]" style={{ color: CARD_COLORS[t.id].bg }}>✓ 완료</span>}
                  </div>
                  <div className="text-[12px] font-bold text-white">{t.title}</div>
                  <div className="text-[10px] text-gray-600">{t.titleEn}</div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* SignalCard */}
      <div key={topic.id} className="w-full max-w-[420px] md:max-w-4xl relative z-10"
        onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
        <SignalCard
          topic={topic}
          currentTab={currentTab}
          onTabChange={setCurrentTab}
          responses={responses}
          onSaveResponse={handleSaveResponse}
          interimConclusions={interimConclusions}
          onSaveInterim={handleSaveInterim}
          leaderConclusion={currentLeaderConclusion}
          onLeaderConclusionChange={handleLeaderConclusionChange}
          completedCards={completedCards}
          onComplete={handleComplete}
          isCardCompleted={isCardCompleted}
          isLeader={isLeader}
          displayItem={displayItem}
          level={level}
          minChars={lv.minChars}
          teamId={teamId || ''}
          myMemberId={myMemberId}
          myRoleCode={roleCode}
          teamMembers={teamMembers}
          memberInsights={memberInsights}
          subCardLocks={subCardLocks}
          onLeaderCompleteSubCard={handleLeaderCompleteSubCard}
        />
      </div>

      {/* 카드 이동 컨트롤 */}
      <div className="flex gap-3 items-center mt-3 md:mt-4 relative z-10">
        <button onClick={() => goToCard(currentCardIdx - 1)} disabled={currentCardIdx === 0}
          className="w-10 h-10 md:w-11 md:h-11 rounded-full flex items-center justify-center text-base md:text-lg transition-all disabled:opacity-20 hover:scale-110"
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>‹</button>
        <div className="text-center min-w-[140px] md:min-w-[160px]">
          <div className="text-[12px] md:text-[13px] font-bold text-white">{topic.title}</div>
          <div className="text-[10px] text-gray-600 font-mono mt-0.5">카드 {currentCardIdx + 1}/16 · {'★'.repeat(topic.difficulty)}{'☆'.repeat(5-topic.difficulty)}</div>
        </div>
        <button onClick={() => goToCard(currentCardIdx + 1)} disabled={currentCardIdx === TOPICS.length - 1}
          className="w-10 h-10 md:w-11 md:h-11 rounded-full flex items-center justify-center text-base md:text-lg font-bold transition-all disabled:opacity-20 hover:scale-110"
          style={{
            background: currentCardIdx === TOPICS.length - 1 ? 'rgba(255,255,255,0.06)' : color,
            color: '#fff',
            boxShadow: currentCardIdx === TOPICS.length - 1 ? 'none' : `0 6px 20px -5px ${color}88`,
          }}>›</button>
      </div>

      <div className="mt-3 md:mt-4 text-[10px] text-gray-700 text-center relative z-10 font-mono">
        © 2026 SIGNAL — ConnectAI
        <button onClick={exitGame} className="ml-3 text-gray-700 underline hover:text-gray-500">나가기</button>
      </div>

      {/* 토스트 */}
      {savedToast && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 rounded-xl px-5 py-2.5 z-[300] flex items-center gap-2 backdrop-blur-sm"
          style={{ background: 'rgba(10,10,10,0.95)', border: '1px solid rgba(255,255,255,0.1)' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={S.green} strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg>
          <span className="text-[13px] text-white font-semibold">저장 완료!</span>
        </div>
      )}
    </div>
  );
}
