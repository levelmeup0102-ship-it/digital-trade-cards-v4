'use client';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

const ADMIN_PASSWORD = 'JHY0421';
const TOTAL_CARDS = 48; // 질문카드만 (16주제 × 3개)
const TOPICS = [
  '시장 개요 및 정의','시장 규모 및 성장 전망','시장 세분화 분석','경쟁환경 분석',
  '시장 동향 및 기회 요인','규제 및 정책 환경','고객 인사이트 및 수요','SWOT 분석 및 전략',
  '전략 결론 및 AI 제언','PoC 성공률 예측','우선 진출국 및 벤치마킹','아이디어 보호',
  '온보딩 & 확장 전략','타깃기업 리스트','지속가능한 미래','AI·사이버보안',
];

type Team = {
  id: string;
  name: string;
  join_code: string;
  created_at: string;
  member_count?: number;
  completed_count?: number;
};

type Progress = {
  team_id: string;
  card_id: string;
  completed: boolean;
};

type SessionMember = {
  player_name: string;
  role: string;
  last_seen_at: string;
};

export default function AdminPage() {
  const [authed, setAuthed] = useState(false);
  const [pw, setPw] = useState('');
  const [pwError, setPwError] = useState('');
  const [tab, setTab] = useState<'teams' | 'dashboard'>('teams');

  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [creating, setCreating] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // 대시보드
  const [progressData, setProgressData] = useState<Record<string, string[]>>({}); // team_id → completed card_ids
  const [membersData, setMembersData] = useState<Record<string, SessionMember[]>>({}); // team_id → members
  const [expandedTeam, setExpandedTeam] = useState<string | null>(null);
  const [dashLoading, setDashLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const login = () => {
    if (pw === ADMIN_PASSWORD) { setAuthed(true); setPwError(''); }
    else { setPwError('비밀번호가 틀렸습니다.'); }
  };

  const loadTeams = useCallback(async () => {
    setLoading(true);
    const { data: teamsData } = await supabase.from('teams').select('*').order('created_at', { ascending: true });
    if (!teamsData) { setLoading(false); return; }

    const { data: sessions } = await supabase.from('sessions').select('team_id');
    const { data: progress } = await supabase.from('card_progress').select('team_id, completed').eq('completed', true);

    const sessionCount: Record<string, number> = {};
    sessions?.forEach(s => { sessionCount[s.team_id] = (sessionCount[s.team_id] || 0) + 1; });

    const completedCount: Record<string, number> = {};
    progress?.forEach(p => { completedCount[p.team_id] = (completedCount[p.team_id] || 0) + 1; });

    setTeams(teamsData.map(t => ({
      ...t,
      member_count: sessionCount[t.id] || 0,
      completed_count: completedCount[t.id] || 0,
    })));
    setLoading(false);
  }, []);

  const loadDashboard = useCallback(async () => {
    setDashLoading(true);
    const { data: progress } = await supabase
      .from('card_progress').select('team_id, card_id, completed').eq('completed', true);
    const { data: sessions } = await supabase
      .from('sessions').select('team_id, player_name, role, last_seen_at').order('last_seen_at', { ascending: false });

    const prog: Record<string, string[]> = {};
    progress?.forEach(p => {
      if (!prog[p.team_id]) prog[p.team_id] = [];
      prog[p.team_id].push(p.card_id);
    });

    const memb: Record<string, SessionMember[]> = {};
    sessions?.forEach(s => {
      if (!memb[s.team_id]) memb[s.team_id] = [];
      memb[s.team_id].push({ player_name: s.player_name, role: s.role, last_seen_at: s.last_seen_at });
    });

    setProgressData(prog);
    setMembersData(memb);
    setLastUpdated(new Date());
    setDashLoading(false);
  }, []);

  useEffect(() => {
    if (authed) { loadTeams(); loadDashboard(); }
  }, [authed, loadTeams, loadDashboard]);

  const createTeam = async () => {
    if (!newTeamName.trim()) return;
    setCreating(true);
    const code = newTeamName.trim().toUpperCase().replace(/\s+/g, '').slice(0, 6) + Math.floor(Math.random() * 100).toString().padStart(2, '0');
    const { error } = await supabase.from('teams').insert({ name: newTeamName.trim(), join_code: code });
    if (!error) { setNewTeamName(''); await loadTeams(); await loadDashboard(); }
    setCreating(false);
  };

  const deleteTeam = async (teamId: string) => {
    await supabase.from('teams').delete().eq('id', teamId);
    setDeleteConfirm(null);
    await loadTeams(); await loadDashboard();
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const getTopicNum = (cardId: string) => {
    const match = cardId.match(/^(\d+)-/);
    return match ? parseInt(match[1]) : null;
  };

  const getCompletedTopics = (teamId: string) => {
    const completed = progressData[teamId] || [];
    const topicNums = new Set(completed.map(getTopicNum).filter(Boolean));
    return topicNums;
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
          <input type="password" value={pw} onChange={e => setPw(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && login()} placeholder="비밀번호"
            className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white text-sm focus:border-cyan-400 transition mb-3" />
          {pwError && <p className="text-red-400 text-[12px] mb-3">⚠ {pwError}</p>}
          <button onClick={login} className="w-full py-3 bg-cyan-500 text-white font-bold rounded-xl transition hover:bg-cyan-600">입장하기</button>
        </div>
      </div>
    </div>
  );

  // ─── 대시보드 ───
  return (
    <div className="min-h-screen bg-gray-950 px-4 py-6">
      <div className="max-w-lg mx-auto">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-[10px] tracking-[3px] text-gray-500 uppercase">Connect AI</p>
            <h1 className="text-xl font-black text-white">교수자 대시보드</h1>
          </div>
          <button onClick={() => setAuthed(false)} className="text-gray-500 text-sm hover:text-gray-300 transition">로그아웃</button>
        </div>

        {/* 탭 */}
        <div className="flex gap-2 mb-6">
          <button onClick={() => setTab('teams')}
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition ${tab === 'teams' ? 'bg-cyan-500 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>
            🏫 팀 관리
          </button>
          <button onClick={() => { setTab('dashboard'); loadDashboard(); }}
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition ${tab === 'dashboard' ? 'bg-cyan-500 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>
            📊 진행도 모니터링
          </button>
        </div>

        {/* ── 팀 관리 탭 ── */}
        {tab === 'teams' && (
          <>
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 mb-6">
              <p className="text-sm font-bold text-white mb-3">➕ 새 팀 만들기</p>
              <div className="flex gap-2">
                <input value={newTeamName} onChange={e => setNewTeamName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && createTeam()}
                  placeholder="팀 이름 (예: 1팀, A팀)"
                  className="flex-1 px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-white text-sm focus:border-cyan-400 transition" />
                <button onClick={createTeam} disabled={creating || !newTeamName.trim()}
                  className="px-4 py-2.5 bg-cyan-500 text-white font-bold rounded-xl text-sm transition hover:bg-cyan-600 disabled:opacity-40">
                  {creating ? '...' : '생성'}
                </button>
              </div>
              <p className="text-[11px] text-gray-600 mt-2">* 팀 코드는 자동으로 생성됩니다</p>
            </div>

            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm font-bold text-white">팀 목록 ({teams.length}개)</p>
              <button onClick={loadTeams} className="text-[12px] text-gray-500 hover:text-gray-300 transition">🔄 새로고침</button>
            </div>

            {loading ? (
              <div className="text-center py-10 text-gray-500 text-sm">불러오는 중...</div>
            ) : teams.length === 0 ? (
              <div className="text-center py-10 text-gray-600 text-sm">아직 팀이 없어요.</div>
            ) : (
              <div className="space-y-3">
                {teams.map(team => (
                  <div key={team.id} className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <span className="text-white font-bold text-sm">{team.name}</span>
                        <span className="ml-2 text-[11px] text-gray-500">접속자 {team.member_count}명</span>
                        <span className="ml-2 text-[11px] text-cyan-400">완료 {team.completed_count}/{TOTAL_CARDS}</span>
                      </div>
                      {deleteConfirm === team.id ? (
                        <div className="flex gap-2">
                          <button onClick={() => deleteTeam(team.id)} className="text-[11px] text-red-400 hover:text-red-300">삭제 확인</button>
                          <button onClick={() => setDeleteConfirm(null)} className="text-[11px] text-gray-500">취소</button>
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

            <div className="mt-6 bg-gray-900 border border-gray-800 rounded-2xl p-4">
              <p className="text-[11px] text-gray-500 mb-1">학생 접속 URL</p>
              <p className="text-cyan-400 text-sm font-bold break-all">digital-trade-cards-production.up.railway.app</p>
              <button onClick={() => navigator.clipboard.writeText('digital-trade-cards-production.up.railway.app')}
                className="mt-2 text-[11px] text-gray-500 hover:text-gray-300 transition">URL 복사</button>
            </div>
          </>
        )}

        {/* ── 진행도 모니터링 탭 ── */}
        {tab === 'dashboard' && (
          <>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-bold text-white">팀별 진행도</p>
              <div className="flex items-center gap-3">
                {lastUpdated && <span className="text-[10px] text-gray-600">{lastUpdated.toLocaleTimeString()} 기준</span>}
                <button onClick={loadDashboard} disabled={dashLoading}
                  className="text-[12px] text-gray-500 hover:text-gray-300 transition disabled:opacity-40">
                  {dashLoading ? '로딩...' : '🔄 새로고침'}
                </button>
              </div>
            </div>

            {/* 전체 요약 */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-3 text-center">
                <p className="text-2xl font-black text-white">{teams.length}</p>
                <p className="text-[10px] text-gray-500">전체 팀</p>
              </div>
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-3 text-center">
                <p className="text-2xl font-black text-cyan-400">
                  {Object.values(membersData).reduce((sum, m) => sum + m.length, 0)}
                </p>
                <p className="text-[10px] text-gray-500">전체 접속자</p>
              </div>
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-3 text-center">
                <p className="text-2xl font-black text-green-400">
                  {Object.values(progressData).reduce((sum, p) => sum + p.length, 0)}
                </p>
                <p className="text-[10px] text-gray-500">완료 카드 합계</p>
              </div>
            </div>

            {/* 팀별 카드 */}
            {dashLoading ? (
              <div className="text-center py-10 text-gray-500 text-sm">불러오는 중...</div>
            ) : teams.length === 0 ? (
              <div className="text-center py-10 text-gray-600 text-sm">팀을 먼저 만들어주세요.</div>
            ) : (
              <div className="space-y-3">
                {teams.map(team => {
                  const completed = progressData[team.id] || [];
                  const members = membersData[team.id] || [];
                  const completedTopics = getCompletedTopics(team.id);
                  const pct = Math.round((completed.length / TOTAL_CARDS) * 100);
                  const isExpanded = expandedTeam === team.id;

                  return (
                    <div key={team.id} className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
                      {/* 팀 헤더 */}
                      <button onClick={() => setExpandedTeam(isExpanded ? null : team.id)}
                        className="w-full p-4 text-left hover:bg-gray-800/50 transition">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-white font-bold text-sm">{team.name}</span>
                            <span className="text-[10px] bg-gray-800 text-gray-400 px-2 py-0.5 rounded">{team.join_code}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[12px] font-bold text-green-400">{completed.length}/{TOTAL_CARDS}장</span>
                            <span className="text-gray-500 text-xs">{isExpanded ? '▲' : '▼'}</span>
                          </div>
                        </div>
                        {/* 진행도 바 */}
                        <div className="h-2 bg-gray-800 rounded-full overflow-hidden mb-1">
                          <div className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${pct}%`, background: pct >= 80 ? '#4CAF50' : pct >= 50 ? '#00B4D8' : pct >= 20 ? '#F9A825' : '#546E7A' }} />
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[10px] text-gray-500">접속자 {members.length}명</span>
                          <span className="text-[10px] text-gray-500">{pct}% 완료</span>
                        </div>
                      </button>

                      {/* 펼쳐진 상세 */}
                      {isExpanded && (
                        <div className="px-4 pb-4 border-t border-gray-800 pt-3">
                          {/* 주제별 진행 현황 */}
                          <p className="text-[11px] text-gray-400 font-bold mb-2">📋 주제별 완료 현황</p>
                          <div className="grid grid-cols-4 gap-1 mb-4">
                            {Array.from({ length: 16 }, (_, i) => {
                              const num = i + 1;
                              const isDone = completedTopics.has(num);
                              const topicCompleted = completed.filter(c => getTopicNum(c) === num).length;
                              return (
                                <div key={num} className={`rounded-lg p-1.5 text-center ${isDone ? 'bg-green-500/20 border border-green-500/40' : topicCompleted > 0 ? 'bg-cyan-500/10 border border-cyan-500/20' : 'bg-gray-800 border border-gray-700'}`}>
                                  <p className={`text-[10px] font-black ${isDone ? 'text-green-400' : topicCompleted > 0 ? 'text-cyan-400' : 'text-gray-600'}`}>
                                    {String(num).padStart(2, '0')}
                                  </p>
                                  <p className={`text-[9px] ${isDone ? 'text-green-400' : topicCompleted > 0 ? 'text-cyan-400' : 'text-gray-700'}`}>
                                    {isDone ? '✓' : topicCompleted > 0 ? `${topicCompleted}/3` : '-'}
                                  </p>
                                </div>
                              );
                            })}
                          </div>

                          {/* 접속 멤버 */}
                          <p className="text-[11px] text-gray-400 font-bold mb-2">👥 접속 멤버</p>
                          {members.length === 0 ? (
                            <p className="text-[11px] text-gray-600">아직 접속한 멤버가 없어요.</p>
                          ) : (
                            <div className="space-y-1">
                              {members.map((m, idx) => (
                                <div key={idx} className="flex items-center justify-between bg-gray-800 rounded-lg px-3 py-1.5">
                                  <div className="flex items-center gap-2">
                                    <span className="text-[10px]">{m.role === 'leader' ? '👑' : '💬'}</span>
                                    <span className="text-[12px] text-white font-bold">{m.player_name}</span>
                                    <span className="text-[10px] text-gray-500">{m.role === 'leader' ? '팀장' : '팀원'}</span>
                                  </div>
                                  <span className="text-[10px] text-gray-600">
                                    {new Date(m.last_seen_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        <p className="text-center text-gray-700 text-[10px] mt-8">© 2026 CONNECT AI</p>
      </div>
    </div>
  );
}
