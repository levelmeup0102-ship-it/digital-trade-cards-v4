// src/lib/reportGenerator.ts
// 보고서 데이터를 6개 테이블에서 모아서 합치는 함수

import { createClient } from '@supabase/supabase-js';
import type {
  TeamReportData,
  ReportCard,
  ReportTeamInfo,
  CardQuestionAnswer,
  MemberInsight,
} from '@/types/report';
import { SIGNAL_GOVERNANCE_CARDS } from '@/data/signalGovernance';

// Supabase 클라이언트 (환경변수에서 URL/KEY 가져옴)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ─────────────────────────────────────────────
// 1. 팀 기본 정보 가져오기
// ─────────────────────────────────────────────
async function fetchTeamInfo(teamId: string) {
  const { data, error } = await supabase
    .from('teams')
    .select('id, name, item, level')
    .eq('id', teamId)
    .single();

  if (error) throw new Error(`팀 정보 조회 실패: ${error.message}`);
  return data;
}

// ─────────────────────────────────────────────
// 2. 팀원 명단 가져오기
// ─────────────────────────────────────────────
async function fetchTeamMembers(teamId: string) {
  const { data, error } = await supabase
    .from('team_members')
    .select('id, name, role_code, is_leader')
    .eq('team_id', teamId);

  if (error) throw new Error(`팀원 조회 실패: ${error.message}`);
  return data || [];
}

// ─────────────────────────────────────────────
// 3. 카드 답변 가져오기 (Q1, Q2, Q3)
// ─────────────────────────────────────────────
async function fetchCardResponses(teamId: string) {
  const { data, error } = await supabase
    .from('card_responses')
    .select('card_id, texts')
    .eq('team_id', teamId);

  if (error) throw new Error(`카드 답변 조회 실패: ${error.message}`);
  
  // card_id를 키로 하는 맵으로 변환
  const map: Record<string, Record<string, string>> = {};
  (data || []).forEach((row) => {
    map[row.card_id] = row.texts || {};
  });
  return map;
}

// ─────────────────────────────────────────────
// 4. 중간 결론 가져오기 (Q탭마다 빈칸)
// ─────────────────────────────────────────────
async function fetchInterimConclusions(teamId: string) {
  const { data, error } = await supabase
    .from('sub_card_interim_conclusions')
    .select('sub_card_id, content')
    .eq('team_id', teamId);

  if (error) throw new Error(`중간 결론 조회 실패: ${error.message}`);
  
  // sub_card_id를 키로 하는 맵
  const map: Record<string, string> = {};
  (data || []).forEach((row) => {
    map[row.sub_card_id] = row.content || '';
  });
  return map;
}

// ─────────────────────────────────────────────
// 5. 카드별 한 문장 전략 가져오기
// ─────────────────────────────────────────────
async function fetchLeaderConclusions(teamId: string) {
  const { data, error } = await supabase
    .from('card_leader_conclusions')
    .select('card_id, one_sentence, fields_json')
    .eq('team_id', teamId);

  if (error) throw new Error(`최종 결론 조회 실패: ${error.message}`);
  
  const map: Record<string, { oneSentence: string; fields: string[] }> = {};
  (data || []).forEach((row) => {
    let fields: string[] = [];
    try {
      fields = JSON.parse(row.fields_json || '[]');
    } catch {
      fields = [];
    }
    map[row.card_id] = {
      oneSentence: row.one_sentence || '',
      fields,
    };
  });
  return map;
}

// ─────────────────────────────────────────────
// 6. 직무별 빈칸 답변 가져오기
// ─────────────────────────────────────────────
async function fetchMemberInsights(teamId: string) {
  const { data, error } = await supabase
    .from('member_insights')
    .select('sub_card_id, role_code, content, member_id')
    .eq('team_id', teamId)
    .eq('is_completed', true);

  if (error) throw new Error(`팀원 인사이트 조회 실패: ${error.message}`);
  return data || [];
}

// ─────────────────────────────────────────────
// 7. 다 합쳐서 보고서 데이터 만들기
// ─────────────────────────────────────────────
function assembleReport(
  teamInfo: { name: string; item: string | null; level: string | null },
  members: { id: string; name: string; role_code: string | null; is_leader: boolean | null }[],
  responses: Record<string, Record<string, string>>,
  interim: Record<string, string>,
  leaderConclusions: Record<string, { oneSentence: string; fields: string[] }>,
  insights: { sub_card_id: string; role_code: string; content: string; member_id: string }[]
): TeamReportData {
  
  // 팀 정보 정리
  const team: ReportTeamInfo = {
    teamName: teamInfo.name,
    item: teamInfo.item || '미설정',
    level: teamInfo.level || 'standard',
    members: members.map((m) => ({
      name: m.name,
      roleCode: m.role_code || 'unassigned',
      isLeader: m.is_leader || false,
    })),
  };

  // member_id → name 매핑 (insight 조회용)
  const memberNameMap: Record<string, string> = {};
  members.forEach((m) => {
    memberNameMap[m.id] = m.name;
  });

  // 16개 카드 데이터 만들기
  const cards: ReportCard[] = SIGNAL_GOVERNANCE_CARDS.map((card) => {
    // Q1, Q2, Q3 답변 + 중간 결론
    const questions: CardQuestionAnswer[] = card.questions.map((q) => {
      const cardTexts = responses[card.id] || {};
      return {
        id: q.id,
        title: q.titleKo,
        question: q.visibleMission,
        answer: cardTexts[q.id] || '',
        interimConclusion: interim[q.id] || '',
      };
    });

    // 이 카드와 관련된 직무별 빈칸 답변
    const memberInsights: MemberInsight[] = insights
      .filter((ins) => ins.sub_card_id.startsWith(card.id))
      .map((ins) => ({
        memberName: memberNameMap[ins.member_id] || '익명',
        roleCode: ins.role_code,
        content: ins.content,
      }));

    // 한 문장 전략
    const leaderConc = leaderConclusions[card.id] || { oneSentence: '', fields: [] };

    return {
      cardId: card.id,
      titleKo: card.titleKo,
      titleEn: card.titleEn,
      questions,
      memberInsights,
      oneSentenceStrategy: leaderConc.oneSentence,
      strategyFields: leaderConc.fields,
    };
  });

  // 총 답변 개수 계산 (통계용)
  const totalAnswers = cards.reduce((sum, card) => {
    const answeredQuestions = card.questions.filter((q) => q.answer.trim() !== '').length;
    return sum + answeredQuestions;
  }, 0);

  return {
    team,
    cards,
    generatedAt: new Date().toISOString(),
    totalAnswers,
  };
}

// ─────────────────────────────────────────────
// 8. team_reports 테이블에 저장
// ─────────────────────────────────────────────
async function saveReport(teamId: string, data: TeamReportData) {
  // 이미 있는지 확인
  const { data: existing } = await supabase
    .from('team_reports')
    .select('id')
    .eq('team_id', teamId)
    .maybeSingle();

  if (existing) {
    // 업데이트
    const { error } = await supabase
      .from('team_reports')
      .update({
        raw_data: data,
        status: 'generated',
        generated_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('team_id', teamId);
    if (error) throw new Error(`보고서 업데이트 실패: ${error.message}`);
  } else {
    // 새로 생성
    const { error } = await supabase
      .from('team_reports')
      .insert({
        team_id: teamId,
        raw_data: data,
        status: 'generated',
      });
    if (error) throw new Error(`보고서 저장 실패: ${error.message}`);
  }
}

// ─────────────────────────────────────────────
// 메인 함수 — 한 번에 다 처리
// ─────────────────────────────────────────────
export async function generateTeamReport(teamId: string): Promise<TeamReportData> {
  // 1~6단계 병렬 조회 (빠르게)
  const [teamInfo, members, responses, interim, leaderConclusions, insights] = await Promise.all([
    fetchTeamInfo(teamId),
    fetchTeamMembers(teamId),
    fetchCardResponses(teamId),
    fetchInterimConclusions(teamId),
    fetchLeaderConclusions(teamId),
    fetchMemberInsights(teamId),
  ]);

  // 7단계 — 합치기
  const reportData = assembleReport(
    teamInfo,
    members,
    responses,
    interim,
    leaderConclusions,
    insights
  );

  // 8단계 — DB 저장
  await saveReport(teamId, reportData);

  return reportData;
}

// ─────────────────────────────────────────────
// 보너스 — 저장된 보고서 가져오기 (재생성 없이)
// ─────────────────────────────────────────────
export async function getStoredReport(teamId: string): Promise<TeamReportData | null> {
  const { data, error } = await supabase
    .from('team_reports')
    .select('raw_data, generated_at')
    .eq('team_id', teamId)
    .maybeSingle();

  if (error || !data) return null;
  return data.raw_data as TeamReportData;
}

// ─────────────────────────────────────────────
// 보너스 — 답변이 보고서 이후에 바뀌었는지 확인
// ─────────────────────────────────────────────
export async function isReportStale(teamId: string): Promise<boolean> {
  const { data: report } = await supabase
    .from('team_reports')
    .select('generated_at')
    .eq('team_id', teamId)
    .maybeSingle();

  if (!report) return true; // 보고서 없으면 = 만들어야 함

  // 카드 답변 중 가장 최근 수정 시각
  const { data: latestResponse } = await supabase
    .from('card_responses')
    .select('updated_at')
    .eq('team_id', teamId)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!latestResponse) return false;

  return new Date(latestResponse.updated_at) > new Date(report.generated_at);
}
