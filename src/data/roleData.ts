// src/data/roleData.ts
// SIGNAL V3 — 7직무 정의 + 새 카드 16개 기준 담당 매핑
// ⚠️ 이 파일은 V2 호환을 위한 모든 필드 포함:
//    - idCode (화면 표시용 ID)
//    - isLeader (팀장 여부)
//    - skills (능력치 배열)
//    - catchphrase (명대사)
// GitHub에 올릴 때 반드시 이 버전이어야 RoleCard.tsx 빌드가 통과합니다!

export type RoleCode =
  | 'ceo'
  | 'market_analyst'
  | 'brand_strategist'
  | 'customer_insight'
  | 'global_sales'
  | 'digital_marketer'
  | 'compliance_officer';

export interface Skill {
  name: string;
  level: number;  // 1~5
}

export interface Role {
  code: RoleCode;
  idCode: string;             // V2 호환 — 화면 표시용 ID 코드 (예: "CEO-001")
  nameKr: string;
  nameEn: string;
  icon: string;
  color: string;
  image: string;
  description: string;
  isLeader?: boolean;         // V2 호환 — 팀장 여부 (CEO만 true)
  skills: Skill[];            // V2 호환 — 능력치 (각 1~5)
  catchphrase: string;        // V2 호환 — 명대사
  primaryCards: string[];     // V3 — 핵심 담당 카드
}

// V2 호환 — RoleInfo는 Role의 별칭
export type RoleInfo = Role;

// ROLES — 객체 형태 (V2 student/join 페이지와 호환)
export const ROLES: Record<RoleCode, Role> = {
  ceo: {
    code: 'ceo',
    idCode: 'CEO-001',
    nameKr: '대표이사',
    nameEn: 'CEO',
    icon: '👑',
    color: '#E7FE55',
    image: '/roles/ceo.jpg',
    description: '팀 전체를 이끌고 최종 의사결정을 내립니다. SWOT·전략결론 카드를 주도해요.',
    isLeader: true,
    skills: [
      { name: '의사결정', level: 5 },
      { name: '통솔력',   level: 5 },
      { name: '비전',     level: 4 },
      { name: '협상력',   level: 4 },
    ],
    catchphrase: '결단은 내가, 영광은 모두에게.',
    primaryCards: ['08', '09', '13', '15'],
  },
  market_analyst: {
    code: 'market_analyst',
    idCode: 'MA-002',
    nameKr: '시장 분석가',
    nameEn: 'Market Analyst',
    icon: '📊',
    color: '#06B6D4',
    image: '/roles/analyst.jpg',
    description: '데이터·통계로 시장을 분석하고 가능성을 예측합니다. 시장 이해 카테고리를 주도해요.',
    isLeader: false,
    skills: [
      { name: '데이터 분석', level: 5 },
      { name: '시장 조사',   level: 5 },
      { name: '통계',         level: 4 },
      { name: '예측력',       level: 4 },
    ],
    catchphrase: '숫자가 말해주는 진실을 읽습니다.',
    primaryCards: ['01', '02', '03', '10'],
  },
  brand_strategist: {
    code: 'brand_strategist',
    idCode: 'BS-003',
    nameKr: '브랜드 전략가',
    nameEn: 'Brand Strategist',
    icon: '🎨',
    color: '#8B5CF6',
    image: '/roles/brand.jpg',
    description: '브랜드 정체성과 차별화 전략을 만듭니다. 경쟁환경·IP 보호 카드를 주도해요.',
    isLeader: false,
    skills: [
      { name: '브랜딩',       level: 5 },
      { name: '차별화',       level: 5 },
      { name: '디자인 감각',  level: 4 },
      { name: '스토리텔링',   level: 4 },
    ],
    catchphrase: '브랜드는 고객과의 약속입니다.',
    primaryCards: ['04', '12', '15'],
  },
  customer_insight: {
    code: 'customer_insight',
    idCode: 'CI-004',
    nameKr: '고객 인사이트 리드',
    nameEn: 'Customer Insight',
    icon: '💬',
    color: '#FF6FB5',
    image: '/roles/customer.jpg',
    description: '고객의 진짜 욕구와 행동을 깊이 이해합니다. 타깃 선정·고객 분석 카드를 주도해요.',
    isLeader: false,
    skills: [
      { name: '공감력',       level: 5 },
      { name: '행동 분석',    level: 5 },
      { name: '인터뷰',       level: 4 },
      { name: '페르소나',     level: 4 },
    ],
    catchphrase: '고객의 마음을 읽는 것이 시작입니다.',
    primaryCards: ['03', '07'],
  },
  global_sales: {
    code: 'global_sales',
    idCode: 'GS-005',
    nameKr: '해외영업 매니저',
    nameEn: 'Global Sales',
    icon: '🌍',
    color: '#3B82F6',
    image: '/roles/global.jpg',
    description: '글로벌 시장 진출과 바이어·파트너 발굴을 담당합니다. 진출국·확장 카드를 주도해요.',
    isLeader: false,
    skills: [
      { name: '협상력',       level: 5 },
      { name: '글로벌 감각',  level: 5 },
      { name: '네트워킹',     level: 4 },
      { name: '언어 능력',    level: 4 },
    ],
    catchphrase: '세계 어디든 다리를 놓습니다.',
    primaryCards: ['11', '13', '14'],
  },
  digital_marketer: {
    code: 'digital_marketer',
    idCode: 'DM-006',
    nameKr: '디지털 마케터',
    nameEn: 'Digital Marketer',
    icon: '📱',
    color: '#FFC72C',
    image: '/roles/marketer.jpg',
    description: '디지털 채널과 콘텐츠로 브랜드를 알립니다. 시장 변화·바이어 접근 카드를 주도해요.',
    isLeader: false,
    skills: [
      { name: '콘텐츠 기획',  level: 5 },
      { name: '디지털 채널',  level: 5 },
      { name: '트렌드 감각',  level: 4 },
      { name: '광고 운영',    level: 4 },
    ],
    catchphrase: '1초 안에 마음을 사로잡습니다.',
    primaryCards: ['05', '14'],
  },
  compliance_officer: {
    code: 'compliance_officer',
    idCode: 'CO-007',
    nameKr: '무역 규제 전문가',
    nameEn: 'Compliance Officer',
    icon: '📋',
    color: '#FF671F',
    image: '/roles/compliance.jpg',
    description: '규제·인증·통관 등 법적 요건을 해결합니다. 규제·TBT 카드를 주도해요.',
    isLeader: false,
    skills: [
      { name: '법규 분석',    level: 5 },
      { name: '인증 관리',    level: 5 },
      { name: '통관',         level: 4 },
      { name: '리스크 관리',  level: 4 },
    ],
    catchphrase: '안전이 곧 속도입니다.',
    primaryCards: ['06', '16'],
  },
};

// 배열 형태 (V3 코드에서 .filter / .map 사용 시 활용)
export const ROLES_LIST: Role[] = Object.values(ROLES);

// MEMBER_ROLE_SETS — 팀원 수에 따른 추천 직무 세트 (CEO 제외)
export const MEMBER_ROLE_SETS: Record<number, RoleCode[]> = {
  0: [],
  1: ['market_analyst'],
  2: ['market_analyst', 'global_sales'],
  3: ['market_analyst', 'brand_strategist', 'global_sales'],
  4: ['market_analyst', 'brand_strategist', 'global_sales', 'compliance_officer'],
  5: ['market_analyst', 'brand_strategist', 'customer_insight', 'global_sales', 'digital_marketer'],
  6: ['market_analyst', 'brand_strategist', 'customer_insight', 'global_sales', 'digital_marketer', 'compliance_officer'],
};

// getRecommendedRoles — 팀원 수 기반 추천 직무 배열 반환
export function getRecommendedRoles(nonLeaderCount: number): RoleCode[] {
  if (nonLeaderCount <= 0) return [];
  if (nonLeaderCount >= 6) return MEMBER_ROLE_SETS[6];
  return MEMBER_ROLE_SETS[nonLeaderCount] || [];
}

// getRole — 코드로 Role 찾기
export function getRole(code: RoleCode | string | null | undefined): Role | null {
  if (!code) return null;
  return ROLES[code as RoleCode] || null;
}

// getRolesForCard — 카드 ID로 핵심 담당 직무들 찾기 (V3 신규)
export function getRolesForCard(cardId: string): Role[] {
  return Object.values(ROLES).filter(r => r.primaryCards.includes(cardId));
}
