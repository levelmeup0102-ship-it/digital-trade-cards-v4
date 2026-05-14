'use client';
import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  getCurrentTeacher,
  getClass,
  getTeamsByClass,
  getTeamMembers,
} from '@/lib/teacher';
import type { Teacher, Class, Team, TeamMember } from '@/lib/teacher';
import { supabase } from '@/lib/supabase';

const S = {
  green: '#E7FE55',
  aqua: '#C1E8EB',
  cyan: '#06B6D4',
  purple: '#8B5CF6',
  blue: '#3B82F6',
  pink: '#FF6FB5',
  navy: '#111111',
  bg: '#0A0A0A',
  gold: '#FFD700',
};

// 보고서 상태 (team_reports.status)
type ReportStatus = 'generated' | 'ai_polished' | 'scored';

interface TeamReportSummary {
  id: string;
  team_id: string;
  status: ReportStatus | string;
  total_score: number | null;
  generated_at: string | null;
  ai_polished_at: string | null;
  scored_at: string | null;
  created_at: string | null;
}

interface TeamWithReport extends Team {
  report?: TeamReportSummary;
  members?: TeamMember[];
}

export default function ClassReports() {
  const router = useRouter();
  const params = useParams();
  const classId = params.classId as string;

  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [cls, setCls] = useState<Class | null>(null);
  const [teamsWithReports, setTeamsWithReports] = useState<TeamWithReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingTeamId, setDownloadingTeamId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const t = await getCurrentTeacher();
        if (!t) { router.push('/teacher'); return; }
        setTeacher(t);

        const [clsData, teamsData] = await Promise.all([
          getClass(classId),
          getTeamsByClass(classId),
        ]);

        if (!clsData) {
          router.push('/teacher/dashboard');
          return;
        }

        // 권한 체크: 본인이 만든 학급만 접근 가능
        if (clsData.teacher_id !== t.id) {
          alert('본인이 만든 학급의 보고서만 볼 수 있어요.');
          router.push('/teacher/dashboard');
          return;
        }

        setCls(clsData);

        // 각 팀의 보고서 + 멤버 정보 조회
        const teamIds = teamsData.map(t => t.id);

        const [reportsResult, membersMap] = await Promise.all([
          supabase
            .from('team_reports')
            .select('id, team_id, status, total_score, generated_at, ai_polished_at, scored_at, created_at')
            .in('team_id', teamIds),
          (async () => {
            const map: Record<string, TeamMember[]> = {};
            await Promise.all(
              teamsData.map(async team => {
                const m = await getTeamMembers(team.id);
                map[team.id] = m;
              })
            );
            return map;
          })(),
        ]);

        const reportsByTeam: Record<string, TeamReportSummary> = {};
        (reportsResult.data || []).forEach((r: any) => {
          reportsByTeam[r.team_id] = r;
        });

        const merged: TeamWithReport[] = teamsData.map(team => ({
          ...team,
          report: reportsByTeam[team.id],
          members: membersMap[team.id] || [],
        }));

        setTeamsWithReports(merged);
        setLoading(false);
      } catch (e: any) {
        console.error('보관함 로드 실패:', e);
        setLoading(false);
      }
    })();
  }, [classId, router]);

  const handleDownload = async (team: TeamWithReport) => {
    if (downloadingTeamId) return;
    if (!team.report) {
      alert('이 팀은 아직 보고서가 생성되지 않았어요.');
      return;
    }
    setDownloadingTeamId(team.id);
    // 보고서 페이지로 이동 + autoPdf 트리거
    // 이동 후엔 보고서 페이지에서 자동 PDF 다운로드 처리
    router.push(`/team/${team.id}/report/preview?autoPdf=1`);
  };

  const handleViewReport = (team: TeamWithReport) => {
    if (!team.report) {
      alert('이 팀은 아직 보고서가 생성되지 않았어요.');
      return;
    }
    router.push(`/team/${team.id}/report/preview`);
  };

  // 보고서 상태별 라벨/색
  const getStatusInfo = (status: string | undefined): { label: string; color: string; emoji: string } => {
    if (!status) return { label: '미생성', color: '#666', emoji: '⏳' };
    if (status === 'scored') return { label: '채점 완료', color: S.gold, emoji: '🏆' };
    if (status === 'ai_polished') return { label: 'AI 정리 완료', color: S.cyan, emoji: '✨' };
    if (status === 'generated') return { label: '생성됨', color: S.green, emoji: '📝' };
    return { label: status, color: '#888', emoji: '📋' };
  };

  // 보고서 생성 일자 포맷
  const formatDate = (iso: string | null | undefined): string => {
    if (!iso) return '-';
    try {
      const d = new Date(iso);
      return d.toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' });
    } catch {
      return iso;
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: S.bg }}>
      <p className="font-mono text-sm" style={{ color: S.purple }}>{`>`} 보고서 목록 불러오는 중...</p>
    </div>
  );

  const completedReports = teamsWithReports.filter(t => t.report);
  const pendingTeams = teamsWithReports.filter(t => !t.report);

  return (
    <div className="min-h-screen px-4 py-6 relative overflow-hidden" style={{ background: S.bg }}>

      {/* 오로라 배경 */}
      <div className="fixed inset-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(circle at 20% 25%, ${S.purple}1A 0%, transparent 45%),
            radial-gradient(circle at 80% 60%, ${S.blue}1A 0%, transparent 50%),
            radial-gradient(circle at 50% 95%, ${S.cyan}14 0%, transparent 60%)
          `,
          zIndex: 0,
        }} />

      <div className="max-w-lg mx-auto relative z-10">

        {/* 헤더 */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => router.push(`/teacher/class/${classId}`)}
            className="hover:text-gray-400 transition text-sm font-mono"
            style={{ color: S.purple }}>{`<`} 학급으로</button>
        </div>

        {/* 보관함 헤더 */}
        <div className="rounded-2xl p-5 mb-5 relative overflow-hidden"
          style={{
            background: `linear-gradient(135deg, ${S.purple}15 0%, ${S.blue}10 100%)`,
            border: `1.5px solid ${S.purple}50`,
            boxShadow: `0 0 28px ${S.purple}33, inset 0 0 20px ${S.purple}11`,
          }}>
          <p className="text-[10px] font-mono tracking-widest mb-1 font-bold"
            style={{ color: S.purple, textShadow: `0 0 8px ${S.purple}AA` }}>
            {`>`} REPORT ARCHIVE
          </p>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl">📚</span>
            <h1 className="text-xl font-black text-white"
              style={{ textShadow: `0 0 12px ${S.purple}55` }}>
              보고서 보관함
            </h1>
          </div>
          <p className="text-[12px]" style={{ color: '#aaa' }}>
            <span className="text-white font-bold">{cls?.name}</span>
            <span style={{ color: '#666' }}> · </span>
            <span style={{ color: S.green }}>{completedReports.length}개 완료</span>
            {pendingTeams.length > 0 && (
              <>
                <span style={{ color: '#666' }}> · </span>
                <span style={{ color: '#888' }}>{pendingTeams.length}개 미완료</span>
              </>
            )}
          </p>
        </div>

        {/* 안내 */}
        <div className="rounded-xl p-3 mb-5"
          style={{
            background: 'rgba(139,92,246,0.06)',
            border: `1px solid ${S.purple}33`,
          }}>
          <p className="text-[11px] leading-relaxed" style={{ color: '#aaa' }}>
            💡 게임을 완료한 팀의 전략 보고서를 PDF로 다운로드할 수 있어요.<br/>
            <span style={{ color: S.purple }} className="font-bold">[📥 PDF 다운로드]</span> 클릭 시 자동으로 PDF가 생성됩니다 (약 30초 소요).
          </p>
        </div>

        {/* 완료된 팀 목록 */}
        {completedReports.length > 0 && (
          <div className="mb-6">
            <p className="text-[12px] font-bold mb-3 flex items-center gap-1.5">
              <span style={{ color: S.green }}>{`>`}</span>
              <span style={{ color: S.green }}>✓ 보고서 생성 완료</span>
              <span style={{ color: '#666' }}>({completedReports.length})</span>
            </p>

            <div className="space-y-3">
              {completedReports.map(team => {
                const statusInfo = getStatusInfo(team.report?.status);
                const memberCount = team.members?.length || 0;
                const isDownloading = downloadingTeamId === team.id;
                const reportDate = team.report?.ai_polished_at || team.report?.generated_at || team.report?.created_at;

                return (
                  <div key={team.id} className="rounded-2xl overflow-hidden"
                    style={{
                      background: 'rgba(255,255,255,0.04)',
                      border: `1px solid ${statusInfo.color}33`,
                      boxShadow: `0 0 16px ${statusInfo.color}11`,
                    }}>
                    <div className="p-4">
                      {/* 팀 헤더 */}
                      <div className="flex items-start justify-between mb-3 gap-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-base font-bold text-white mb-1 truncate">
                            {team.name}
                          </h3>
                          <div className="flex items-center gap-2 flex-wrap text-[11px]">
                            {team.item && (
                              <span className="px-2 py-0.5 rounded font-bold"
                                style={{ background: `${S.green}15`, color: S.green }}>
                                {team.item}
                              </span>
                            )}
                            <span style={{ color: '#888' }}>
                              👥 {memberCount}명
                            </span>
                            <span style={{ color: '#666' }}>
                              📅 {formatDate(reportDate)}
                            </span>
                          </div>
                        </div>

                        {/* 상태 + 점수 */}
                        <div className="flex flex-col items-end gap-1 flex-shrink-0">
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-bold"
                            style={{
                              background: `${statusInfo.color}20`,
                              color: statusInfo.color,
                              border: `1px solid ${statusInfo.color}50`,
                            }}>
                            {statusInfo.emoji} {statusInfo.label}
                          </span>
                          {team.report?.total_score != null && (
                            <span className="text-[14px] font-black font-mono"
                              style={{ color: S.gold, textShadow: `0 0 6px ${S.gold}66` }}>
                              {team.report.total_score}점
                            </span>
                          )}
                        </div>
                      </div>

                      {/* 액션 버튼 */}
                      <div className="grid grid-cols-2 gap-2">
                        <button onClick={() => handleViewReport(team)}
                          disabled={isDownloading}
                          className="py-2.5 rounded-xl text-[12px] font-bold transition hover:scale-[1.01] disabled:opacity-50"
                          style={{
                            background: 'rgba(255,255,255,0.06)',
                            border: '1px solid rgba(255,255,255,0.12)',
                            color: '#ccc',
                          }}>
                          👁️ 보고서 보기
                        </button>
                        <button onClick={() => handleDownload(team)}
                          disabled={isDownloading}
                          className="py-2.5 rounded-xl text-[12px] font-black transition hover:scale-[1.02] disabled:opacity-60 disabled:cursor-not-allowed relative overflow-hidden"
                          style={{
                            background: isDownloading
                              ? 'rgba(107,114,128,0.4)'
                              : `linear-gradient(135deg, ${S.purple} 0%, ${S.blue} 100%)`,
                            color: 'white',
                            boxShadow: isDownloading ? 'none' : `0 4px 12px ${S.purple}55`,
                          }}>
                          {isDownloading ? (
                            <span className="flex items-center justify-center gap-1.5">
                              <span className="inline-block w-3 h-3 rounded-full border-2 border-white border-t-transparent"
                                style={{ animation: 'spin 0.8s linear infinite' }} />
                              <span>이동 중...</span>
                            </span>
                          ) : (
                            '📥 PDF 다운로드'
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 미완료 팀 목록 */}
        {pendingTeams.length > 0 && (
          <div className="mb-6">
            <p className="text-[12px] font-bold mb-3 flex items-center gap-1.5">
              <span style={{ color: '#888' }}>{`>`}</span>
              <span style={{ color: '#888' }}>⏳ 미생성</span>
              <span style={{ color: '#666' }}>({pendingTeams.length})</span>
            </p>
            <div className="space-y-2">
              {pendingTeams.map(team => {
                const memberCount = team.members?.length || 0;
                const completedCount = team.completed_count || 0;
                return (
                  <div key={team.id} className="rounded-xl p-3"
                    style={{
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.06)',
                    }}>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-bold text-white truncate">{team.name}</p>
                        <p className="text-[10px] mt-0.5" style={{ color: '#666' }}>
                          👥 {memberCount}명 · 카드 {completedCount}/16 완료
                        </p>
                      </div>
                      <span className="text-[10px] px-2 py-1 rounded-md font-mono"
                        style={{ background: 'rgba(255,255,255,0.06)', color: '#888' }}>
                        게임 진행 중
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 팀 없을 때 */}
        {teamsWithReports.length === 0 && (
          <div className="rounded-2xl p-8 text-center"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <p className="text-2xl mb-2">📭</p>
            <p className="text-[13px] text-white font-bold mb-1">아직 팀이 없어요</p>
            <p className="text-[11px]" style={{ color: '#888' }}>학급에 팀을 만들고 게임을 진행해보세요</p>
          </div>
        )}

        <p className="text-center text-gray-700 text-[10px] mt-8 font-mono">© 2026 SIGNAL — ConnectAI</p>
      </div>

      <style jsx>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
