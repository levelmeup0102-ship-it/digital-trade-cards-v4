// src/data/roleData.ts
// SIGNAL V3 — 7직무 정의 + 새 카드 16개 기준 담당 매핑
// V2 호환을 위해 ROLES는 Record<RoleCode, Role> 형태 유지

export type RoleCode =
  | 'ceo'
  | 'market_analyst'
  | 'brand_strategist'
  | 'customer_insight'
  | 'global_sales'
  | 'digital_marketer'
  | 'compliance_officer';

export interface Role {
  code: RoleCode;
  nameKr: string;
  nameEn: string;
  icon: string;
  color: string;
  image: string;
  description: string;
  // ⭐ V3: 새 카드 16개 기준 핵심 담당 카드
  primaryCards: string[];
}

// ⭐ V2 호환 — RoleInfo는 Role의 별칭
export type RoleInfo = Role;

// ⭐ ROLES — 객체 형태 (V2 student/join 페이지와 호환)
export const ROLES: Record<RoleCode, Role> = {
  ceo: {
    code: 'ceo',
    nameKr: '대표이사',
    nameEn: 'CEO',
    icon: '👑',
    color: '#E7FE55',
    image: '/roles/ceo.jpg',
    description: '팀 전체를 이끌고 최종 의사결정을 내립니다. SWOT·전략결론 카드를 주도해요.',
    // CEO: SWOT 종합·AI 제언·확장 네트워크·지속가능성
    primaryCards: ['08', '09', '13', '15'],
  },
  market_analyst: {
    code: 'market_analyst',
    nameKr: '시장 분석가',
    nameEn: 'Market Analyst',
    icon: '📊',
    color: '#06B6D4',
    image: '/roles/analyst.jpg',
    description: '데이터·통계로 시장을 분석하고 가능성을 예측합니다. 시장 이해 카테고리를 주도해요.',
    // 시장 이해 메인 + PoC 데이터 분석
    primaryCards: ['01', '02', '03', '10'],
  },
  brand_strategist: {
    code: 'brand_strategist',
    nameKr: '브랜드 전략가',
    nameEn: 'Brand Strategist',
    icon: '🎨',
    color: '#8B5CF6',
    image: '/roles/brand.jpg',
    description: '브랜드 정체성과 차별화 전략을 만듭니다. 경쟁환경·IP 보호 카드를 주도해요.',
    // 차별화·IP 보호·지속가능 메시지
    primaryCards: ['04', '12', '15'],
  },
  customer_insight: {
    code: 'customer_insight',
    nameKr: '고객 인사이트 리드',
    nameEn: 'Customer Insight',
    icon: '💬',
    color: '#FF6FB5',
    image: '/roles/customer.jpg',
    description: '고객의 진짜 욕구와 행동을 깊이 이해합니다. 타깃 선정·고객 분석 카드를 주도해요.',
    // 타깃 선정·고객 분석
    primaryCards: ['03', '07'],
  },
  global_sales: {
    code: 'global_sales',
    nameKr: '해외영업 매니저',
    nameEn: 'Global Sales',
    icon: '🌍',
    color: '#3B82F6',
    image: '/roles/global.jpg',
    description: '글로벌 시장 진출과 바이어·파트너 발굴을 담당합니다. 진출국·확장 카드를 주도해요.',
    // 진출국·확장·바이어 컨택
    primaryCards: ['11', '13', '14'],
  },
  digital_marketer: {
    code: 'digital_marketer',
    nameKr: '디지털 마케터',
    nameEn: 'Digital Marketer',
    icon: '📱',
    color: '#FFC72C',
    image: '/roles/marketer.jpg',
    description: '디지털 채널과 콘텐츠로 브랜드를 알립니다. 시장 변화·바이어 접근 카드를 주도해요.',
    // 시장 변화·트렌드·바이어 접근
    primaryCards: ['05', '14'],
  },
  compliance_officer: {
    code: 'compliance_officer',
    nameKr: '무역 규제 전문가',
    nameEn: 'Compliance Officer',
    icon: '📋',
    color: '#FF671F',
    image: '/roles/compliance.jpg',
    description: '규제·인증·통관 등 법적 요건을 해결합니다. 규제·TBT 카드를 주도해요.',
    // 규제·인증 전문
    primaryCards: ['06', '16'],
  },
};

// 배열 형태 (V3 코드에서 .filter / .map 사용 시 활용)
export const ROLES_LIST: Role[] = Object.values(ROLES);

// ⭐ MEMBER_ROLE_SETS — 팀원 수에 따른 추천 직무 세트 (CEO 제외)
// 팀원 N명일 때 자동으로 배정될 직무들
export const MEMBER_ROLE_SETS: Record<number, RoleCode[]> = {
  0: [],
  1: ['market_analyst'],
  2: ['market_analyst', 'global_sales'],
  3: ['market_analyst', 'brand_strategist', 'global_sales'],
  4: ['market_analyst', 'brand_strategist', 'global_sales', 'compliance_officer'],
  5: ['market_analyst', 'brand_strategist', 'customer_insight', 'global_sales', 'digital_marketer'],
  6: ['market_analyst', 'brand_strategist', 'customer_insight', 'global_sales', 'digital_marketer', 'compliance_officer'],
};

// ⭐ getRecommendedRoles — 팀원 수 기반 추천 직무 배열 반환
export function getRecommendedRoles(nonLeaderCount: number): RoleCode[] {
  if (nonLeaderCount <= 0) return [];
  if (nonLeaderCount >= 6) return MEMBER_ROLE_SETS[6];
  return MEMBER_ROLE_SETS[nonLeaderCount] || [];
}

// ⭐ getRole — 코드로 Role 찾기
export function getRole(code: RoleCode | string | null | undefined): Role | null {
  if (!code) return null;
  return ROLES[code as RoleCode] || null;
}

// ⭐ getRolesForCard — 카드 ID로 핵심 담당 직무들 찾기 (V3 신규)
export function getRolesForCard(cardId: string): Role[] {
  return Object.values(ROLES).filter(r => r.primaryCards.includes(cardId));
}
