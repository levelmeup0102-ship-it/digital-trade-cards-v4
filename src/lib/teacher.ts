import { supabase } from './supabase';

// ── 타입 ──────────────────────────────────────────────────
export type Teacher = {
  id: string;
  name: string;
  school: string;
};

export type Class = {
  id: string;
  teacher_id: string;
  name: string;
  school: string;
  schedule: string;
  description: string;
  status: 'draft' | 'active' | 'completed';
  created_at: string;
  // ⭐ NEW: 난이도 + 학급 코드
  level?: string;        // 'basic' | 'standard' | 'advanced'
  join_code?: string;    // 예) 'CL-AB-X7K2', NULL 가능
};

export type Team = {
  id: string;
  class_id: string;
  name: string;
  join_code: string;
  item?: string;
  level?: string;
  game_started?: boolean;
  game_started_at?: string | null;
  created_at: string;
  member_count?: number;
  completed_count?: number;
  completed_card_ids?: string[]; // ⭐ NEW: 완료한 카드 ID 목록 (정렬됨)
};

export type TeamMember = {
  id: string;
  team_id: string;
  name: string;
  is_leader: boolean;
  joined_at: string | null;
  role_code?: string | null;
  role_assigned_at?: string | null;
};

// ⭐ NEW: 카드 완료 이벤트 (toast 알림용)
export type CardCompletionEvent = {
  teamId: string;
  teamName: string;
  cardId: string;
  completedAt: string;
};

// ── 간단한 비밀번호 해싱 (btoa 기반) ────────────────────────
function hashPassword(password: string, salt: string): string {
  return btoa(unescape(encodeURIComponent(password + salt + 'signal2026')));
}

const SALT = 'signal_connectai_2026';

// ── localStorage 기반 세션 ────────────────────────────────
const SESSION_KEY = 'signal_teacher_session';

export function saveTeacherSession(teacher: Teacher) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(teacher));
}

export function clearTeacherSession() {
  localStorage.removeItem(SESSION_KEY);
}

export function getTeacherFromSession(): Teacher | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Teacher;
  } catch { return null; }
}

// ── 인증 ──────────────────────────────────────────────────
export async function signUp(name: string, school: string, password: string): Promise<Teacher> {
  const passwordHash = hashPassword(password, SALT);
  const { data, error } = await supabase
    .from('teachers')
    .insert({ name: name.trim(), school: school.trim(), password_hash: passwordHash })
    .select('id, name, school')
    .single();
  if (error) {
    if (error.code === '23505') throw new Error('이미 가입된 이름+소속 조합입니다.');
    throw new Error('가입 중 오류가 발생했습니다.');
  }
  const teacher = data as Teacher;
  saveTeacherSession(teacher);
  return teacher;
}

export async function signIn(name: string, school: string, password: string): Promise<Teacher> {
  const passwordHash = hashPassword(password, SALT);
  const { data } = await supabase
    .from('teachers')
    .select('id, name, school, password_hash')
    .eq('name', name.trim())
    .eq('school', school.trim())
    .single();
  if (!data) throw new Error('이름 또는 소속이 틀렸습니다.');
  if (data.password_hash !== passwordHash) throw new Error('비밀번호가 틀렸습니다.');
  const teacher: Teacher = { id: data.id, name: data.name, school: data.school };
  saveTeacherSession(teacher);
  return teacher;
}

export function signOut() {
  clearTeacherSession();
}

export async function getCurrentTeacher(): Promise<Teacher | null> {
  return getTeacherFromSession();
}

// ── 수업 ──────────────────────────────────────────────────
// ⭐ NEW v2: level 파라미터 추가 + join_code 자동 생성
export async function createClass(teacherId: string, { name, school, schedule, description, level }: {
  name: string;
  school: string;
  schedule: string;
  description: string;
  level?: string; // ⭐ 'basic' | 'standard' | 'advanced' (default: 'standard')
}) {
  // 1) 학급 코드 자동 생성 (DB 함수 호출)
  const { data: codeData, error: codeError } = await supabase
    .rpc('generate_class_join_code');

  if (codeError) {
    console.error('학급 코드 생성 실패:', codeError);
    throw new Error('학급 코드 생성 중 오류가 발생했습니다.');
  }

  const join_code = codeData as string;

  // 2) 학급 insert (level + join_code 포함)
  const { data, error } = await supabase
    .from('classes')
    .insert({
      teacher_id: teacherId,
      name,
      school,
      schedule,
      description,
      status: 'active',
      level: level || 'standard',
      join_code,
    })
    .select()
    .single();

  if (error) throw error;
  return data as Class;
}

export async function getClasses(teacherId: string): Promise<Class[]> {
  const { data, error } = await supabase
    .from('classes')
    .select('*')
    .eq('teacher_id', teacherId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []) as Class[];
}

export async function getClass(classId: string): Promise<Class | null> {
  const { data } = await supabase
    .from('classes')
    .select('*')
    .eq('id', classId)
    .single();
  return data as Class | null;
}

// ⭐⭐⭐ NEW v3: 학급 코드로 학급 + 팀 목록 조회 (학생 입장용)
export async function getClassWithTeamsByCode(joinCode: string): Promise<{ class: Class; teams: Team[] } | null> {
  const trimmedCode = joinCode.toUpperCase().trim();

  // 1) 학급 조회
  const { data: cls, error: clsError } = await supabase
    .from('classes')
    .select('*')
    .eq('join_code', trimmedCode)
    .single();

  if (clsError || !cls) return null;

  // 2) 학급의 모든 팀 + 멤버 수 조회
  const teams = await getTeamsByClass(cls.id);

  return { class: cls as Class, teams };
}

// ── 팀 ──────────────────────────────────────────────────
function generateTeamCode(idx: number): string {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const a = letters[Math.floor(idx / 36) % 36];
  const b = letters[idx % 36];
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `DT-${a}${b}-${rand}`;
}

export async function createTeams(classId: string, teamCount: number): Promise<Team[]> {
  // ⭐ NEW: 학급의 level을 가져와서 팀에도 자동 적용
  const { data: cls } = await supabase
    .from('classes')
    .select('level')
    .eq('id', classId)
    .single();

  const classLevel = cls?.level || 'standard';

  const teams = Array.from({ length: teamCount }, (_, i) => ({
    class_id: classId,
    name: `${i + 1}팀`,
    join_code: generateTeamCode(i),
    level: classLevel, // ⭐ NEW: 학급 난이도 자동 복사
  }));
  const { data, error } = await supabase
    .from('teams')
    .insert(teams)
    .select();
  if (error) throw error;
  return (data || []) as Team[];
}

export async function getTeamsByClass(classId: string): Promise<Team[]> {
  const { data: teams, error } = await supabase
    .from('teams')
    .select('*')
    .eq('class_id', classId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  if (!teams) return [];

  const teamIds = teams.map(t => t.id);

  const { data: members } = await supabase
    .from('team_members')
    .select('team_id')
    .in('team_id', teamIds);

  // ⭐ NEW: card_id도 가져옴 (격자 표시용)
  const { data: progress } = await supabase
    .from('card_progress')
    .select('team_id, card_id')
    .in('team_id', teamIds)
    .eq('completed', true);

  const memberCount: Record<string, number> = {};
  members?.forEach(m => { memberCount[m.team_id] = (memberCount[m.team_id] || 0) + 1; });

  // ⭐ NEW: 팀별 완료 카드 ID 목록 (정렬)
  const completedCardIds: Record<string, string[]> = {};
  progress?.forEach(p => {
    if (!completedCardIds[p.team_id]) completedCardIds[p.team_id] = [];
    completedCardIds[p.team_id].push(p.card_id);
  });
  // 각 팀의 카드 ID 정렬
  Object.keys(completedCardIds).forEach(teamId => {
    completedCardIds[teamId].sort();
  });

  return teams.map(t => ({
    ...t,
    member_count: memberCount[t.id] || 0,
    completed_count: (completedCardIds[t.id] || []).length,
    completed_card_ids: completedCardIds[t.id] || [],
  })) as Team[];
}

// ── 학생 명단 ──────────────────────────────────────────────
export async function saveTeamMembers(teamId: string, names: string[]): Promise<TeamMember[]> {
  await supabase.from('team_members').delete().eq('team_id', teamId);
  if (names.length === 0) return [];

  const members = names
    .map(name => name.trim())
    .filter(Boolean)
    .map((name, i) => ({
      team_id: teamId,
      name,
      is_leader: i === 0,
    }));

  const { data, error } = await supabase
    .from('team_members')
    .insert(members)
    .select();
  if (error) throw error;
  return (data || []) as TeamMember[];
}

export async function getTeamMembers(teamId: string): Promise<TeamMember[]> {
  const { data } = await supabase
    .from('team_members')
    .select('*')
    .eq('team_id', teamId)
    .order('is_leader', { ascending: false })
    .order('created_at', { ascending: true });
  return (data || []) as TeamMember[];
}

export async function getTeamWithMembersByCode(joinCode: string): Promise<{ team: Team; members: TeamMember[] } | null> {
  const { data: team } = await supabase
    .from('teams')
    .select('*')
    .eq('join_code', joinCode.toUpperCase().trim())
    .single();

  if (!team) return null;

  const members = await getTeamMembers(team.id);
  return { team: team as Team, members };
}

export async function joinAsStudent(teamId: string, memberId: string) {
  await supabase
    .from('team_members')
    .update({ joined_at: new Date().toISOString() })
    .eq('id', memberId);
}

// ─────────────────────────────────────────────────────────────
// 직무 배정 + 게임 시작 + Realtime
// ─────────────────────────────────────────────────────────────

export async function assignRoles(
  teamId: string,
  assignments: Array<{ memberId: string; roleCode: string }>
) {
  const now = new Date().toISOString();
  for (const a of assignments) {
    await supabase
      .from('team_members')
      .update({ role_code: a.roleCode, role_assigned_at: now })
      .eq('id', a.memberId);
  }
}

export async function startTeamGame(teamId: string) {
  const { error } = await supabase
    .from('teams')
    .update({
      game_started: true,
      game_started_at: new Date().toISOString(),
    })
    .eq('id', teamId);
  if (error) throw error;
}

export function subscribeToTeamStart(
  teamId: string,
  onGameStart: () => void
): () => void {
  const channel = supabase
    .channel(`team-start-${teamId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'teams',
        filter: `id=eq.${teamId}`,
      },
      (payload: any) => {
        if (payload.new?.game_started === true) {
          onGameStart();
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

export function subscribeToTeamMembers(
  teamId: string,
  onMemberUpdate: (members: TeamMember[]) => void
): () => void {
  const channel = supabase
    .channel(`team-members-${teamId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'team_members',
        filter: `team_id=eq.${teamId}`,
      },
      async () => {
        const members = await getTeamMembers(teamId);
        onMemberUpdate(members);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

export async function getTeamGameStatus(teamId: string): Promise<boolean> {
  const { data } = await supabase
    .from('teams')
    .select('game_started')
    .eq('id', teamId)
    .single();
  return data?.game_started === true;
}

// ─────────────────────────────────────────────────────────────
// ⭐ NEW: 관리자 랭킹 시스템 (Realtime)
// ─────────────────────────────────────────────────────────────

/**
 * 수업 내 모든 팀의 카드 진행 상황 실시간 구독
 * 학생이 카드를 완료할 때마다 자동으로 onUpdate 콜백 호출
 *
 * @param classId 수업 ID
 * @param teamIds 해당 수업의 팀 ID 목록 (필터링용)
 * @param onUpdate 변경 감지 시 호출 (완료된 카드 정보 포함)
 * @returns unsubscribe 함수
 */
export function subscribeToClassProgress(
  classId: string,
  teamIds: string[],
  onUpdate: (event: { teamId: string; cardId: string; isCompleted: boolean }) => void
): () => void {
  if (teamIds.length === 0) return () => {};

  const channel = supabase
    .channel(`class-progress-${classId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'card_progress',
      },
      (payload: any) => {
        const newRecord = payload.new || payload.old;
        if (!newRecord) return;
        // 이 수업의 팀만 필터링
        if (!teamIds.includes(newRecord.team_id)) return;

        onUpdate({
          teamId: newRecord.team_id,
          cardId: newRecord.card_id,
          isCompleted: newRecord.completed === true,
        });
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * 팀 랭킹 정보 조회 (정렬됨)
 * 완료 카드 수 내림차순 → 동점이면 빠른 시간 우선
 */
export async function getTeamRankings(classId: string): Promise<Team[]> {
  const teams = await getTeamsByClass(classId);
  // 완료 카드 수 내림차순으로 정렬
  return teams.sort((a, b) => {
    const aCount = a.completed_count || 0;
    const bCount = b.completed_count || 0;
    if (bCount !== aCount) return bCount - aCount;
    // 동점이면 게임 시작 빠른 순
    if (a.game_started_at && b.game_started_at) {
      return new Date(a.game_started_at).getTime() - new Date(b.game_started_at).getTime();
    }
    return 0;
  });
}
