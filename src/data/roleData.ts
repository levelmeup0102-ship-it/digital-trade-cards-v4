// ─────────────────────────────────────────────
// SIGNAL · 팀원 직무 (Role) 마스터 데이터
// ─────────────────────────────────────────────
// 디지털 무역 회사의 6가지 직무를 정의합니다.
// 팀장은 CEO로 자동 고정되고,
// 팀원들은 인원수에 따라 4~5개 직무가 배정됩니다.
// ─────────────────────────────────────────────

export interface RoleInfo {
  nameKr: string;        // 한국어 직무명
  nameEn: string;        // 영문 직무명
  icon: string;          // 이모지 아이콘
  color: string;         // 직무 컬러 (헥스코드)
  description: string;   // 짧은 설명
  primaryCards: string[]; // 이 직무가 담당하는 주요 카드
  isLeader?: boolean;    // 팀장 여부
}

export const ROLES: Record<string, RoleInfo> = {
  // ─── 팀장 (자동 고정) ───
  ceo: {
    nameKr: '대표이사',
    nameEn: 'CEO',
    icon: '👑',
    color: '#E7FE55',
    description: '팀 총괄 · 전략 결정 · 결론 작성',
    primaryCards: ['08', '09', '13'],
    isLeader: true,
  },

  // ─── 핵심 4직무 (모든 팀 공통) ───
  market_analyst: {
    nameKr: '시장 분석가',
    nameEn: 'Market Analyst',
    icon: '📊',
    color: '#4FB0C6',
    description: '시장 규모·성장·세분화·동향 조사',
    primaryCards: ['01', '02', '03', '05'],
  },
  brand_strategist: {
    nameKr: '브랜드 전략가',
    nameEn: 'Brand Strategist',
    icon: '🎨',
    color: '#C1A8F0',
    description: '차별화 · 포지셔닝 · SWOT 도출',
    primaryCards: ['04', '08'],
  },
  customer_insight: {
    nameKr: '고객 인사이트 담당',
    nameEn: 'Customer Insight Lead',
    icon: '👥',
    color: '#FF6F91',
    description: '타깃 고객 · 페르소나 · 수요 분석',
    primaryCards: ['07'],
  },
  global_sales: {
    nameKr: '해외영업 담당',
    nameEn: 'Global Sales Manager',
    icon: '🌏',
    color: '#00B5AD',
    description: '진출국 선정 · 벤치마킹 · PoC',
    primaryCards: ['10', '11', '14'],
  },

  // ─── 확장 직무 (5~6명일 때 추가) ───
  digital_marketer: {
    nameKr: '디지털 마케터',
    nameEn: 'Digital Marketer',
    icon: '📱',
    color: '#FFB627',
    description: 'SNS · 광고 · 이커머스 채널 운영',
    primaryCards: ['05', '07'],
  },
  compliance_officer: {
    nameKr: '무역 규제 담당',
    nameEn: 'Compliance Officer',
    icon: '⚖️',
    color: '#C1E8EB',
    description: '관세 · 인증 · 정책 환경 · IP 보호',
    primaryCards: ['06', '12', '16'],
  },
};

export type RoleCode = keyof typeof ROLES;

// ─────────────────────────────────────────────
// 인원수별 추천 직무 조합 (팀장 제외)
// ─────────────────────────────────────────────
// teamSize는 팀장 포함 전체 인원수
// 반환되는 배열은 팀원(팀장 제외)에게 배정할 직무들
// ─────────────────────────────────────────────

export const MEMBER_ROLE_SETS: Record<number, RoleCode[]> = {
  // 4명 팀: 팀장(CEO) + 3명 팀원
  4: ['market_analyst', 'brand_strategist', 'global_sales'],

  // 5명 팀: 팀장(CEO) + 4명 팀원 (핵심 4직무)
  5: ['market_analyst', 'brand_strategist', 'customer_insight', 'global_sales'],

  // 6명 팀: 팀장(CEO) + 5명 팀원 (+ 디지털 마케터)
  6: ['market_analyst', 'brand_strategist', 'customer_insight', 'global_sales', 'digital_marketer'],

  // 7명 팀: 팀장(CEO) + 6명 팀원 (+ 무역 규제)
  7: ['market_analyst', 'brand_strategist', 'customer_insight', 'global_sales', 'digital_marketer', 'compliance_officer'],
};

// ─────────────────────────────────────────────
// 헬퍼 함수
// ─────────────────────────────────────────────

/**
 * 팀원 수에 맞는 추천 직무 목록 반환
 * @param memberCount 팀원 수 (팀장 제외)
 */
export function getRecommendedRoles(memberCount: number): RoleCode[] {
  const teamSize = memberCount + 1; // 팀장 포함
  // 정확히 매칭되는 게 없으면 가장 가까운 큰 사이즈 사용
  if (MEMBER_ROLE_SETS[teamSize]) return MEMBER_ROLE_SETS[teamSize];
  if (teamSize < 4) return MEMBER_ROLE_SETS[4].slice(0, memberCount);
  return MEMBER_ROLE_SETS[7].slice(0, memberCount);
}

/**
 * 직무 코드로 정보 조회
 */
export function getRole(code: string | null | undefined): RoleInfo | null {
  if (!code) return null;
  return ROLES[code as RoleCode] || null;
}

/**
 * 카드 ID에 해당하는 주요 담당 직무들 반환
 * @param cardId 예: "05"
 */
export function getRolesForCard(cardId: string): RoleCode[] {
  return (Object.keys(ROLES) as RoleCode[]).filter(
    code => ROLES[code].primaryCards.includes(cardId)
  );
}

/**
 * 모든 팀원이 직무 배정됐는지 확인
 */
export function isAllMembersAssigned(
  members: Array<{ is_leader: boolean; role_code: string | null }>
): boolean {
  return members.every(m => m.is_leader || m.role_code);
}
