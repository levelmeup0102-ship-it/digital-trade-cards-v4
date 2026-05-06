// src/types/report.ts
// 보고서 데이터 구조 정의

// 한 카드의 Q1, Q2, Q3 답변
export type CardQuestionAnswer = {
  id: string;
  title: string;
  question: string;
  answer: string;
  interimConclusion: string;
};

// 직무별 빈칸 답변
export type MemberInsight = {
  memberName: string;
  roleCode: string;
  content: string;
};

// 한 카드의 전체 데이터
export type ReportCard = {
  cardId: string;
  titleKo: string;
  titleEn: string;
  questions: CardQuestionAnswer[];
  memberInsights: MemberInsight[];
  oneSentenceStrategy: string;
  strategyFields: string[];
};

// 팀 정보
export type ReportTeamInfo = {
  teamName: string;
  item: string;
  level: string;
  members: {
    name: string;
    roleCode: string;
    isLeader: boolean;
  }[];
};

// 보고서 전체 데이터
export type TeamReportData = {
  team: ReportTeamInfo;
  cards: ReportCard[];
  generatedAt: string;
  totalAnswers: number;
};

// DB 테이블 한 줄
export type TeamReportRow = {
  id: string;
  team_id: string;
  status: 'draft' | 'generated' | 'ai_polished' | 'final';
  raw_data: TeamReportData;
  ai_polished: string | null;
  total_score: number | null;
  card_scores: Record<string, number> | null;
  generated_at: string;
  ai_polished_at: string | null;
  scored_at: string | null;
  created_at: string;
  updated_at: string;
};
