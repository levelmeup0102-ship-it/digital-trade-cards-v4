// src/types/index.ts
// SIGNAL 전략카드 게임 타입 정의 V3

export interface CardColor {
  bg: string;
  name: string;
}

export type CardCategory =
  | '시장 이해'
  | '전략 설계'
  | '고객 인사이트'
  | '실행 설계';

export interface SubCard {
  id: string;
  title: string;
  titleEn: string;
  difficulty: number;
  question: string;

  // ⭐ V3 새 필드
  resultUsage: string;          // 이 결과는 최종 '___'에 사용됩니다
  conclusionTemplate: string;   // 중간 결론 빈칸 채우기 템플릿 (___로 빈칸 표시)

  // 호환성 유지: 옛 코드가 참조할 수 있는 필드 (이제는 미사용, 빈 배열로 둠)
  checklist: string[];
}

export interface TopicCard {
  id: string;
  title: string;
  titleEn: string;
  difficulty: number;
  overview: string;
  insightQ: string;
  subs: SubCard[];

  // ⭐ V3 새 필드
  category: CardCategory;            // 시장 이해 / 전략 설계 / 고객 인사이트 / 실행 설계
  finalStrategyTemplate: string;     // 카드별 한 문장 전략 빈칸 채우기 템플릿
}

export interface FlatCard {
  type: 'topic' | 'question';
  data: TopicCard | SubCard;
  parentId: string;
}

// ⭐ V2 호환 — 카드 답변 데이터 구조
export interface CardResponse {
  texts?: Record<string, string>;
  images?: Record<string, string>;
}
