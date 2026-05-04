// ─────────────────────────────────────────────
// SIGNAL · 팀원 직무 (Role) 마스터 데이터
// ─────────────────────────────────────────────
// 디지털 무역 회사의 7가지 직무를 정의합니다.
// 팀장은 CEO로 자동 고정되고,
// 팀원들은 인원수에 따라 4~6개 직무가 배정됩니다.
// ─────────────────────────────────────────────

export interface RoleSkill {
  name: string;     // 스킬 이름
  level: number;    // 1~5
}

export interface RoleInfo {
  nameKr: string;        // 한국어 직무명
  nameEn: string;        // 영문 직무명
  icon: string;          // 이모지 아이콘
  image: string;         // AI 캐릭터 이미지 경로
  color: string;         // 직무 컬러 (헥스코드)
  description: string;   // 짧은 설명
  primaryCards: string[]; // 이 직무가 담당하는 주요 카드
  skills: RoleSkill[];   // 사이버 명함 스킬 게이지 3개
  catchphrase: string;   // 명대사 한 줄
  idCode: string;        // 사이버 명함 ID (예: "CEO-001")
  isLeader?: boolean;    // 팀장 여부
}

export const ROLES: Record<string, RoleInfo> = {
  // ─── 팀장 (자동 고정) ───
  ceo: {
    nameKr: '대표이사',
    nameEn: 'CEO',
    icon: '👑',
    image: '/roles/ceo.jpg',
    color: '#E7FE55',
    description: '팀 총괄 · 전략 결정 · 결론 작성',
    primaryCards: ['08', '09', '13'],
    skills: [
      { name: '의사결정', level: 5 },
      { name: '전략수립', level: 5 },
      { name: '팀관리', level: 4 },
    ],
    catchphrase: '팀의 비전을 제시하고 결단을 내린다',
    idCode: 'CEO-001',
    isLeader: true,
  },

  // ─── 핵심 4직무 (모든 팀 공통) ───
  market_analyst: {
    nameKr: '시장 분석가',
    nameEn: 'Market Analyst',
    icon: '📊',
    image: '/roles/analyst.jpg',
    color: '#4FB0C6',
    description: '시장 규모·성장·세분화·동향 조사',
    primaryCards: ['01', '02', '03', '05'],
    skills: [
      { name: '데이터분석', level: 5 },
      { name: '시장조사', level: 5 },
      { name: '트렌드포착', level: 4 },
    ],
    catchphrase: '숫자 뒤에 숨은 진실을 읽어낸다',
    idCode: 'MKT-002',
  },
  brand_strategist: {
    nameKr: '브랜드 전략가',
    nameEn: 'Brand Strategist',
    icon: '🎨',
    image: '/roles/brand.jpg',
    color: '#C1A8F0',
    description: '차별화 · 포지셔닝 · SWOT 도출',
    primaryCards: ['04', '08'],
    skills: [
      { name: '창의력', level: 5 },
      { name: '포지셔닝', level: 5 },
      { name: '스토리텔링', level: 4 },
    ],
    catchphrase: '경쟁 속에서 우리만의 색을 그린다',
    idCode: 'BRD-003',
  },
  customer_insight: {
    nameKr: '고객 인사이트',
    nameEn: 'Customer Insight Lead',
    icon: '👥',
    image: '/roles/customer.jpg',
    color: '#FF6F91',
    description: '타깃 고객 · 페르소나 · 수요 분석',
    primaryCards: ['07'],
    skills: [
      { name: '공감력', level: 5 },
      { name: '인터뷰', level: 5 },
      { name: '페르소나설계', level: 4 },
    ],
    catchphrase: '고객의 진짜 목소리에 귀를 기울인다',
    idCode: 'CST-004',
  },
  global_sales: {
    nameKr: '해외영업',
    nameEn: 'Global Sales Manager',
    icon: '🌏',
    image: '/roles/global.jpg',
    color: '#00B5AD',
    description: '진출국 선정 · 벤치마킹 · PoC',
    primaryCards: ['10', '11', '14'],
    skills: [
      { name: '협상력', level: 5 },
      { name: '시장개척', level: 5 },
      { name: '글로벌네트워크', level: 4 },
    ],
    catchphrase: '국경을 넘어 새로운 기회를 연다',
    idCode: 'GBL-005',
  },

  // ─── 확장 직무 (5~6명일 때 추가) ───
  digital_marketer: {
    nameKr: '디지털 마케터',
    nameEn: 'Digital Marketer',
    icon: '📱',
    image: '/roles/marketer.jpg',
    color: '#FFB627',
    description: 'SNS · 광고 · 이커머스 채널 운영',
    primaryCards: ['05', '07'],
    skills: [
      { name: '콘텐츠기획', level: 5 },
      { name: '퍼포먼스', level: 4 },
      { name: '채널운영', level: 5 },
    ],
    catchphrase: '클릭 한 번으로 세상에 신호를 보낸다',
    idCode: 'DGT-006',
  },
  compliance_officer: {
    nameKr: '무역 규제',
    nameEn: 'Compliance Officer',
    icon: '⚖️',
    image: '/roles/compliance.jpg',
    color: '#C1E8EB',
    description: '관세 · 인증 · 정책 환경 · IP 보호',
    primaryCards: ['06', '12', '16'],
    skills: [
      { name: '규정분석', level: 5 },
      { name: '리스크관리', level: 5 },
      { name: '문서검토', level: 4 },
    ],
    catchphrase: '보이지 않는 장벽을 지혜로 넘는다',
    idCode: 'CMP-007',
  },
};

export type RoleCode = keyof typeof ROLES;

// ─────────────────────────────────────────────
// 인원수별 추천 직무 조합 (팀장 제외)
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

export function getRecommendedRoles(memberCount: number): RoleCode[] {
  const teamSize = memberCount + 1;
  if (MEMBER_ROLE_SETS[teamSize]) return MEMBER_ROLE_SETS[teamSize];
  if (teamSize < 4) return MEMBER_ROLE_SETS[4].slice(0, memberCount);
  return MEMBER_ROLE_SETS[7].slice(0, memberCount);
}

export function getRole(code: string | null | undefined): RoleInfo | null {
  if (!code) return null;
  return ROLES[code as RoleCode] || null;
}

export function getRolesForCard(cardId: string): RoleCode[] {
  return (Object.keys(ROLES) as RoleCode[]).filter(
    code => ROLES[code].primaryCards.includes(cardId)
  );
}

export function isAllMembersAssigned(
  members: Array<{ is_leader: boolean; role_code: string | null }>
): boolean {
  return members.every(m => m.is_leader || m.role_code);
}
