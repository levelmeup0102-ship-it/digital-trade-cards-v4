import { supabase } from './supabase';

// ── 타입 ──────────────────────────────────────────────────
export type Teacher = {
  id: string;
  email: string;
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

// ── 이름 → 가짜 이메일 변환 ────────────────────────────────
// 이메일 발송 없이 Supabase Auth 사용하기 위한 내부 처리
function nameToFakeEmail(name: string, school: string): string {
  const cleaned = name.trim().replace(/\s+/g, '').toLowerCase();
  const schoolCleaned = school.trim().replace(/\s+/g, '').toLowerCase().slice(0, 10);
  return `${cleaned}_${schoolCleaned}@signal.local`;
}

// ── 인증 ──────────────────────────────────────────────────

// 회원가입 (이름 + 비밀번호만 — 이메일 발송 없음)
export async function signUp(name: string, school: string, password: string) {
  const fakeEmail = nameToFakeEmail(name, school);

  const { data, error } = await supabase.auth.signUp({
    email: fakeEmail,
    password,
    options: {
      data: { name, school },
    },
  });
  if (error) {
    if (error.message?.includes('already registered')) {
      throw new Error('이미 가입된 이름입니다. 다른 이름을 사용하거나 로그인해주세요.');
    }
    throw error;
  }

  // profiles 테이블에 저장
  if (data.user) {
    await supabase.from('profiles').upsert({
      id: data.user.id,
      email: fakeEmail,
      name,
      school,
      role: 'teacher',
    });
  }

  // 가입 후 바로 로그인
  await supabase.auth.signInWithPassword({ email: fakeEmail, password });

  return data;
}

// 로그인 (이름 + 학교 + 비밀번호)
export async function signIn(name: string, school: string, password: string) {
  const fakeEmail = nameToFakeEmail(name, school);
  const { data, error } = await supabase.auth.signInWithPassword({ email: fakeEmail, password });
  if (error) {
    if (error.message?.includes('Invalid login')) {
      throw new Error('이름, 학교 또는 비밀번호가 틀렸습니다.');
    }
    throw error;
  }
  return data;
}

// 로그아웃
export async function signOut() {
  await supabase.auth.signOut();
}

// 현재 로그인한 선생님 정보
export async function getCurrentTeacher(): Promise<Teacher | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from('profiles')
    .select('id, email, name, school')
    .eq('id', user.id)
    .single();

  return data as Teacher | null;
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
  const year = new Date().getFullYear();
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const a = letters[Math.floor(idx / 26) % 26];
  const b = letters[idx % 26];
  return `DT-${year}-${a}${b}`;
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
