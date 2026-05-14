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
  // ⭐⭐⭐ NEW: 일괄 시작 (8번 작업)
  game_started_at?: string | null; // NULL이면 미시작, NOT NULL이면 일괄 시작됨
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

// ═══════════════════════════════════════════════════════
// ⭐⭐⭐ NEW Phase 4: 자유 이름 입력 + 팀장 자원 ⭐⭐⭐
// ═══════════════════════════════════════════════════════

/**
 * 학생이 자유 이름 입력으로 팀에 입장
 * - 같은 팀에 중복 이름 있으면 자동 번호 붙임 (이서연, 이서연(2))
 * - is_leader=false로 시작 (팀장은 별도 자원 단계)
 * - 새 team_members row 생성
 * 
 * @param teamId 팀 ID
 * @param rawName 학생이 입력한 원본 이름
 * @returns 생성된 TeamMember
 * @throws Error 이름 검증 실패 또는 DB 오류
 */
export async function joinTeamWithName(teamId: string, rawName: string): Promise<TeamMember> {
  const name = rawName.trim();
  if (name.length < 2 || name.length > 15) {
    throw new Error('이름은 2~15자로 입력해주세요.');
  }

  // 같은 팀의 기존 멤버 이름 모두 조회 (중복 체크용)
  const { data: existingMembers, error: queryError } = await supabase
    .from('team_members')
    .select('name')
    .eq('team_id', teamId);

  if (queryError) {
    throw new Error('팀 정보를 불러오는 중 오류가 발생했어요.');
  }

  const existingNames = new Set((existingMembers || []).map((m: any) => m.name));

  // 중복 이름 자동 번호 붙임
  let finalName = name;
  if (existingNames.has(name)) {
    let counter = 2;
    while (existingNames.has(`${name}(${counter})`)) {
      counter++;
      if (counter > 99) {
        throw new Error('같은 이름이 너무 많아요. 다른 이름을 입력해주세요.');
      }
    }
    finalName = `${name}(${counter})`;
  }

  // 새 멤버 생성
  const { data, error } = await supabase
    .from('team_members')
    .insert({
      team_id: teamId,
      name: finalName,
      is_leader: false,
      joined_at: new Date().toISOString(),
    })
    .select('*')
    .single();

  if (error || !data) {
    throw new Error('팀 입장에 실패했어요. 다시 시도해주세요.');
  }

  return data as TeamMember;
}

/**
 * 팀장 자원하기 (먼저 누른 사람이 팀장)
 * - 이미 팀에 팀장이 있으면 실패 (race condition 방지)
 * - 트랜잭션처럼 동작: 팀에 팀장이 없을 때만 본인이 팀장
 *
 * @param teamId 팀 ID
 * @param memberId 자원하는 멤버 ID
 * @returns { success: true } 또는 { success: false, leaderName?: string, error?: string }
 */
export async function claimLeader(
  teamId: string,
  memberId: string,
): Promise<{ success: boolean; leaderName?: string; error?: string }> {
  try {
    // 1. 이미 팀장이 있는지 확인
    const { data: existingLeader } = await supabase
      .from('team_members')
      .select('id, name')
      .eq('team_id', teamId)
      .eq('is_leader', true)
      .maybeSingle();

    if (existingLeader) {
      return {
        success: false,
        leaderName: existingLeader.name,
        error: '이미 다른 학생이 팀장으로 자원했어요.',
      };
    }

    // 2. 본인을 팀장으로 업데이트
    const { error: updateError } = await supabase
      .from('team_members')
      .update({ is_leader: true })
      .eq('id', memberId)
      .eq('team_id', teamId);

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    // 3. 다시 확인 (race condition 방지 — 두 명이 거의 동시에 누른 경우)
    const { data: leaderCheck } = await supabase
      .from('team_members')
      .select('id, name')
      .eq('team_id', teamId)
      .eq('is_leader', true);

    if (leaderCheck && leaderCheck.length > 1) {
      // 2명 이상이 팀장이 됨 → 가장 먼저 자원한 사람만 남기고 본인 취소
      const firstLeader = leaderCheck[0]; // joined_at 정렬은 아니지만 단순화
      if (firstLeader.id !== memberId) {
        await supabase
          .from('team_members')
          .update({ is_leader: false })
          .eq('id', memberId);
        return {
          success: false,
          leaderName: firstLeader.name,
          error: '거의 동시에 다른 학생이 먼저 자원했어요.',
        };
      }
    }

    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message || '팀장 자원 중 오류가 발생했어요.' };
  }
}

// ═══════════════════════════════════════════════════════
// ⭐⭐⭐ NEW Phase 4 (4번): 팀장 사퇴 + 양도 ⭐⭐⭐
// ═══════════════════════════════════════════════════════

/**
 * 팀장 사퇴
 * - 산업군/수준/모든 직무 초기화 (처음부터 다시 배정)
 * - is_leader = false
 * - 모든 팀원: 다시 팀 대기실로 자동 이동 (Realtime 멤버 갱신으로)
 *
 * @param teamId 팀 ID
 * @param memberId 사퇴하는 팀장 ID
 */
export async function resignLeader(
  teamId: string,
  memberId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    // 1. 본인 is_leader = false
    const { error: e1 } = await supabase
      .from('team_members')
      .update({ is_leader: false })
      .eq('id', memberId)
      .eq('team_id', teamId);
    if (e1) return { success: false, error: e1.message };

    // 2. 모든 팀원의 role_code 초기화 (새 팀장이 다시 배정해야 함)
    const { error: e2 } = await supabase
      .from('team_members')
      .update({ role_code: null, role_assigned_at: null })
      .eq('team_id', teamId);
    if (e2) return { success: false, error: e2.message };

    // 3. teams의 산업군, 수준 초기화 (새 팀장이 다시 정해야 함)
    const { error: e3 } = await supabase
      .from('teams')
      .update({ item: null, level: null })
      .eq('id', teamId);
    if (e3) return { success: false, error: e3.message };

    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message || '사퇴 처리 중 오류가 발생했어요.' };
  }
}

/**
 * 팀장 양도
 * - 산업군/수준 유지 (재배정 불필요)
 * - 직무는 모두 초기화 (새 팀장이 다시 배정)
 * - from.is_leader = false, to.is_leader = true
 * - 양도받은 학생: 자동으로 leader-setup 진입 (Realtime으로)
 *
 * @param teamId 팀 ID
 * @param fromMemberId 현재 팀장 ID
 * @param toMemberId 새 팀장이 될 학생 ID
 */
export async function transferLeader(
  teamId: string,
  fromMemberId: string,
  toMemberId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    if (fromMemberId === toMemberId) {
      return { success: false, error: '본인에게는 양도할 수 없어요.' };
    }

    // 1. to가 같은 팀 멤버인지 검증
    const { data: toMember } = await supabase
      .from('team_members')
      .select('id')
      .eq('id', toMemberId)
      .eq('team_id', teamId)
      .maybeSingle();
    if (!toMember) return { success: false, error: '양도 대상이 같은 팀 학생이 아니에요.' };

    // 2. from.is_leader = false
    const { error: e1 } = await supabase
      .from('team_members')
      .update({ is_leader: false })
      .eq('id', fromMemberId)
      .eq('team_id', teamId);
    if (e1) return { success: false, error: e1.message };

    // 3. to.is_leader = true
    const { error: e2 } = await supabase
      .from('team_members')
      .update({ is_leader: true })
      .eq('id', toMemberId)
      .eq('team_id', teamId);
    if (e2) return { success: false, error: e2.message };

    // 4. 모든 팀원의 role_code 초기화 (새 팀장이 다시 배정)
    const { error: e3 } = await supabase
      .from('team_members')
      .update({ role_code: null, role_assigned_at: null })
      .eq('team_id', teamId);
    if (e3) return { success: false, error: e3.message };

    // 5. teams의 산업군, 수준은 유지 (item, level 그대로)

    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message || '양도 처리 중 오류가 발생했어요.' };
  }
}

// ═══════════════════════════════════════════════════════
// ⭐⭐⭐ NEW Phase 4 (18번): 관리자 강제 퇴장 ⭐⭐⭐
// ═══════════════════════════════════════════════════════

/**
 * 관리자가 학생을 강제 퇴장 (team_members 행 삭제)
 * - cascade로 member_insights, personal_scores도 자동 삭제됨
 * - card_responses는 team 단위라 영향 없음 (다른 팀원이 계속 게임 가능)
 * - 삭제된 학생은 다시 입장 가능 (블랙리스트 X)
 *
 * @param memberId 삭제할 학생 ID
 */
export async function deleteMember(
  memberId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('team_members')
      .delete()
      .eq('id', memberId);
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message || '학생 삭제 중 오류가 발생했어요.' };
  }
}

// ═══════════════════════════════════════════════════════
// ⭐⭐⭐ NEW Phase 4 (20번): 관리자 팀장 교체 ⭐⭐⭐
// 4번 양도와의 차이:
// - 4번: 학생 본인이 사퇴/양도 (leader-setup에서만)
// - 20번: 관리자가 강제 교체 (게임 시작 후에도 가능)
// - 게임 시작 여부에 따라 동작 분기:
//   * 게임 시작 전 → 직무/산업군/수준 초기화 (transferLeader와 동일)
//   * 게임 시작 후 → is_leader 플래그만 변경 (게임 데이터 보존)
// ═══════════════════════════════════════════════════════

/**
 * 관리자가 팀장 강제 교체
 * - 게임 시작 전: 직무/산업군/수준 모두 초기화 (새 팀장이 처음부터 다시)
 * - 게임 시작 후: is_leader 플래그 변경 + 직무 스왑 (옛 팀장 ↔ 새 팀장 role_code 교환)
 *                다른 데이터(카드 응답, 인사이트, 산업군 등)는 모두 보존
 *
 * @param teamId 팀 ID
 * @param oldLeaderId 현재 팀장 ID
 * @param newLeaderId 새 팀장이 될 학생 ID
 */
export async function replaceLeader(
  teamId: string,
  oldLeaderId: string,
  newLeaderId: string,
): Promise<{ success: boolean; error?: string; gameInProgress?: boolean }> {
  try {
    if (oldLeaderId === newLeaderId) {
      return { success: false, error: '동일한 학생에게 교체할 수 없어요.' };
    }

    // 1. 게임 시작 여부 확인
    const { data: teamData, error: teamError } = await supabase
      .from('teams')
      .select('game_started, item, level')
      .eq('id', teamId)
      .single();
    if (teamError || !teamData) {
      return { success: false, error: '팀 정보를 불러올 수 없어요.' };
    }
    const gameInProgress = teamData.game_started === true;

    // 2. 양쪽 멤버 정보 조회 (검증 + 직무 스왑용)
    const { data: bothMembers } = await supabase
      .from('team_members')
      .select('id, role_code, role_assigned_at')
      .eq('team_id', teamId)
      .in('id', [oldLeaderId, newLeaderId]);
    if (!bothMembers || bothMembers.length !== 2) {
      return { success: false, error: '팀원 정보를 불러올 수 없어요.' };
    }
    const oldLeaderMember = bothMembers.find(m => m.id === oldLeaderId);
    const newLeaderMember = bothMembers.find(m => m.id === newLeaderId);
    if (!oldLeaderMember || !newLeaderMember) {
      return { success: false, error: '팀원 정보가 올바르지 않아요.' };
    }

    if (gameInProgress) {
      // ⭐⭐⭐ 게임 진행 중: 직무 스왑 ⭐⭐⭐
      // is_leader 플래그 변경 + role_code 서로 교환
      // (다른 데이터는 모두 보존)

      // 3a. 옛 팀장 → is_leader=false, role_code=새팀장의 옛 직무
      const { error: e1 } = await supabase
        .from('team_members')
        .update({
          is_leader: false,
          role_code: newLeaderMember.role_code,
          role_assigned_at: newLeaderMember.role_assigned_at,
        })
        .eq('id', oldLeaderId)
        .eq('team_id', teamId);
      if (e1) return { success: false, error: e1.message };

      // 3b. 새 팀장 → is_leader=true, role_code=옛팀장의 옛 직무
      const { error: e2 } = await supabase
        .from('team_members')
        .update({
          is_leader: true,
          role_code: oldLeaderMember.role_code,
          role_assigned_at: oldLeaderMember.role_assigned_at,
        })
        .eq('id', newLeaderId)
        .eq('team_id', teamId);
      if (e2) return { success: false, error: e2.message };
    } else {
      // ⭐⭐⭐ 게임 시작 전: 모든 데이터 초기화 ⭐⭐⭐

      // 3a. 옛 팀장 is_leader = false
      const { error: e1 } = await supabase
        .from('team_members')
        .update({ is_leader: false })
        .eq('id', oldLeaderId)
        .eq('team_id', teamId);
      if (e1) return { success: false, error: e1.message };

      // 3b. 새 팀장 is_leader = true
      const { error: e2 } = await supabase
        .from('team_members')
        .update({ is_leader: true })
        .eq('id', newLeaderId)
        .eq('team_id', teamId);
      if (e2) return { success: false, error: e2.message };

      // 3c. 모든 팀원의 role_code 초기화
      const { error: e3 } = await supabase
        .from('team_members')
        .update({ role_code: null, role_assigned_at: null })
        .eq('team_id', teamId);
      if (e3) return { success: false, error: e3.message };

      // 3d. teams의 산업군, 수준 초기화
      const { error: e4 } = await supabase
        .from('teams')
        .update({ item: null, level: null })
        .eq('id', teamId);
      if (e4) return { success: false, error: e4.message };
    }

    return { success: true, gameInProgress };
  } catch (e: any) {
    return { success: false, error: e.message || '팀장 교체 중 오류가 발생했어요.' };
  }
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

// ═══════════════════════════════════════════════════════
// ⭐⭐⭐ 8번 작업: 일괄 시작 (Bulk Start) ⭐⭐⭐
// ═══════════════════════════════════════════════════════

/**
 * 학급 단위로 게임 일괄 시작
 * - classes.game_started_at에 NOW() 기록
 * - 모든 팀의 game_started=true 업데이트
 * - 학생 welcome 화면이 Realtime으로 감지 → 5초 카운트다운 → game 진입
 */
export async function startClassGame(classId: string): Promise<{ success: boolean; startedAt?: string; error?: string }> {
  try {
    // 1. 학급에 game_started_at 기록 (이게 학생에게 보내는 시그널)
    const now = new Date().toISOString();
    const { error: classError } = await supabase
      .from('classes')
      .update({ game_started_at: now, status: 'active' })
      .eq('id', classId);

    if (classError) {
      console.error('학급 일괄 시작 실패', classError);
      return { success: false, error: classError.message };
    }

    // 2. 학급 내 모든 팀에 game_started=true (이미 true인 팀은 그대로)
    const { error: teamsError } = await supabase
      .from('teams')
      .update({ game_started: true, game_started_at: now })
      .eq('class_id', classId)
      .eq('game_started', false); // 아직 시작 안 한 팀만 업데이트

    if (teamsError) {
      console.error('팀 일괄 시작 실패', teamsError);
      // 학급 시그널은 이미 보냈으니 부분 성공으로 처리
      return { success: true, startedAt: now, error: `팀 업데이트 일부 실패: ${teamsError.message}` };
    }

    return { success: true, startedAt: now };
  } catch (e: any) {
    console.error('startClassGame 오류', e);
    return { success: false, error: e.message };
  }
}

/**
 * 학급의 game_started_at 변경을 Realtime으로 구독
 * 학생 welcome 화면에서 사용
 * - 신호 받으면 카운트다운 시작 → game 진입
 */
export function subscribeToClassGameStart(
  classId: string,
  callback: (gameStartedAt: string) => void,
) {
  // ⭐ FIX: channel name 콜론(:) → 하이픈(-) (Supabase 권장 형식, subscribeToTeamStart와 동일 패턴)
  const channel = supabase
    .channel(`class-game-start-${classId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'classes',
        filter: `id=eq.${classId}`,
      },
      async (payload: any) => {
        // ⭐ FIX: 1차 - payload에 game_started_at 있으면 즉시 사용
        if (payload.new?.game_started_at) {
          callback(payload.new.game_started_at);
          return;
        }
        // ⭐ FIX: 2차 안전망 - payload.new에 없으면 직접 SELECT로 확인
        // (REPLICA IDENTITY DEFAULT 때문에 일부 컬럼이 누락될 수 있음)
        try {
          const { data } = await supabase
            .from('classes')
            .select('game_started_at')
            .eq('id', classId)
            .single();
          if (data?.game_started_at) {
            callback(data.game_started_at);
          }
        } catch (e) {
          // 무시 (다음 UPDATE 이벤트 또는 폴링으로 처리)
        }
      },
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

