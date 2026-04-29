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
};

export type Team = {
  id: string;
  class_id: string;
  name: string;
  join_code: string;
  item?: string;
  level?: string;
  created_at: string;
  member_count?: number;
  completed_count?: number;
};

export type TeamMember = {
  id: string;
  team_id: string;
  name: string;
  is_leader: boolean;
  joined_at: string | null;
};

// ── 간단한 비밀번호 해싱 (btoa 기반) ────────────────────────
// 실제 서비스에서는 bcrypt를 쓰는 게 좋지만,
// 학교 수업용으로는 이 정도로 충분합니다.
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

// 회원가입 (이름 + 학교 + 비밀번호)
export async function signUp(name: string, school: string, password: string): Promise<Teacher> {
  const passwordHash = hashPassword(password, SALT);

  const { data, error } = await supabase
    .from('teachers')
    .insert({ name: name.trim(), school: school.trim(), password_hash: passwordHash })
    .select('id, name, school')
    .single();

  if (error) {
    if (error.code === '23505') throw new Error('이미 가입된 이름+학교 조합입니다.');
    throw new Error('가입 중 오류가 발생했습니다.');
  }

  const teacher = data as Teacher;
  saveTeacherSession(teacher);
  return teacher;
}

// 로그인 (이름 + 학교 + 비밀번호)
export async function signIn(name: string, school: string, password: string): Promise<Teacher> {
  const passwordHash = hashPassword(password, SALT);

  const { data } = await supabase
    .from('teachers')
    .select('id, name, school, password_hash')
    .eq('name', name.trim())
    .eq('school', school.trim())
    .single();

  if (!data) throw new Error('이름 또는 학교가 틀렸습니다.');
  if (data.password_hash !== passwordHash) throw new Error('비밀번호가 틀렸습니다.');

  const teacher: Teacher = { id: data.id, name: data.name, school: data.school };
  saveTeacherSession(teacher);
  return teacher;
}

// 로그아웃
export function signOut() {
  clearTeacherSession();
}

// 현재 로그인한 선생님 정보
export async function getCurrentTeacher(): Promise<Teacher | null> {
  return getTeacherFromSession();
}

// ── 수업 ──────────────────────────────────────────────────

export async function createClass(teacherId: string, { name, school, schedule, description }: {
  name: string; school: string; schedule: string; description: string;
}) {
  const { data, error } = await supabase
    .from('classes')
    .insert({ teacher_id: teacherId, name, school, schedule, description, status: 'active' })
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

// ── 팀 ──────────────────────────────────────────────────

function generateTeamCode(idx: number): string {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const a = letters[Math.floor(idx / 36) % 36];
  const b = letters[idx % 36];
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `DT-${a}${b}-${rand}`;
}

export async function createTeams(classId: string, teamCount: number): Promise<Team[]> {
  const teams = Array.from({ length: teamCount }, (_, i) => ({
    class_id: classId,
    name: `${i + 1}팀`,
    join_code: generateTeamCode(i),
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

  const { data: progress } = await supabase
    .from('card_progress')
    .select('team_id')
    .in('team_id', teamIds)
    .eq('completed', true);

  const memberCount: Record<string, number> = {};
  members?.forEach(m => { memberCount[m.team_id] = (memberCount[m.team_id] || 0) + 1; });

  const completedCount: Record<string, number> = {};
  progress?.forEach(p => { completedCount[p.team_id] = (completedCount[p.team_id] || 0) + 1; });

  return teams.map(t => ({
    ...t,
    member_count: memberCount[t.id] || 0,
    completed_count: completedCount[t.id] || 0,
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
