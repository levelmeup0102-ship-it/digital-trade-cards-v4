// ═══════════════════════════════════════════════════════
// 파일: src/data/rolePrompts.ts (새 파일)
// ─────────────────────────────────────────────────────────
// 직무별로 같은 카드를 다른 관점에서 보도록 프롬프트 정의.
// 학생이 자기 캐릭터(직무)에 몰입하게 만드는 핵심 데이터.
// ─────────────────────────────────────────────────────────
// 사용처: 팀원 화면의 직무 인사이트 입력 textarea placeholder
// ═══════════════════════════════════════════════════════

import type { RoleCode } from './roleData';

// 카드별·직무별 프롬프트
// key: 서브카드 ID (예: "01-1")
// value: { 직무코드: 프롬프트 메시지 }
export const ROLE_PROMPTS: Record<string, Partial<Record<RoleCode, string>>> = {

  // ─── 카드 01: 시장 개요 및 정의 ───
  "01-1": {
    market_analyst: "산업 코드와 시장 규모 관점에서 우리 제품이 어떤 산업에 속하는지 적어보세요",
    brand_strategist: "브랜드 포지셔닝 관점에서 우리 제품의 산업 분류가 의미하는 것은?",
    customer_insight: "고객이 우리 제품을 어떤 산업으로 인식하는지 적어보세요",
    global_sales: "수출 관점에서 HS코드와 관세 영향을 정리해보세요",
    digital_marketer: "디지털 채널에서 우리 제품이 어떤 카테고리에 분류되는지 적어보세요",
    compliance_officer: "산업 분류에 따른 규제·인증 요건을 적어보세요",
  },
  "01-2": {
    market_analyst: "고객 그룹을 데이터 기반으로 어떻게 나눌 수 있을까요?",
    brand_strategist: "고객이 우리를 선택하는 감성적 이유는 무엇일까요?",
    customer_insight: "고객의 진짜 니즈와 사용 상황을 구체적으로 적어보세요",
    global_sales: "해외 고객의 구매 시점과 이유는 국내와 어떻게 다를까요?",
    digital_marketer: "온라인에서 고객이 우리 제품을 찾는 순간은 언제일까요?",
    compliance_officer: "고객층별로 규제·안전 기준이 다른 부분이 있을까요?",
  },
  "01-3": {
    market_analyst: "유통 단계별 시장 규모와 효율을 비교해보세요",
    brand_strategist: "어느 접점에서 브랜드 인상을 가장 강하게 줄 수 있을까요?",
    customer_insight: "고객 입장에서 가장 자연스러운 접점은 어디인가요?",
    global_sales: "해외 진출 시 어느 단계에서 시작하면 좋을까요?",
    digital_marketer: "디지털 채널 중 가장 효과적인 노출 단계는?",
    compliance_officer: "유통 단계별로 발생하는 규제 이슈를 정리해보세요",
  },

  // ─── 카드 02: 시장 규모 및 성장 ───
  "02-1": {
    market_analyst: "글로벌 시장 규모와 CAGR을 데이터 출처와 함께 정리하세요",
    brand_strategist: "시장 규모 안에서 우리가 차지할 수 있는 위치를 그려보세요",
    customer_insight: "시장 규모 중 우리 타깃 고객의 비중은 얼마나 될까요?",
    global_sales: "수출 가능성이 큰 지역의 시장 규모를 적어보세요",
    digital_marketer: "디지털 시장(이커머스/SNS)의 규모는 얼마나 되나요?",
    compliance_officer: "규제가 시장 규모에 미친 영향을 분석해보세요",
  },
  "02-2": {
    market_analyst: "통계 데이터로 본 성장 동인 3가지를 적어보세요",
    brand_strategist: "트렌드와 우리 브랜드 가치가 만나는 지점을 찾아보세요",
    customer_insight: "고객 행동 변화가 시장 성장을 이끄는 부분을 적어보세요",
    global_sales: "해외 시장에서의 성장 동인이 국내와 어떻게 다른가요?",
    digital_marketer: "디지털 전환·SNS 트렌드가 만든 성장 기회를 적어보세요",
    compliance_officer: "ESG·정책이 만든 새로운 성장 동인을 정리하세요",
  },
  "02-3": {
    market_analyst: "향후 3~5년 시장 전망을 데이터 기반으로 예측해보세요",
    brand_strategist: "미래 시장에서 브랜드 차별화 포인트는 무엇이 될까요?",
    customer_insight: "미래 고객의 니즈는 어떻게 진화할까요?",
    global_sales: "가장 빠르게 성장할 진출 가능 국가는 어디인가요?",
    digital_marketer: "AI·메타버스 등 새 채널의 성장 가능성을 적어보세요",
    compliance_officer: "다가올 규제 변화가 시장에 미칠 영향을 예측해보세요",
  },

  // ─── 카드 03: 시장 세분화 및 타겟 ───
  "03-1": {
    market_analyst: "데이터 기반 세분화 기준을 2~3가지 제시하세요",
    brand_strategist: "브랜드 가치와 잘 맞는 세분화 기준을 찾아보세요",
    customer_insight: "고객 행동·관심사 기반으로 세분화 기준을 적어보세요",
    global_sales: "지역·문화별 세분화 기준을 적어보세요",
    digital_marketer: "디지털 행동 데이터 기반 세분화를 시도해보세요",
    compliance_officer: "법적·연령 기준 세분화 요인을 정리하세요",
  },
  "03-2": {
    market_analyst: "각 그룹의 시장 규모와 구매력을 비교 분석하세요",
    brand_strategist: "우리 브랜드 정체성에 가장 부합하는 그룹은?",
    customer_insight: "어떤 그룹이 우리 제품에 가장 깊이 공감할까요?",
    global_sales: "해외 시장에서 진입하기 가장 좋은 그룹을 골라보세요",
    digital_marketer: "디지털 접근성이 가장 높은 그룹을 찾아보세요",
    compliance_officer: "규제상 진입이 가장 용이한 고객 그룹을 적어보세요",
  },
  "03-3": {
    market_analyst: "타깃 그룹에 맞는 데이터 기반 접근 전략을 적어보세요",
    brand_strategist: "타깃에게 전달할 브랜드 메시지를 한 줄로 표현하세요",
    customer_insight: "고객의 일상에 자연스럽게 스며드는 방법을 제안하세요",
    global_sales: "타깃 국가의 진출 채널과 파트너 후보를 적어보세요",
    digital_marketer: "타깃에게 효과적인 디지털 채널과 콘텐츠를 적어보세요",
    compliance_officer: "타깃 시장 진입 시 규제 대응 방안을 정리하세요",
  },

  // ─── 카드 04: 경쟁 분석 ───
  "04-1": {
    market_analyst: "경쟁사 시장 점유율과 매출 규모를 정리하세요",
    brand_strategist: "경쟁사들의 브랜드 포지셔닝을 비교하세요",
    customer_insight: "고객이 경쟁사를 선택하는 이유를 정리하세요",
    global_sales: "해외 시장 주요 경쟁사를 조사하세요",
    digital_marketer: "경쟁사의 디지털·SNS 활동을 분석하세요",
    compliance_officer: "경쟁사들이 보유한 인증·규제 대응 현황을 적어보세요",
  },
  "04-2": {
    market_analyst: "경쟁사 비즈니스 모델과 수익 구조를 분석하세요",
    brand_strategist: "경쟁사가 강조하는 핵심 가치 제안을 정리하세요",
    customer_insight: "경쟁사 고객의 충성도와 이탈 원인을 적어보세요",
    global_sales: "경쟁사의 글로벌 진출 전략을 분석하세요",
    digital_marketer: "경쟁사의 디지털 마케팅 성공/실패 사례를 적어보세요",
    compliance_officer: "경쟁사의 규제 리스크와 대응 사례를 적어보세요",
  },
  "04-3": {
    market_analyst: "데이터로 본 우리만의 차별화 포인트를 찾아보세요",
    brand_strategist: "우리 브랜드만의 고유한 가치를 한 문장으로 표현하세요",
    customer_insight: "고객이 우리만 선택하는 결정적 이유를 적어보세요",
    global_sales: "해외에서 우리만이 줄 수 있는 가치를 적어보세요",
    digital_marketer: "디지털 콘텐츠로 차별화할 수 있는 포인트를 제안하세요",
    compliance_officer: "규제·인증 측면에서의 차별화 우위를 찾아보세요",
  },

  // ─── 카드 05: 시장 기회 ───
  "05-1": {
    market_analyst: "최근 시장 데이터에서 보이는 변화 신호를 적어보세요",
    brand_strategist: "트렌드 변화 속에서 브랜드 기회를 찾아보세요",
    customer_insight: "고객 행동 변화가 만들어낸 새로운 니즈를 정리하세요",
    global_sales: "글로벌 시장의 변화가 우리에게 주는 기회를 적어보세요",
    digital_marketer: "디지털·소셜 트렌드 변화 속 기회 포인트를 찾아보세요",
    compliance_officer: "규제 변화가 만든 새 기회와 위협을 정리하세요",
  },
  "05-2": {
    market_analyst: "데이터로 검증된 새로운 시장 기회를 적어보세요",
    brand_strategist: "변화 속에서 우리가 점유할 수 있는 새 포지션을 찾아보세요",
    customer_insight: "충족되지 않은 고객 니즈에서 기회를 발견해보세요",
    global_sales: "새로 열리는 해외 시장이나 채널의 기회를 적어보세요",
    digital_marketer: "새로운 디지털 플랫폼·기술의 기회를 적어보세요",
    compliance_officer: "규제 완화·FTA 등이 만든 진입 기회를 정리하세요",
  },
  "05-3": {
    market_analyst: "기회를 잡기 위한 데이터 기반 전략을 제안하세요",
    brand_strategist: "기회를 활용한 브랜드 캠페인 아이디어를 적어보세요",
    customer_insight: "기회를 고객 가치로 전환하는 방법을 제안하세요",
    global_sales: "기회를 활용한 해외 진출 시나리오를 적어보세요",
    digital_marketer: "기회를 디지털 캠페인으로 실행할 방안을 적어보세요",
    compliance_officer: "기회 활용 시 규제 대응 전략을 정리하세요",
  },

  // ─── 카드 06: 규제 및 진입 조건 ───
  "06-1": {
    market_analyst: "규제가 시장 규모와 진입 비용에 미치는 영향을 정리하세요",
    brand_strategist: "규제 환경에서도 브랜드 가치를 지킬 방법을 제안하세요",
    customer_insight: "규제가 고객 신뢰에 미치는 영향을 적어보세요",
    global_sales: "주요 진출국의 규제·인증 요건을 정리하세요",
    digital_marketer: "디지털·데이터 관련 규제 요건을 정리하세요",
    compliance_officer: "필수 인증과 규제 대응 항목을 모두 정리하세요",
  },
  "06-2": {
    market_analyst: "정책 변화가 시장에 끼친 정량적 영향을 적어보세요",
    brand_strategist: "정책 변화에 맞춰 브랜드가 조정해야 할 부분을 적어보세요",
    customer_insight: "정책 변화가 고객 행동에 어떤 변화를 줬는지 적어보세요",
    global_sales: "주요 국가의 최근 무역 정책 변화를 정리하세요",
    digital_marketer: "디지털 광고·개인정보 관련 정책 변화를 적어보세요",
    compliance_officer: "최근 규제 트렌드와 우리 산업 영향을 정리하세요",
  },
  "06-3": {
    market_analyst: "데이터 기반으로 진입 우선순위를 제안하세요",
    brand_strategist: "규제 속에서도 차별화할 수 있는 진입 전략을 적어보세요",
    customer_insight: "고객 신뢰를 빠르게 얻는 진입 방법을 제안하세요",
    global_sales: "FTA·상호인정 등을 활용한 진입 전략을 적어보세요",
    digital_marketer: "규제 친화적 디지털 진입 방안을 제안하세요",
    compliance_officer: "단계별 인증 취득 로드맵을 작성하세요",
  },

  // ─── 카드 07: 고객 여정 ───
  "07-1": {
    market_analyst: "고객 세그먼트별 데이터 특성을 정리하세요",
    brand_strategist: "각 고객군에게 전달할 브랜드 메시지를 차별화하세요",
    customer_insight: "고객 페르소나와 JTBD를 구체적으로 작성하세요",
    global_sales: "해외 고객과 국내 고객의 차이를 적어보세요",
    digital_marketer: "디지털 행동 기반 고객 페르소나를 작성하세요",
    compliance_officer: "고객군별 규제·법적 요구사항을 정리하세요",
  },
  "07-2": {
    market_analyst: "고객 여정 단계별 전환율을 데이터로 정리하세요",
    brand_strategist: "각 터치포인트에서의 브랜드 경험을 디자인하세요",
    customer_insight: "고객의 감정 변화와 결정적 순간을 매핑하세요",
    global_sales: "해외 고객 여정의 특수성을 정리하세요",
    digital_marketer: "디지털 채널별 고객 여정을 매핑하세요",
    compliance_officer: "고객 여정 중 규제 리스크가 있는 단계를 적어보세요",
  },
  "07-3": {
    market_analyst: "재구매율을 높일 데이터 기반 전략을 제안하세요",
    brand_strategist: "고객 충성도를 만드는 브랜드 경험을 디자인하세요",
    customer_insight: "고객이 다시 찾는 진짜 이유와 재방문 트리거를 적어보세요",
    global_sales: "해외 고객 유지를 위한 사후 관리 방안을 적어보세요",
    digital_marketer: "재방문 유도 디지털 캠페인을 제안하세요",
    compliance_officer: "고객 데이터 활용 시 지켜야 할 규정을 정리하세요",
  },

  // ─── 카드 08: 비즈니스 모델 ───
  "08-1": {
    market_analyst: "수익 모델별 시장 데이터와 사례를 정리하세요",
    brand_strategist: "브랜드 가치와 일치하는 수익 모델을 제안하세요",
    customer_insight: "고객이 기꺼이 지불할 가치 구조를 적어보세요",
    global_sales: "해외에서 통할 수익 모델을 검토하세요",
    digital_marketer: "디지털·구독·광고 기반 수익 옵션을 적어보세요",
    compliance_officer: "수익 모델별 규제·세금 이슈를 정리하세요",
  },
  "08-2": {
    market_analyst: "비용 항목별 산업 평균과 비교하세요",
    brand_strategist: "브랜드 자산 구축에 드는 비용을 적어보세요",
    customer_insight: "고객 획득·유지 비용(CAC·LTV)을 추정하세요",
    global_sales: "해외 진출에 드는 추가 비용을 정리하세요",
    digital_marketer: "디지털 마케팅 비용 구조를 정리하세요",
    compliance_officer: "인증·규제 대응 비용을 정리하세요",
  },
  "08-3": {
    market_analyst: "수익성을 끌어올릴 데이터 기반 전략을 제안하세요",
    brand_strategist: "프리미엄 전략으로 마진을 높일 방안을 적어보세요",
    customer_insight: "고객 LTV를 높일 방법을 제안하세요",
    global_sales: "해외 시장에서 수익성을 높일 전략을 적어보세요",
    digital_marketer: "퍼포먼스 마케팅으로 효율을 높일 방안을 적어보세요",
    compliance_officer: "절세·관세 절감 방안을 정리하세요",
  },

  // ─── 카드 09: 가격 및 포지셔닝 ───
  "09-1": {
    market_analyst: "경쟁사 가격 데이터와 가격 탄력성을 분석하세요",
    brand_strategist: "브랜드 가치에 맞는 가격대를 제안하세요",
    customer_insight: "고객의 지불 의향(WTP)을 추정하세요",
    global_sales: "국가별 가격 전략 차이를 적어보세요",
    digital_marketer: "온라인 채널의 가격 정책을 제안하세요",
    compliance_officer: "관세·세금 포함 최종 가격을 계산하세요",
  },
  "09-2": {
    market_analyst: "데이터로 본 우리의 시장 포지션을 적어보세요",
    brand_strategist: "포지셔닝 맵에서 우리의 자리를 정의하세요",
    customer_insight: "고객 머릿속의 우리 브랜드 위치를 적어보세요",
    global_sales: "해외 시장에서의 포지셔닝을 정의하세요",
    digital_marketer: "디지털 공간에서의 포지셔닝을 적어보세요",
    compliance_officer: "법적·인증 우위를 포지셔닝에 활용해보세요",
  },
  "09-3": {
    market_analyst: "가격-포지션 조합의 시장 적합성을 검증하세요",
    brand_strategist: "가격이 브랜드 인식에 미치는 영향을 적어보세요",
    customer_insight: "고객 입장에서 가격-가치 매칭을 평가하세요",
    global_sales: "국가별 가격-포지션 최적 조합을 적어보세요",
    digital_marketer: "디지털 채널별 가격 전략을 정리하세요",
    compliance_officer: "가격 차별화 시 법적 리스크를 점검하세요",
  },

  // ─── 카드 10: 제품 전략 ───
  "10-1": {
    market_analyst: "데이터로 검증된 핵심 가치를 적어보세요",
    brand_strategist: "브랜드 핵심 가치를 한 문장으로 정의하세요",
    customer_insight: "고객이 정말로 원하는 가치를 적어보세요",
    global_sales: "해외 고객에게 어필할 핵심 가치를 적어보세요",
    digital_marketer: "디지털로 전달하기 좋은 가치를 정리하세요",
    compliance_officer: "규제 친화적인 가치 포인트를 찾아보세요",
  },
  "10-2": {
    market_analyst: "가치 제안의 시장 검증 데이터를 정리하세요",
    brand_strategist: "가치 제안 캔버스를 작성하세요",
    customer_insight: "고객 Pain Point와 우리 솔루션을 연결하세요",
    global_sales: "국가별로 차별화된 가치 제안을 적어보세요",
    digital_marketer: "가치 제안을 디지털 콘텐츠로 표현하세요",
    compliance_officer: "안전·신뢰성 가치를 강조한 메시지를 제안하세요",
  },
  "10-3": {
    market_analyst: "데이터 기반 제품 개선 우선순위를 제안하세요",
    brand_strategist: "브랜드 일관성을 유지하는 제품 로드맵을 적어보세요",
    customer_insight: "고객 피드백 반영 체계를 설계하세요",
    global_sales: "해외 시장 확장을 위한 제품 로드맵을 적어보세요",
    digital_marketer: "디지털 기능 강화 로드맵을 제안하세요",
    compliance_officer: "인증 일정과 제품 로드맵을 동기화하세요",
  },

  // ─── 카드 11: 유통 채널 ───
  "11-1": {
    market_analyst: "채널별 시장 규모와 효율을 비교하세요",
    brand_strategist: "브랜드 이미지에 맞는 채널을 골라보세요",
    customer_insight: "고객이 가장 편하게 만나는 채널을 찾아보세요",
    global_sales: "해외 진출국별 주요 유통 채널을 정리하세요",
    digital_marketer: "온라인 채널의 강점·약점을 분석하세요",
    compliance_officer: "채널별 규제·계약 조건을 정리하세요",
  },
  "11-2": {
    market_analyst: "ROI 기준 우선 진입할 채널을 제안하세요",
    brand_strategist: "브랜드 자산을 키울 채널 전략을 적어보세요",
    customer_insight: "고객 여정에 맞는 채널 조합을 제안하세요",
    global_sales: "해외 진출 채널 전략을 적어보세요",
    digital_marketer: "디지털 채널 우선순위와 운영 전략을 적어보세요",
    compliance_officer: "각 채널의 규제 리스크를 정리하세요",
  },
  "11-3": {
    market_analyst: "파트너사 시장 영향력을 데이터로 평가하세요",
    brand_strategist: "브랜드 가치를 키워줄 파트너를 찾아보세요",
    customer_insight: "고객 신뢰를 줄 파트너 후보를 제안하세요",
    global_sales: "해외 유통 파트너 후보와 접근 전략을 적어보세요",
    digital_marketer: "디지털 플랫폼 파트너를 제안하세요",
    compliance_officer: "파트너십 계약 시 점검할 규제 항목을 정리하세요",
  },

  // ─── 카드 12: 마케팅 ───
  "12-1": {
    market_analyst: "채널별 도달률과 전환율을 비교하세요",
    brand_strategist: "브랜드 톤에 맞는 채널을 제안하세요",
    customer_insight: "타깃이 가장 자주 보는 채널을 적어보세요",
    global_sales: "해외 시장 주요 마케팅 채널을 정리하세요",
    digital_marketer: "디지털·SNS 채널 운영 전략을 상세히 적어보세요",
    compliance_officer: "광고 규제·표시 의무를 정리하세요",
  },
  "12-2": {
    market_analyst: "CAC·LTV 데이터로 본 효율적 확보 방안을 제안하세요",
    brand_strategist: "브랜드 인지도를 높이는 캠페인을 기획하세요",
    customer_insight: "고객 추천·바이럴을 만들 방법을 제안하세요",
    global_sales: "해외 첫 고객 확보 시나리오를 적어보세요",
    digital_marketer: "디지털 퍼포먼스 캠페인을 기획하세요",
    compliance_officer: "고객 데이터 수집 시 동의·법적 요건을 정리하세요",
  },
  "12-3": {
    market_analyst: "메시지별 반응률을 검증할 방안을 제안하세요",
    brand_strategist: "브랜드 핵심 메시지를 한 문장으로 정의하세요",
    customer_insight: "고객 마음을 움직이는 메시지를 작성하세요",
    global_sales: "현지화된 메시지 톤을 제안하세요",
    digital_marketer: "디지털 채널별 메시지 변형을 작성하세요",
    compliance_officer: "메시지에서 피해야 할 표현·과장 광고를 정리하세요",
  },

  // ─── 카드 13: GTM ───
  "13-1": {
    market_analyst: "데이터 기반 GTM 핵심 KPI를 정의하세요",
    brand_strategist: "브랜드 런칭 시그니처 모먼트를 기획하세요",
    customer_insight: "고객 첫 경험을 디자인하세요",
    global_sales: "글로벌 동시 vs 단계 진출 전략을 적어보세요",
    digital_marketer: "디지털 런칭 캠페인 90일 플랜을 적어보세요",
    compliance_officer: "런칭 전 필수 인증·법적 절차 체크리스트를 작성하세요",
  },
  "13-2": {
    market_analyst: "데이터 기반 파일럿 시장 후보를 비교하세요",
    brand_strategist: "브랜드 레퍼런스가 될 파일럿 시장을 제안하세요",
    customer_insight: "초기 고객 반응을 검증하기 좋은 시장을 적어보세요",
    global_sales: "해외 파일럿 후보 국가 2~3개를 비교하세요",
    digital_marketer: "디지털 테스트 시장의 조건을 적어보세요",
    compliance_officer: "규제 진입 장벽이 낮은 파일럿 시장을 추천하세요",
  },
  "13-3": {
    market_analyst: "월별 KPI와 측정 방법을 정의하세요",
    brand_strategist: "브랜드 빌딩 단계별 마일스톤을 제안하세요",
    customer_insight: "고객 피드백 루프 일정을 설계하세요",
    global_sales: "분기별 진출국 확장 계획을 적어보세요",
    digital_marketer: "주간·월간 캠페인 캘린더를 제안하세요",
    compliance_officer: "인증·규제 대응 일정을 적어보세요",
  },

  // ─── 카드 14: 리스크 ───
  "14-1": {
    market_analyst: "시장·경쟁 리스크를 데이터 기반으로 정리하세요",
    brand_strategist: "브랜드 평판 리스크를 적어보세요",
    customer_insight: "고객 이탈·불만 리스크를 적어보세요",
    global_sales: "환율·정세 등 글로벌 리스크를 정리하세요",
    digital_marketer: "디지털·SNS 위기 시나리오를 적어보세요",
    compliance_officer: "규제·법적 리스크를 모두 정리하세요",
  },
  "14-2": {
    market_analyst: "리스크별 영향도와 발생 확률을 평가하세요",
    brand_strategist: "브랜드 리스크 대응 매뉴얼을 제안하세요",
    customer_insight: "고객 컴플레인 대응 시나리오를 적어보세요",
    global_sales: "해외 리스크 헤징 전략을 정리하세요",
    digital_marketer: "디지털 위기 대응 플레이북을 적어보세요",
    compliance_officer: "법적 분쟁 시 대응 절차를 정리하세요",
  },
  "14-3": {
    market_analyst: "리스크 모니터링 지표(KPI)를 정의하세요",
    brand_strategist: "브랜드 리스크 모니터링 체계를 제안하세요",
    customer_insight: "고객 신호 감지 시스템을 설계하세요",
    global_sales: "해외 리스크 정기 검토 체계를 적어보세요",
    digital_marketer: "소셜 리스닝 도구·KPI를 정리하세요",
    compliance_officer: "규제 변화 모니터링 체계를 설계하세요",
  },

  // ─── 카드 15: 확장 및 성장 ───
  "15-1": {
    market_analyst: "데이터로 검증된 핵심 성장 동력을 적어보세요",
    brand_strategist: "브랜드 자산을 활용한 성장 동력을 제안하세요",
    customer_insight: "고객 충성도 기반 성장 엔진을 설계하세요",
    global_sales: "해외 시장 성장 동력을 정리하세요",
    digital_marketer: "디지털 그로스 해킹 전략을 제안하세요",
    compliance_officer: "규제 우위를 성장 동력으로 만드는 방안을 적어보세요",
  },
  "15-2": {
    market_analyst: "데이터 기반 다음 진출 시장 후보를 제안하세요",
    brand_strategist: "브랜드 확장 가능한 카테고리를 적어보세요",
    customer_insight: "기존 고객을 활용한 확장 전략을 적어보세요",
    global_sales: "해외 추가 진출국 우선순위를 적어보세요",
    digital_marketer: "디지털 확장 채널·플랫폼을 제안하세요",
    compliance_officer: "확장 시 새롭게 마주할 규제를 정리하세요",
  },
  "15-3": {
    market_analyst: "장기 성장 KPI와 트래킹 방법을 정의하세요",
    brand_strategist: "브랜드 가치 지속 성장 전략을 적어보세요",
    customer_insight: "고객 커뮤니티 기반 성장 모델을 설계하세요",
    global_sales: "글로벌 지속 성장 모델을 제안하세요",
    digital_marketer: "디지털 자산 누적 전략을 적어보세요",
    compliance_officer: "지속가능경영(ESG) 측면 성장 전략을 적어보세요",
  },

  // ─── 카드 16: TBT·인증 ───
  "16-1": {
    market_analyst: "TBT 데이터와 산업별 영향을 정리하세요",
    brand_strategist: "TBT 통과를 브랜드 신뢰로 전환하는 방법을 적어보세요",
    customer_insight: "인증이 고객 신뢰에 미치는 영향을 적어보세요",
    global_sales: "주요 진출국의 TBT 현황을 정리하세요",
    digital_marketer: "TBT 통과 사실의 디지털 활용 방안을 적어보세요",
    compliance_officer: "필요한 모든 인증과 비용·기간을 상세히 정리하세요",
  },
  "16-2": {
    market_analyst: "인증 ROI를 분석해 우선순위를 제안하세요",
    brand_strategist: "인증을 브랜드 메시지에 녹이는 방법을 적어보세요",
    customer_insight: "고객이 중요시 여기는 인증을 우선시하세요",
    global_sales: "국가별 필수 인증 로드맵을 적어보세요",
    digital_marketer: "인증 마케팅 캠페인을 기획하세요",
    compliance_officer: "단계별 인증 취득 일정과 책임자를 정리하세요",
  },
  "16-3": {
    market_analyst: "인증 후 시장 진입 효과를 데이터로 예측하세요",
    brand_strategist: "인증 완료 시점의 브랜드 런칭 전략을 적어보세요",
    customer_insight: "인증 완료 후 고객 커뮤니케이션 방안을 적어보세요",
    global_sales: "인증별 수출 개시 시점을 적어보세요",
    digital_marketer: "인증 통과 후 PR·콘텐츠 전략을 제안하세요",
    compliance_officer: "최종 수출 체크리스트와 사후 관리 방안을 정리하세요",
  },
};

// 헬퍼: 특정 카드·직무의 프롬프트 가져오기
export function getRolePrompt(subCardId: string, roleCode: RoleCode): string {
  const prompts = ROLE_PROMPTS[subCardId];
  if (!prompts) return "이 질문에 대한 자기 직무 관점의 인사이트를 작성해주세요";
  return prompts[roleCode] || "자기 직무 관점에서 이 질문을 어떻게 보는지 작성해주세요";
}

// 헬퍼: 글자수 최소값 (직무 인사이트는 수업 수준에 맞춰 다르게)
export function getInsightMinChars(level: string): number {
  const map: Record<string, number> = {
    basic: 20,
    standard: 30,
    advanced: 50,
  };
  return map[level] || 30;
}
