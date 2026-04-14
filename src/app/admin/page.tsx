'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

const ADMIN_PASSWORD = 'JHY0421';

type Team = {
  id: string;
  name: string;
  join_code: string;
  product_name: string | null;
  created_at: string;
  member_count?: number;
};

export default function AdminPage() {
  const [authed, setAuthed] = useState(false);
  const [pw, setPw] = useState('');
  const [pwError, setPwError] = useState('');

  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [creating, setCreating] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const login = () => {
    if (pw === ADMIN_PASSWORD) { setAuthed(true); setPwError(''); }
    else { setPwError('비밀번호가 틀렸습니다.'); }
  };

  const loadTeams = async () => {
    setLoading(true);
    const { data: teamsData } = await supabase.from('teams').select('*').order('created_at', { ascending: false });
    if (!teamsData) { setLoading(false); return; }

    // 각 팀 접속자 수 조회
    const { data: sessions } = await supabase.from('sessions').select('team_id');
    const countMap: Record<string, number> = {};
    sessions?.forEach(s => { countMap[s.team_id] = (countMap[s.team_id] || 0) + 1; });

    setTeams(teamsData.map(t => ({ ...t, member_count: countMap[t.id] || 0 })));
    setLoading(false);
  };

  useEffect(() => { if (authed) loadTeams(); }, [authed]);

  const createTeam = async () => {
    if (!newTeamName.trim()) return;
    setCreating(true);
    const code = newTeamName.trim().toUpperCase().replace(/\s+/g, '').slice(0, 8) + Math.floor(Math.random() * 100).toString().padStart(2, '0');
    const { error } = await supabase.from('teams').insert({ name: newTeamName.trim(), join_code: code });
    if (!error) { setNewTeamName(''); await loadTeams(); }
    setCreating(false);
  };

  const deleteTeam = async (teamId: string) => {
    await supabase.from('teams').delete().eq('id', teamId);
    setDeleteConfirm(null);
    await loadTeams();
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  // ─── 로그인 화면 ───
  if (!authed) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <p className="text-[10px] tracking-[4px] text-gray-500 uppercase mb-2">Connect AI</p>
          <h1 className="text-2xl font-black text-white mb-1">교수자 페이지</h1>
          <p className="text-gray-500 text-sm">비밀번호를 입력하세요</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <input
            type="password" value={pw} onChange={e => setPw(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && login()}
            placeholder="비밀번호"
            className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white text-sm focus:border-cyan-400 transition mb-3"
          />
          {pwError && <p className="text-red-400 text-[12px] mb-3">⚠ {pwError}</p>}
          <button onClick={login} className="w-full py-3 bg-cyan-500 text-white font-bold rounded-xl transition hover:bg-cyan-600">
            입장하기
          </button>
        </div>
      </div>
    </div>
  );

  // ─── 교수자 대시보드 ───
  return (
    <div className="min-h-screen bg-gray-950 px-4 py-6">
      <div className="max-w-lg mx-auto">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-[10px] tracking-[3px] text-gray-500 uppercase">Connect AI</p>
            <h1 className="text-xl font-black text-white">교수자 대시보드</h1>
          </div>
          <button onClick={() => setAuthed(false)} className="text-gray-500 text-sm hover:text-gray-300 transition">로그아웃</button>
        </div>

        {/* 팀 생성 */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 mb-6">
          <p className="text-sm font-bold text-white mb-3">➕ 새 팀 만들기</p>
          <div className="flex gap-2">
            <input value={newTeamName} onChange={e => setNewTeamName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && createTeam()}
              placeholder="팀 이름 (예: 1팀, A팀)"
              className="flex-1 px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-white text-sm focus:border-cyan-400 transition"
            />
            <button onClick={createTeam} disabled={creating || !newTeamName.trim()}
              className="px-4 py-2.5 bg-cyan-500 text-white font-bold rounded-xl text-sm transition hover:bg-cyan-600 disabled:opacity-40">
              {creating ? '...' : '생성'}
            </button>
          </div>
          <p className="text-[11px] text-gray-600 mt-2">* 팀 코드는 자동으로 생성됩니다</p>
        </div>

        {/* 팀 목록 */}
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm font-bold text-white">팀 목록 ({teams.length}개)</p>
          <button onClick={loadTeams} className="text-[12px] text-gray-500 hover:text-gray-300 transition">🔄 새로고침</button>
        </div>

        {loading ? (
          <div className="text-center py-10 text-gray-500 text-sm">불러오는 중...</div>
        ) : teams.length === 0 ? (
          <div className="text-center py-10 text-gray-600 text-sm">아직 팀이 없어요. 위에서 팀을 만들어주세요!</div>
        ) : (
          <div className="space-y-3">
            {teams.map(team => (
              <div key={team.id} className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <span className="text-white font-bold text-sm">{team.name}</span>
                    <span className="ml-2 text-[11px] text-gray-500">접속자 {team.member_count}명</span>
                  </div>
                  {deleteConfirm === team.id ? (
                    <div className="flex gap-2">
                      <button onClick={() => deleteTeam(team.id)} className="text-[11px] text-red-400 hover:text-red-300">삭제 확인</button>
                      <button onClick={() => setDeleteConfirm(null)} className="text-[11px] text-gray-500 hover:text-gray-300">취소</button>
                    </div>
                  ) : (
                    <button onClick={() => setDeleteConfirm(team.id)} className="text-[11px] text-gray-600 hover:text-red-400 transition">삭제</button>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-gray-800 rounded-lg px-3 py-2">
                    <p className="text-[10px] text-gray-500 mb-0.5">수업 코드</p>
                    <p className="text-white font-black text-lg tracking-widest">{team.join_code}</p>
                  </div>
                  <button onClick={() => copyCode(team.join_code)}
                    className={`px-4 py-3 rounded-xl font-bold text-sm transition ${copiedCode === team.join_code ? 'bg-green-500 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}>
                    {copiedCode === team.join_code ? '✓ 복사됨' : '복사'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 접속 URL */}
        <div className="mt-6 bg-gray-900 border border-gray-800 rounded-2xl p-4">
          <p className="text-[11px] text-gray-500 mb-1">학생 접속 URL</p>
          <p className="text-cyan-400 text-sm font-bold break-all">digital-trade-cards-production.up.railway.app</p>
          <button onClick={() => { navigator.clipboard.writeText('digital-trade-cards-production.up.railway.app'); }}
            className="mt-2 text-[11px] text-gray-500 hover:text-gray-300 transition">URL 복사</button>
        </div>

        <p className="text-center text-gray-700 text-[10px] mt-6">© 2025 CONNECT AI · 동구고등학교</p>
      </div>
    </div>
  );
}
