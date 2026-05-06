// src/types/report.ts
// 보고서 데이터 구조 정의

// 한 카드의 Q1, Q2, Q3 답변
// - answer: 학생이 쓴 메인 답변 (texts.0)
// - interimBlanks: 빈칸 채우기 답변들 (배열)
export type CardQuestionAnswer = {
  id: string;              // "01-1", "01-2", "01-3"
  title: string;            // "산업 코드와 포지셔닝"
  question: string;         // 학생들이 본 미션
  answer: string;           // 학생이 쓴 메인 답변
  interimBlanks: string[];  // 중간 결론 (빈칸 배열)
};

// 직무별 빈칸 답변
export type MemberInsight = {
  memberName: string;       // "김철수"
  roleCode: string;         // "ceo", "market_analyst" 등
  subCardId: string;        // "01-1" - 어느 Q에 대한 답변인지
  content: string;          // 그 직무 사람이 쓴 빈칸 답변
};

// 한 카드의 전체 데이터
export type ReportCard = {
  cardId: string;           // "01"
  titleKo: string;          // "시장 개요 및 산업 정의"
  titleEn: string;          // "Market Overview & Definition"
  
  // Q1, Q2, Q3 (3개)
  questions: CardQuestionAnswer[];
  
  // 직무별 빈칸 답변 (이 카드 전체에 대한)
  memberInsights: MemberInsight[];
  
  // 카드 마지막 한 문장 전략
  oneSentenceStrategy: string;
  strategyFields: string[]; // 4필드 분리값 (산업, 고객, 문제, 채널)
};

// 팀 정보
export type ReportTeamInfo = {
  teamName: string;         // "2팀"
  item: string;             // "💄 K-뷰티 (스킨케어) / 마스크팩"
  level: string;            // "standard"
  members: {
    name: string;
    roleCode: string;
    isLeader: boolean;
  }[];
};

// 보고서 전체 데이터 (raw_data에 들어갈 내용)
export type TeamReportData = {
  team: ReportTeamInfo;
  cards: ReportCard[];      // 16개
  generatedAt: string;      // ISO 시각
  totalAnswers: number;     // 통계용
  completedCardCount: number; // 완료한 카드 수 (16개 중)
};

// DB의 team_reports 테이블 한 줄
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
