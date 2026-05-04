// ═══════════════════════════════════════════════════════
// 파일: src/lib/collaborative.ts (새 파일)
// ─────────────────────────────────────────────────────────
// 팀원 직무 인사이트 + Q1/Q2/Q3 순차 잠금 관리
// session.ts와 분리해서 관리 (역할이 다르니까)
// ═══════════════════════════════════════════════════════

import { supabase } from './supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';
import type { RoleCode } from '@/data/roleData';

// ═══════════════════════════════════════════════════════
// 타입 정의
// ═══════════════════════════════════════════════════════

export interface MemberInsight {
  id: string;
  team_id: string;
  member_id: string;
  sub_card_id: string;
  role_code: string;
  content: string;
  is_completed: boolean;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SubCardLock {
  id: string;
  team_id: string;
  sub_card_id: string;
  unlocked_at: string | null;
  leader_completed_at: string | null;
}

// ═══════════════════════════════════════════════════════
// 1) 팀원 직무 인사이트 (member_insights)
// ═══════════════════════════════════════════════════════

// 인사이트 저장 (작성 중 자동 저장 / 완료 클릭 둘 다 사용)
export async function saveMemberInsight({
  teamId,
  memberId,
  subCardId,
  roleCode,
  content,
  isCompleted = false,
}: {
  teamId: string;
  memberId: string;
  subCardId: string;
  roleCode: string;
  content: string;
  isCompleted?: boolean;
}): Promise<boolean> {
  const payload: any = {
    team_id: teamId,
    member_id: memberId,
    sub_card_id: subCardId,
    role_code: roleCode,
    content,
    is_completed: isCompleted,
  };
  if (isCompleted) {
    payload.completed_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from('member_insights')
    .upsert(payload, { onConflict: 'team_id,member_id,sub_card_id' });

  if (error) console.error('saveMemberInsight error:', error);
  return !error;
}

// 팀의 모든 인사이트 한 번에 로드 (게임 시작 시)
export async function loadTeamInsights(teamId: string): Promise<MemberInsight[]> {
  const { data, error } = await supabase
    .from('member_insights')
    .select('*')
    .eq('team_id', teamId);

  if (error || !data) return [];
  return data as MemberInsight[];
}

// 특정 서브카드의 인사이트만 로드
export async function loadInsightsForSubCard(
  teamId: string,
  subCardId: string,
): Promise<MemberInsight[]> {
  const { data, error } = await supabase
    .from('member_insights')
    .select('*')
    .eq('team_id', teamId)
    .eq('sub_card_id', subCardId);

  if (error || !data) return [];
  return data as MemberInsight[];
}

// 본인의 특정 카드 인사이트 로드 (팀원 화면용)
export async function loadMyInsight(
  teamId: string,
  memberId: string,
  subCardId: string,
): Promise<MemberInsight | null> {
  const { data, error } = await supabase
    .from('member_insights')
    .select('*')
    .eq('team_id', teamId)
    .eq('member_id', memberId)
    .eq('sub_card_id', subCardId)
    .maybeSingle();

  if (error) return null;
  return data as MemberInsight | null;
}

// 실시간 구독 - 팀의 모든 인사이트 변경 감지 (팀장 사이드바용)
export function subscribeToTeamInsights(
  teamId: string,
  onChange: (insights: MemberInsight[]) => void,
): () => void {
  let channel: RealtimeChannel | null = null;

  const refetch = async () => {
    const insights = await loadTeamInsights(teamId);
    onChange(insights);
  };

  channel = supabase
    .channel(`team_insights:${teamId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'member_insights', filter: `team_id=eq.${teamId}` },
      refetch,
    )
    .subscribe();

  // 초기 로드
  refetch();

  return () => {
    if (channel) supabase.removeChannel(channel);
  };
}

// ═══════════════════════════════════════════════════════
// 2) 서브카드 잠금 (sub_card_locks)
// ═══════════════════════════════════════════════════════

// 첫 카드의 첫 Q를 자동으로 열어주기 (게임 시작 시 호출)
// "01-1"은 항상 열려있어야 학생들이 시작할 수 있음
export async function ensureFirstSubCardUnlocked(teamId: string): Promise<void> {
  const { data: existing } = await supabase
    .from('sub_card_locks')
    .select('id')
    .eq('team_id', teamId)
    .eq('sub_card_id', '01-1')
    .maybeSingle();

  if (!existing) {
    await supabase
      .from('sub_card_locks')
      .insert({
        team_id: teamId,
        sub_card_id: '01-1',
        unlocked_at: new Date().toISOString(),
      });
  }
}

// 모든 잠금 상태 로드 (게임 시작 시)
export async function loadSubCardLocks(teamId: string): Promise<SubCardLock[]> {
  const { data, error } = await supabase
    .from('sub_card_locks')
    .select('*')
    .eq('team_id', teamId);

  if (error || !data) return [];
  return data as SubCardLock[];
}

// 특정 sub 카드 잠금 풀기 (다음 Q 또는 다음 카드의 Q1 열 때)
export async function unlockSubCard(
  teamId: string,
  subCardId: string,
): Promise<boolean> {
  const { error } = await supabase
    .from('sub_card_locks')
    .upsert(
      {
        team_id: teamId,
        sub_card_id: subCardId,
        unlocked_at: new Date().toISOString(),
      },
      { onConflict: 'team_id,sub_card_id', ignoreDuplicates: false },
    );

  if (error) console.error('unlockSubCard error:', error);
  return !error;
}

// 팀장이 Q1/Q2/Q3 완료 처리 + 다음 sub 자동 잠금 해제
// 다음 sub이 다음 카드의 Q1이 될 수도 있음 (예: 01-3 완료 → 02-1 열림)
export async function leaderCompleteSubCard({
  teamId,
  subCardId,
  nextSubCardId,
}: {
  teamId: string;
  subCardId: string;
  nextSubCardId: string | null;
}): Promise<boolean> {
  // 1) 현재 sub 완료 처리
  const { error: e1 } = await supabase
    .from('sub_card_locks')
    .upsert(
      {
        team_id: teamId,
        sub_card_id: subCardId,
        leader_completed_at: new Date().toISOString(),
      },
      { onConflict: 'team_id,sub_card_id', ignoreDuplicates: false },
    );

  if (e1) {
    console.error('leaderCompleteSubCard step1 error:', e1);
    return false;
  }

  // 2) 다음 sub 잠금 해제
  if (nextSubCardId) {
    await unlockSubCard(teamId, nextSubCardId);
  }

  return true;
}

// 실시간 구독 - 잠금 상태 변경 감지 (모든 팀원이 동일한 카드 상태 공유)
export function subscribeToSubCardLocks(
  teamId: string,
  onChange: (locks: SubCardLock[]) => void,
): () => void {
  let channel: RealtimeChannel | null = null;

  const refetch = async () => {
    const locks = await loadSubCardLocks(teamId);
    onChange(locks);
  };

  channel = supabase
    .channel(`sub_card_locks:${teamId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'sub_card_locks', filter: `team_id=eq.${teamId}` },
      refetch,
    )
    .subscribe();

  refetch();

  return () => {
    if (channel) supabase.removeChannel(channel);
  };
}

// ═══════════════════════════════════════════════════════
// 3) 헬퍼 함수 — UI에서 자주 쓰는 로직
// ═══════════════════════════════════════════════════════

// 특정 sub가 잠겨있는지 확인
export function isSubCardLocked(
  subCardId: string,
  locks: SubCardLock[],
): boolean {
  const lock = locks.find(l => l.sub_card_id === subCardId);
  return !lock || !lock.unlocked_at;
}

// 특정 sub가 팀장에 의해 완료됐는지
export function isSubCardCompleted(
  subCardId: string,
  locks: SubCardLock[],
): boolean {
  const lock = locks.find(l => l.sub_card_id === subCardId);
  return !!(lock && lock.leader_completed_at);
}

// 팀원 전원이 인사이트를 완료했는지 확인 (팀장 완료 버튼 활성화 조건)
// 단, CEO(팀장)는 인사이트 입력 안 하므로 nonLeaderMembers 기준
export function areAllMembersComplete(
  subCardId: string,
  insights: MemberInsight[],
  nonLeaderMemberIds: string[],
): boolean {
  if (nonLeaderMemberIds.length === 0) return true; // 혼자 진행하는 경우
  const completedMemberIds = insights
    .filter(i => i.sub_card_id === subCardId && i.is_completed)
    .map(i => i.member_id);
  return nonLeaderMemberIds.every(mid => completedMemberIds.includes(mid));
}

// 다음 sub_card_id 계산 (예: 01-1 → 01-2, 01-3 → 02-1, 16-3 → null)
export function getNextSubCardId(currentSubCardId: string): string | null {
  const [topicId, qNum] = currentSubCardId.split('-');
  const q = parseInt(qNum, 10);

  if (q < 3) {
    return `${topicId}-${q + 1}`;
  }

  // Q3 완료 → 다음 카드의 Q1
  const nextTopicNum = parseInt(topicId, 10) + 1;
  if (nextTopicNum > 16) return null; // 마지막 카드
  return `${String(nextTopicNum).padStart(2, '0')}-1`;
}
