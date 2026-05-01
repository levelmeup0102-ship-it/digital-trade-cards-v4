// ─────────────────────────────────────────────
// SIGNAL · 카드별 한 문장 전략 템플릿
// ─────────────────────────────────────────────
// 각 카드의 주제에 맞는 4필드 + 템플릿을 정의합니다.
// SignalCard 결론 탭에서 카드 ID에 따라 자동으로 다른 템플릿이 적용됩니다.
// ─────────────────────────────────────────────

export interface CardTemplate {
  /** 4개 필드의 라벨 */
  fieldLabels: [string, string, string, string];
  /** 4개 필드의 placeholder (예시) */
  placeholders: [string, string, string, string];
  /** 한 문장 합성 함수 — 4개 값을 받아 문장 반환 */
  buildSentence: (f0: string, f1: string, f2: string, f3: string) => string;
}

const tag = (val: string, label: string) => val.trim() ? val : `[${label}]`;

export const CARD_TEMPLATES: Record<string, CardTemplate> = {
  // ─── 카드 01: 시장 개요 및 정의 ───
  '01': {
    fieldLabels: ['산업', '핵심 고객', '우리 포지션', '진입 시점'],
    placeholders: ['예) K-뷰티 스킨케어', '예) 20대 동남아 여성', '예) 가성비 프리미엄', '예) 2026년 상반기'],
    buildSentence: (industry, customer, position, timing) =>
      `우리는 ${tag(industry, '산업')} 시장에서 ${tag(customer, '핵심 고객')}을 대상으로 ${tag(position, '우리 포지션')}의 위치를 ${tag(timing, '진입 시점')}에 확보한다`,
  },

  // ─── 카드 02: 시장 분석 및 성장 구조 ───
  '02': {
    fieldLabels: ['현재 시장 규모', '성장 동인', '5년 후 규모', '우리 목표'],
    placeholders: ['예) 50억 달러', '예) 디지털 전환·ESG', '예) 120억 달러', '예) 시장 점유율 3%'],
    buildSentence: (current, driver, future, goal) =>
      `우리는 ${tag(current, '현재 시장 규모')}의 시장이 ${tag(driver, '성장 동인')} 영향으로 ${tag(future, '5년 후 규모')}까지 성장하는 흐름에서 ${tag(goal, '우리 목표')}를 달성한다`,
  },

  // ─── 카드 03: 시장 세분화 및 타겟 전략 ───
  '03': {
    fieldLabels: ['핵심 세그먼트', '세그먼트 크기', '선택 이유', '접근 메시지'],
    placeholders: ['예) 민감성 피부 20대', '예) 약 200만 명', '예) 미충족 니즈 큼', '예) "순한 성분, 빠른 진정"'],
    buildSentence: (segment, size, reason, message) =>
      `우리는 ${tag(segment, '핵심 세그먼트')}(약 ${tag(size, '세그먼트 크기')})를 ${tag(reason, '선택 이유')} 때문에 우선 공략하며 ${tag(message, '접근 메시지')}로 다가간다`,
  },

  // ─── 카드 04: 경쟁 분석 및 차별화 전략 ───
  '04': {
    fieldLabels: ['주요 경쟁사', '경쟁사 강점', '우리 강점', '차별화 전략'],
    placeholders: ['예) 닥터자르트, 라네즈', '예) 글로벌 유통망', '예) 친환경 패키지', '예) 비건 인증 + SNS 마케팅'],
    buildSentence: (competitor, theirStrength, ourStrength, strategy) =>
      `우리는 ${tag(competitor, '주요 경쟁사')}의 ${tag(theirStrength, '경쟁사 강점')}에 맞서 ${tag(ourStrength, '우리 강점')}을 무기로 ${tag(strategy, '차별화 전략')}으로 차별화한다`,
  },

  // ─── 카드 05: 시장 기회 분석 및 전략 포인트 ───
  '05': {
    fieldLabels: ['핵심 트렌드', '트렌드 영향', '우리의 기회', '실행 시점'],
    placeholders: ['예) 클린뷰티 확산', '예) 천연 성분 수요 ↑', '예) 제주 원료 차별화', '예) 2026년 Q2 출시'],
    buildSentence: (trend, impact, opportunity, timing) =>
      `우리는 ${tag(trend, '핵심 트렌드')}가 ${tag(impact, '트렌드 영향')}을 만드는 시점에 ${tag(opportunity, '우리의 기회')}를 ${tag(timing, '실행 시점')}에 잡는다`,
  },

  // ─── 카드 06: 규제 및 시장 진입 조건 ───
  '06': {
    fieldLabels: ['핵심 규제', '필수 인증', '대응 방법', '협력 기관'],
    placeholders: ['예) EU 화장품 규정', '예) CPNP 등록', '예) 현지 대리인 선임', '예) KOTRA, 무역협회'],
    buildSentence: (regulation, certification, method, partner) =>
      `우리는 ${tag(regulation, '핵심 규제')}의 ${tag(certification, '필수 인증')} 요건을 ${tag(partner, '협력 기관')}과 함께 ${tag(method, '대응 방법')}으로 충족한다`,
  },

  // ─── 카드 07: 고객 구매 여정 및 경험 설계 ───
  '07': {
    fieldLabels: ['핵심 페르소나', '고객 문제', '우리 해결책', '재사용 동인'],
    placeholders: ['예) 20대 직장인 여성', '예) 시간 부족·민감 피부', '예) 5분 마스크팩 루틴', '예) 정기구독 + 커뮤니티'],
    buildSentence: (persona, problem, solution, retention) =>
      `우리는 ${tag(persona, '핵심 페르소나')}의 ${tag(problem, '고객 문제')}를 ${tag(solution, '우리 해결책')}으로 풀고 ${tag(retention, '재사용 동인')}으로 반복 구매를 유도한다`,
  },

  // ─── 카드 08: 비즈니스 모델 및 수익 구조 ───
  '08': {
    fieldLabels: ['핵심 수익원', '주요 비용', '수익화 방식', '1년 목표 매출'],
    placeholders: ['예) 직접 판매 + 정기구독', '예) 원재료·물류·마케팅', '예) D2C 70% + B2B 30%', '예) 12억 원'],
    buildSentence: (revenue, cost, model, target) =>
      `우리는 ${tag(revenue, '핵심 수익원')}을 ${tag(model, '수익화 방식')}으로 운영하며 ${tag(cost, '주요 비용')}을 관리하여 1년 안에 ${tag(target, '1년 목표 매출')}을 달성한다`,
  },

  // ─── 카드 09: 가격 전략 및 시장 포지셔닝 ───
  '09': {
    fieldLabels: ['가격대', '가격 전략', '포지션', '핵심 메시지'],
    placeholders: ['예) 25~35달러', '예) 프리미엄 침투가', '예) 합리적 클린뷰티', '예) "하루 1달러로 누리는 클린"'],
    buildSentence: (price, strategy, position, message) =>
      `우리는 ${tag(price, '가격대')}를 ${tag(strategy, '가격 전략')}으로 책정해 ${tag(position, '포지션')} 위치에서 ${tag(message, '핵심 메시지')}로 어필한다`,
  },

  // ─── 카드 10: 제품 전략 및 가치 제안 ───
  '10': {
    fieldLabels: ['핵심 가치', '주요 기능', '차별화 포인트', '제품 로드맵'],
    placeholders: ['예) 빠른 진정 + 지속 보습', '예) 시카·히알루론·세라마이드', '예) 비건 + 무향', '예) 6개월: 라인 확장'],
    buildSentence: (value, features, differentiator, roadmap) =>
      `우리는 ${tag(value, '핵심 가치')}를 ${tag(features, '주요 기능')}으로 구현하고 ${tag(differentiator, '차별화 포인트')}로 차별화하며 ${tag(roadmap, '제품 로드맵')}으로 발전시킨다`,
  },

  // ─── 카드 11: 유통 및 판매 채널 전략 ───
  '11': {
    fieldLabels: ['주력 채널', '진입 방식', '핵심 파트너', '확장 채널'],
    placeholders: ['예) Sephora, Olive Young', '예) 입점 + 마케팅 공동집행', '예) 현지 디스트리뷰터', '예) 자사몰 + Amazon'],
    buildSentence: (mainChannel, approach, partner, expansion) =>
      `우리는 ${tag(mainChannel, '주력 채널')}에 ${tag(partner, '핵심 파트너')}와 함께 ${tag(approach, '진입 방식')}으로 진입하고 ${tag(expansion, '확장 채널')}로 확장한다`,
  },

  // ─── 카드 12: 마케팅 및 고객 확보 전략 ───
  '12': {
    fieldLabels: ['핵심 채널', '핵심 메시지', '초기 고객 확보 목표', '확보 방법'],
    placeholders: ['예) 인스타·틱톡·유튜브', '예) "민감피부도 빛나게"', '예) 첫 3개월 1만 명', '예) 인플루언서 + 체험단'],
    buildSentence: (channel, message, target, method) =>
      `우리는 ${tag(channel, '핵심 채널')}에서 ${tag(message, '핵심 메시지')}로 ${tag(method, '확보 방법')}을 통해 ${tag(target, '초기 고객 확보 목표')}을 확보한다`,
  },

  // ─── 카드 13: 시장 진입 실행 (Go-to-Market) ───
  '13': {
    fieldLabels: ['파일럿 시장', '실행 주체', '3개월 목표', '확장 시점'],
    placeholders: ['예) 베트남 호치민', '예) 현지 파트너 + 본사 지원', '예) 100개 매장 입점', '예) 6개월 후 태국'],
    buildSentence: (pilot, actor, milestone, expansion) =>
      `우리는 ${tag(pilot, '파일럿 시장')}에서 ${tag(actor, '실행 주체')}와 함께 시작해 3개월 안에 ${tag(milestone, '3개월 목표')}를 달성하고 ${tag(expansion, '확장 시점')}부터 확장한다`,
  },

  // ─── 카드 14: 리스크 분석 및 대응 전략 ───
  '14': {
    fieldLabels: ['최대 리스크', '발생 시점', '예방 조치', '비상 대응'],
    placeholders: ['예) 환율 변동', '예) 진입 6개월차', '예) 환헤지 + 다국가 분산', '예) 가격 조정 + 유통 재협상'],
    buildSentence: (risk, when, prevention, contingency) =>
      `우리는 ${tag(when, '발생 시점')}에 발생할 수 있는 ${tag(risk, '최대 리스크')}를 ${tag(prevention, '예방 조치')}로 사전 대비하고 발생 시 ${tag(contingency, '비상 대응')}으로 즉시 대응한다`,
  },

  // ─── 카드 15: 확장 및 성장 전략 ───
  '15': {
    fieldLabels: ['핵심 성장 동력', '다음 시장', '확장 방식', '3년 비전'],
    placeholders: ['예) 정기구독 + 추천', '예) 동남아 5개국', '예) 현지 파트너십', '예) 동남아 No.1 클린뷰티'],
    buildSentence: (engine, nextMarket, method, vision) =>
      `우리는 ${tag(engine, '핵심 성장 동력')}을 강화하며 ${tag(nextMarket, '다음 시장')}으로 ${tag(method, '확장 방식')}을 통해 확장하여 ${tag(vision, '3년 비전')}을 달성한다`,
  },

  // ─── 카드 16: TBT·인증 장벽 돌파 ───
  '16': {
    fieldLabels: ['주요 장벽', '필수 인증', '돌파 전략', '수출 개시 시점'],
    placeholders: ['예) EU 화장품 안전성 평가', '예) ISO 22716, CPNP', '예) 정부 지원 + 전문 컨설팅', '예) 인증 후 3개월'],
    buildSentence: (barrier, certification, strategy, startTime) =>
      `우리는 ${tag(barrier, '주요 장벽')}을 ${tag(certification, '필수 인증')} 취득과 ${tag(strategy, '돌파 전략')}으로 극복하고 ${tag(startTime, '수출 개시 시점')}에 수출을 개시한다`,
  },
};

/**
 * 카드 ID로 템플릿 조회 (없으면 기본값 반환)
 */
export function getCardTemplate(cardId: string): CardTemplate {
  return CARD_TEMPLATES[cardId] || {
    fieldLabels: ['산업', '고객', '문제', '채널'],
    placeholders: ['K-뷰티', '20대 여성', '가격 장벽', '올리브영'],
    buildSentence: (industry, customer, problem, channel) =>
      `우리는 ${tag(industry, '산업')}에서 ${tag(customer, '고객')}을 대상으로 ${tag(problem, '문제')}를 해결하며 ${tag(channel, '채널')}을 통해 시장에 진입한다`,
  };
}
