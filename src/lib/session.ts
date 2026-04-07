import { supabase, Session } from './supabase';

const SESSION_KEY = 'dtc_session_token';

// ── 수업 코드로 팀 찾기 ───────────────────────────────
export async function findTeamByCode(joinCode: string) {
  const { data, error } = await supabase
    .from('teams')
    .select('*')
    .eq('join_code', joinCode.toUpperCase().trim())
    .single();
  if (error) return null;
  return data;
}

// ── 이름 + 팀으로 세션 찾거나 새로 만들기 ──────────────
export async function getOrCreateSession({
  playerName,
  teamId,
  role,
  level,
  item,
}: {
  playerName: string;
  teamId: string;
  role: 'leader' | 'member';
  level: string;
  item: string;
}): Promise<Session | null> {
  const name = playerName.trim();

  // 기존 세션 찾기 (같은 팀 + 같은 이름)
  const { data: existing } = await supabase
    .from('sessions')
    .select('*')
    .eq('team_id', teamId)
    .eq('player_name', name)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (existing) {
    // last_seen_at 업데이트
    await supabase
      .from('sessions')
      .update({ last_seen_at: new Date().toISOString(), role, level, item })
      .eq('id', existing.id);
    // 토큰 로컬 저장
    localStorage.setItem(SESSION_KEY, existing.session_token);
    return existing as Session;
  }

  // 새 세션 생성
  const { data: newSession, error } = await supabase
    .from('sessions')
    .insert({ team_id: teamId, player_name: name, role, level, item })
    .select()
    .single();

  if (error || !newSession) return null;
  localStorage.setItem(SESSION_KEY, newSession.session_token);
  return newSession as Session;
}

// ── 저장된 토큰으로 세션 복원 ──────────────────────────
export async function restoreSession(): Promise<Session | null> {
  const token = localStorage.getItem(SESSION_KEY);
  if (!token) return null;

  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('session_token', token)
    .single();

  if (error || !data) {
    localStorage.removeItem(SESSION_KEY);
    return null;
  }
  return data as Session;
}

// ── 세션 토큰 삭제 (로그아웃) ─────────────────────────
export function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

// ── 카드 응답 저장 ────────────────────────────────────
export async function saveCardResponse({
  teamId,
  sessionId,
  cardId,
  texts,
}: {
  teamId: string;
  sessionId: string;
  cardId: string;
  texts: Record<string, string>;
}) {
  // upsert: 같은 team + card면 업데이트
  const { error } = await supabase
    .from('card_responses')
    .upsert(
      { team_id: teamId, session_id: sessionId, card_id: cardId, texts, updated_at: new Date().toISOString() },
      { onConflict: 'team_id,card_id' }
    );
  return !error;
}

// ── 카드 응답 불러오기 ────────────────────────────────
export async function loadCardResponses(teamId: string) {
  const { data, error } = await supabase
    .from('card_responses')
    .select('card_id, texts')
    .eq('team_id', teamId);
  if (error || !data) return {};

  const result: Record<string, { texts: Record<string, string>; images: Record<string, string> }> = {};
  data.forEach((r) => { result[r.card_id] = { texts: r.texts || {}, images: {} }; });
  return result;
}

// ── 카드 완료 저장 ────────────────────────────────────
export async function saveCardProgress({
  teamId,
  sessionId,
  cardId,
  checklistStatus,
  completed,
}: {
  teamId: string;
  sessionId: string;
  cardId: string;
  checklistStatus: Record<number, boolean>;
  completed: boolean;
}) {
  const { error } = await supabase
    .from('card_progress')
    .upsert(
      { team_id: teamId, session_id: sessionId, card_id: cardId, checklist_status: checklistStatus, completed, updated_at: new Date().toISOString() },
      { onConflict: 'team_id,card_id' }
    );
  return !error;
}

// ── 카드 진행 상황 불러오기 ───────────────────────────
export async function loadCardProgress(teamId: string) {
  const { data, error } = await supabase
    .from('card_progress')
    .select('card_id, checklist_status, completed')
    .eq('team_id', teamId);
  if (error || !data) return { checkStates: {}, completedCards: new Set<string>() };

  const checkStates: Record<string, Record<number, boolean>> = {};
  const completedCards = new Set<string>();

  data.forEach((p) => {
    checkStates[p.card_id] = p.checklist_status || {};
    if (p.completed) completedCards.add(p.card_id);
  });

  return { checkStates, completedCards };
}
