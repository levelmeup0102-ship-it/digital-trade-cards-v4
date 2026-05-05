// src/data/roleData.ts
// SIGNAL V3 — 7직무 정의 + 새 카드 16개 기준 담당 매핑

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
  // ⭐ V3: 새 카드 16개 기준 핵심 담당 카드
  primaryCards: string[];
}

// ⭐ V3 직무별 담당 카드 매핑
// 매핑 근거: 카드 카테고리(시장이해/전략설계/고객인사이트/실행설계) + 직무 전문성
export const ROLES: Role[] = [
  {
    code: 'ceo',
    nameKr: '대표이사',
    nameEn: 'CEO',
    icon: '👑',
    color: '#E7FE55', // green
    // CEO: SWOT 종합·AI 제언·확장 네트워크·지속가능성 (전략 종합 카드들)
    primaryCards: ['08', '09', '13', '15'],
  },
  {
    code: 'market_analyst',
    nameKr: '시장 분석가',
    nameEn: 'Market Analyst',
    icon: '📊',
    color: '#06B6D4', // cyan
    // 시장 분석가: 시장 이해 카테고리 메인 + PoC 데이터 분석
    primaryCards: ['01', '02', '03', '10'],
  },
  {
    code: 'brand_strategist',
    nameKr: '브랜드 전략가',
    nameEn: 'Brand Strategist',
    icon: '🎨',
    color: '#8B5CF6', // purple
    // 브랜드 전략가: 차별화·IP 보호·지속가능 메시지
    primaryCards: ['04', '12', '15'],
  },
  {
    code: 'customer_insight',
    nameKr: '고객 인사이트 리드',
    nameEn: 'Customer Insight',
    icon: '💬',
    color: '#FF6FB5', // pink
    // 고객 인사이트: 타깃 선정·고객 분석
    primaryCards: ['03', '07'],
  },
  {
    code: 'global_sales',
    nameKr: '해외영업 매니저',
    nameEn: 'Global Sales',
    icon: '🌍',
    color: '#3B82F6', // blue
    // 해외영업: 진출국·확장·바이어 컨택 (실행 설계 핵심)
    primaryCards: ['11', '13', '14'],
  },
  {
    code: 'digital_marketer',
    nameKr: '디지털 마케터',
    nameEn: 'Digital Marketer',
    icon: '📱',
    color: '#FFC72C', // amber
    // 디지털 마케터: 시장 변화·트렌드·바이어 접근
    primaryCards: ['05', '14'],
  },
  {
    code: 'compliance_officer',
    nameKr: '무역 규제 전문가',
    nameEn: 'Compliance Officer',
    icon: '📋',
    color: '#FF671F', // orange
    // 무역 규제: 규제·인증 전문
    primaryCards: ['06', '16'],
  },
];

// 헬퍼
export function getRole(code: RoleCode | string | null | undefined): Role | null {
  if (!code) return null;
  return ROLES.find(r => r.code === code) || null;
}

// 카드 ID로 핵심 담당 직무들 찾기
export function getRolesForCard(cardId: string): Role[] {
  return ROLES.filter(r => r.primaryCards.includes(cardId));
}
