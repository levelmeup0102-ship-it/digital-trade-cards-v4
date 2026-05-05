// src/data/signalGovernance.ts
// SIGNAL 카드게임 3단계 개발용 구조
// 목적: 학생 화면에서는 visibleMission만 노출하고, 체크리스트는 hiddenGovernanceKeys로 숨겨 평가·피드백에 사용합니다.

export type SignalGovernanceKey = {
  key: string;
  labelKo: string;
  scoringIntent: string;
};

export type SignalGovernanceQuestion = {
  id: string;
  cardId: string;
  order: number;
  titleKo: string;
  titleEn: string;
  visibleMission: string;
  hiddenGovernanceKeys: SignalGovernanceKey[];
  scoringRubric: {
    maxScore: number;
    checklistCoverage: number;
    logic: number;
    itemFit: number;
    clarity: number;
  };
};

export type SignalGovernanceCard = {
  id: string;
  titleKo: string;
  titleEn: string;
  questions: SignalGovernanceQuestion[];
};

const defaultQuestionRubric = {
  maxScore: 10,
  checklistCoverage: 5,
  logic: 2,
  itemFit: 2,
  clarity: 1,
};

export const SIGNAL_GOVERNANCE_CARDS: SignalGovernanceCard[] = [

  {
    id: "01",
    titleKo: "시장 개요 및 산업 정의",
    titleEn: "Market Overview & Definition",
    questions: [
      {
        id: "01-1",
        cardId: "01",
        order: 1,
        titleKo: "산업 코드와 포지셔닝",
        titleEn: "Industry Classification & Positioning",
        visibleMission: "우리 제품·서비스가 어떤 산업과 품목분류에 속하는지 정의하고, 그 분류가 경쟁범위·인증·관세·유통 구조에 어떤 영향을 주는지 토론해보세요.",
        hiddenGovernanceKeys: [
        { key: "industry_name", labelKo: "산업명 정의", scoringIntent: "산업 또는 시장 카테고리를 명확히 정의했는지 평가" },
        { key: "trade_code_or_classification", labelKo: "HS코드·품목분류·서비스분류", scoringIntent: "상품형은 HS코드/품목분류, 서비스형은 산업분류·서비스유형·제공방식을 확인했는지 평가" },
        { key: "competitor_in_same_category", labelKo: "동일 분류 내 경쟁사·대체재", scoringIntent: "같은 품목군 또는 유사 시장 안에서 비교 가능한 경쟁자나 대체재를 파악했는지 평가" },
        { key: "trade_impact", labelKo: "인증·관세·유통 영향", scoringIntent: "산업·품목분류가 인증, 관세, 통관, 유통전략에 미치는 영향을 연결했는지 평가" }
      ],
        scoringRubric: defaultQuestionRubric,
      },
      {
        id: "01-2",
        cardId: "01",
        order: 2,
        titleKo: "JTBD 기반 고객 세그먼트",
        titleEn: "Jobs-to-be-Done Customer Segmentation",
        visibleMission: "고객이 우리 제품·서비스를 사용하는 상황을 나누고, 각 상황에서 고객이 느끼는 문제와 선택 이유를 토론해보세요.",
        hiddenGovernanceKeys: [
        { key: "usage_situations", labelKo: "사용 상황 구분", scoringIntent: "고객의 사용 맥락을 여러 실제 상황으로 나누었는지 평가" },
        { key: "customer_pain_points", labelKo: "고객 불편함·문제 정의", scoringIntent: "고객이 해결하고 싶은 실제 문제, 불편, 결핍, 욕구를 구체화했는지 평가" },
        { key: "reason_to_choose", labelKo: "선택 이유", scoringIntent: "우리 제품·서비스가 고객 문제를 해결하는 이유와 선택 근거를 정리했는지 평가" },
        { key: "customer_segments", labelKo: "고객 세그먼트", scoringIntent: "비슷한 니즈를 가진 고객군을 타깃 세그먼트로 구조화했는지 평가" }
      ],
        scoringRubric: defaultQuestionRubric,
      },
      {
        id: "01-3",
        cardId: "01",
        order: 3,
        titleKo: "시장 구조 & 플랫폼 흐름",
        titleEn: "Market Structure & Platform Flow",
        visibleMission: "우리 제품·서비스가 생산 또는 준비 단계에서 고객에게 도달하기까지의 흐름을 그리고, 어느 단계에서 가장 효과적으로 판매·홍보할 수 있을지 토론해보세요.",
        hiddenGovernanceKeys: [
        { key: "value_chain_flow", labelKo: "생산·유통·판매 흐름", scoringIntent: "제품·서비스가 고객에게 도달하는 전체 흐름을 단계별로 이해했는지 평가" },
        { key: "effective_contact_stage", labelKo: "효과적인 판매·홍보 단계", scoringIntent: "어느 단계에서 고객 접점과 구매 전환 가능성이 높은지 판단했는지 평가" },
        { key: "partner_or_institution", labelKo: "기관·파트너 후보", scoringIntent: "유통사, 플랫폼, 기관, 협력사 등 실행 파트너를 고려했는지 평가" },
        { key: "poc_idea", labelKo: "소규모 실험(PoC) 아이디어", scoringIntent: "시장 진입 전에 작게 검증할 실행 아이디어를 제시했는지 평가" }
      ],
        scoringRubric: defaultQuestionRubric,
      }
    ],
  },
  {
    id: "02",
    titleKo: "시장 규모 및 성장 전망",
    titleEn: "Market Size & Growth Outlook",
    questions: [
      {
        id: "02-1",
        cardId: "02",
        order: 1,
        titleKo: "시장 규모 분석",
        titleEn: "Market Size Analysis",
        visibleMission: "제품·서비스가 속한 시장 규모는 얼마나 클까?",
        hiddenGovernanceKeys: [
        { key: "market_size", labelKo: "시장 규모", scoringIntent: "시장 규모, 수요 수준, 매출 규모 등을 수치 또는 범위로 제시했는지 평가" },
        { key: "source_basis", labelKo: "근거 출처", scoringIntent: "리포트, 기사, 통계, 플랫폼 데이터 등 근거 맥락을 제시했는지 평가" },
        { key: "market_scope", labelKo: "시장 범위 정의", scoringIntent: "글로벌/국가/세부 카테고리 중 어떤 범위의 시장인지 구분했는지 평가" },
        { key: "entry_attractiveness", labelKo: "진입 매력도", scoringIntent: "시장 규모가 우리 제품의 진입 타당성과 어떻게 연결되는지 설명했는지 평가" }
      ],
        scoringRubric: defaultQuestionRubric,
      },
      {
        id: "02-2",
        cardId: "02",
        order: 2,
        titleKo: "성장 동인 분석",
        titleEn: "Growth Drivers",
        visibleMission: "우리 산업이 성장하는 이유는 무엇일까?",
        hiddenGovernanceKeys: [
        { key: "growth_factors", labelKo: "성장 요인", scoringIntent: "소비자 변화, 기술 변화, 정책 변화, 문화 트렌드 등 성장 동인을 제시했는지 평가" },
        { key: "customer_demand_shift", labelKo: "수요 변화", scoringIntent: "고객 수요 또는 구매행동 변화와 성장성을 연결했는지 평가" },
        { key: "digital_or_global_trend", labelKo: "디지털·글로벌 트렌드", scoringIntent: "온라인 채널, 플랫폼, 글로벌 수요 등 확산 요인을 반영했는지 평가" },
        { key: "fit_to_our_item", labelKo: "우리 아이템과의 연결", scoringIntent: "성장 동인이 우리 제품·서비스에 유리한 이유를 설명했는지 평가" }
      ],
        scoringRubric: defaultQuestionRubric,
      },
      {
        id: "02-3",
        cardId: "02",
        order: 3,
        titleKo: "미래 성장 전망",
        titleEn: "Future Outlook",
        visibleMission: "앞으로 이 시장은 어떤 방향으로 성장할까?",
        hiddenGovernanceKeys: [
        { key: "future_direction", labelKo: "미래 성장 방향", scoringIntent: "향후 3~5년 시장 변화 방향을 예측했는지 평가" },
        { key: "promising_market", labelKo: "유망 국가·세그먼트", scoringIntent: "성장 가능성이 높은 국가, 고객군, 세부 시장을 제시했는지 평가" },
        { key: "risk_factor", labelKo: "성장 리스크", scoringIntent: "정치·규제·경쟁·가격·기술 변화 등 리스크를 함께 봤는지 평가" },
        { key: "strategic_implication", labelKo: "전략적 시사점", scoringIntent: "전망을 바탕으로 우리 팀의 진입 전략을 도출했는지 평가" }
      ],
        scoringRubric: defaultQuestionRubric,
      }
    ],
  },
  {
    id: "03",
    titleKo: "시장 세분화 및 핵심 타깃 선정",
    titleEn: "Market Segmentation Analysis",
    questions: [
      {
        id: "03-1",
        cardId: "03",
        order: 1,
        titleKo: "세분화 기준 설정",
        titleEn: "Setting Segmentation Criteria",
        visibleMission: "시장을 나누려면 어떤 기준을 먼저 생각해야 할까?",
        hiddenGovernanceKeys: [
        { key: "segmentation_criteria", labelKo: "세분화 기준", scoringIntent: "지역, 연령, 소득, 산업, 사용상황, 니즈 등 분류 기준을 제시했는지 평가" },
        { key: "criteria_relevance", labelKo: "기준의 적합성", scoringIntent: "선정한 기준이 우리 제품·서비스와 관련성이 높은지 평가" },
        { key: "data_or_observation", labelKo: "근거 데이터·관찰", scoringIntent: "세분화 기준을 뒷받침하는 데이터나 관찰 근거를 제시했는지 평가" },
        { key: "usable_structure", labelKo: "활용 가능한 구조", scoringIntent: "세분화 결과가 타깃 선정에 실제로 활용 가능한지 평가" }
      ],
        scoringRubric: defaultQuestionRubric,
      },
      {
        id: "03-2",
        cardId: "03",
        order: 2,
        titleKo: "핵심 고객군 선정",
        titleEn: "Identifying Core Segment",
        visibleMission: "여러 고객 그룹 중, 우리 제품에 가장 맞는 고객은 누구일까?",
        hiddenGovernanceKeys: [
        { key: "core_segment", labelKo: "핵심 고객군", scoringIntent: "가장 우선 공략할 고객군을 명확히 선택했는지 평가" },
        { key: "segment_need", labelKo: "핵심 니즈", scoringIntent: "선택 고객군의 문제, 욕구, 구매 이유를 설명했는지 평가" },
        { key: "segment_size_value", labelKo: "시장성·가치", scoringIntent: "해당 고객군이 충분한 규모나 수익 가능성을 가지는지 평가" },
        { key: "selection_reason", labelKo: "선정 근거", scoringIntent: "왜 이 고객군을 먼저 공략해야 하는지 논리적으로 설명했는지 평가" }
      ],
        scoringRubric: defaultQuestionRubric,
      },
      {
        id: "03-3",
        cardId: "03",
        order: 3,
        titleKo: "타깃 전략 구체화",
        titleEn: "Targeting Strategy",
        visibleMission: "선택한 고객에게 어떤 방식으로 다가가면 좋을까?",
        hiddenGovernanceKeys: [
        { key: "target_message", labelKo: "타깃 메시지", scoringIntent: "선택 고객군에 맞는 메시지 방향을 제시했는지 평가" },
        { key: "target_channel", labelKo: "접근 채널", scoringIntent: "고객이 실제로 사용하는 채널 또는 접점을 제시했는지 평가" },
        { key: "priority_order", labelKo: "우선순위", scoringIntent: "1차/2차 타깃 또는 국가·고객군의 우선순위를 정했는지 평가" },
        { key: "execution_fit", labelKo: "실행 적합성", scoringIntent: "타깃 전략이 우리 자원과 역량으로 실행 가능한지 평가" }
      ],
        scoringRubric: defaultQuestionRubric,
      }
    ],
  },
  {
    id: "04",
    titleKo: "경쟁환경 및 차별화 분석",
    titleEn: "Competitive Landscape & Differentiation",
    questions: [
      {
        id: "04-1",
        cardId: "04",
        order: 1,
        titleKo: "경쟁자 리스트업",
        titleEn: "Competitor Identification",
        visibleMission: "우리 시장에서 경쟁하고 있는 주요 기업은 누구일까?",
        hiddenGovernanceKeys: [
        { key: "direct_competitors", labelKo: "직접 경쟁자", scoringIntent: "같은 고객과 문제를 대상으로 하는 주요 경쟁사를 제시했는지 평가" },
        { key: "indirect_competitors", labelKo: "간접 경쟁자·대체재", scoringIntent: "고객이 대신 선택할 수 있는 대체재나 대안 서비스를 고려했는지 평가" },
        { key: "competitor_profile", labelKo: "경쟁사 프로필", scoringIntent: "가격, 채널, 강점, 약점, 포지션을 간단히 비교했는지 평가" },
        { key: "relevance_to_market", labelKo: "시장 관련성", scoringIntent: "선정한 경쟁자가 실제 목표시장과 관련 있는지 평가" }
      ],
        scoringRubric: defaultQuestionRubric,
      },
      {
        id: "04-2",
        cardId: "04",
        order: 2,
        titleKo: "경쟁 구조 분석",
        titleEn: "Market Structure & Business Model",
        visibleMission: "경쟁사는 어떤 방식으로 고객을 확보하고, 어떤 수익 구조로 운영될까?",
        hiddenGovernanceKeys: [
        { key: "business_model", labelKo: "경쟁사 비즈니스 모델", scoringIntent: "경쟁사의 판매 방식, 수익 구조, 유통 구조를 파악했는지 평가" },
        { key: "market_position", labelKo: "시장 포지션", scoringIntent: "프리미엄/가성비/전문성/플랫폼 등 포지션을 구분했는지 평가" },
        { key: "customer_acquisition", labelKo: "고객 확보 방식", scoringIntent: "경쟁사가 고객을 획득하는 채널과 메시지를 분석했는지 평가" },
        { key: "gap_opportunity", labelKo: "경쟁 틈새", scoringIntent: "경쟁구조 안에서 우리에게 열려 있는 틈새를 찾았는지 평가" }
      ],
        scoringRubric: defaultQuestionRubric,
      },
      {
        id: "04-3",
        cardId: "04",
        order: 3,
        titleKo: "차별화 전략 수립",
        titleEn: "Building Differentiation Strategy",
        visibleMission: "우리 제품은 경쟁사와 어떤 점에서 다를까?",
        hiddenGovernanceKeys: [
        { key: "differentiation_point", labelKo: "차별화 포인트", scoringIntent: "경쟁사와 다른 핵심 차별성을 명확히 제시했는지 평가" },
        { key: "customer_value", labelKo: "고객 가치", scoringIntent: "차별화가 고객에게 어떤 실질 가치를 주는지 설명했는지 평가" },
        { key: "proof_or_evidence", labelKo: "차별화 근거", scoringIntent: "기술, 성분, 인증, 가격, 디자인, 경험 등 증거를 제시했는지 평가" },
        { key: "defensibility", labelKo: "방어 가능성", scoringIntent: "경쟁사가 쉽게 따라 하기 어려운 요소인지 판단했는지 평가" }
      ],
        scoringRubric: defaultQuestionRubric,
      }
    ],
  },
  {
    id: "05",
    titleKo: "시장 변화 및 기회 요인 분석",
    titleEn: "Market Trends & Opportunity Analysis",
    questions: [
      {
        id: "05-1",
        cardId: "05",
        order: 1,
        titleKo: "시장 변화 감지",
        titleEn: "Detecting Market Changes",
        visibleMission: "최근 1~3년 사이 시장·고객·기술·플랫폼에서 어떤 변화가 생겼을까?",
        hiddenGovernanceKeys: [
        { key: "recent_changes", labelKo: "최근 변화", scoringIntent: "최근 1~3년 시장·고객·기술·플랫폼 변화 2~3가지를 제시했는지 평가" },
        { key: "change_evidence", labelKo: "변화 근거", scoringIntent: "변화의 근거가 되는 사례, 데이터, 기사, 플랫폼 흐름을 제시했는지 평가" },
        { key: "impact_on_customer", labelKo: "고객 영향", scoringIntent: "변화가 고객의 선택, 구매, 사용 방식에 미치는 영향을 설명했는지 평가" },
        { key: "impact_on_industry", labelKo: "산업 영향", scoringIntent: "변화가 경쟁구조, 유통, 가격, 제품전략에 미치는 영향을 연결했는지 평가" }
      ],
        scoringRubric: defaultQuestionRubric,
      },
      {
        id: "05-2",
        cardId: "05",
        order: 2,
        titleKo: "기회 요인 식별",
        titleEn: "Identifying Opportunities",
        visibleMission: "이 변화 속에서 우리 제품·서비스는 어떤 새로운 기회를 잡을 수 있을까?",
        hiddenGovernanceKeys: [
        { key: "opportunity_factor", labelKo: "기회 요인", scoringIntent: "시장 변화 중 우리에게 유리한 기회를 선택했는지 평가" },
        { key: "timing", labelKo: "시장 타이밍", scoringIntent: "왜 지금이 기회인지 시간적·상황적 근거를 제시했는지 평가" },
        { key: "fit_with_capability", labelKo: "우리 역량과 적합성", scoringIntent: "기회가 우리 제품·서비스 역량과 맞는지 설명했는지 평가" },
        { key: "priority_opportunity", labelKo: "우선 기회 선정", scoringIntent: "여러 기회 중 먼저 잡을 기회를 선택했는지 평가" }
      ],
        scoringRubric: defaultQuestionRubric,
      },
      {
        id: "05-3",
        cardId: "05",
        order: 3,
        titleKo: "변화 대응 전략",
        titleEn: "Strategy for Adapting to Change",
        visibleMission: "변화의 기회를 잡으려면 우리에게 필요한 기술과 도움이 되는 요소는 무엇일까?",
        hiddenGovernanceKeys: [
        { key: "response_strategy", labelKo: "대응 전략", scoringIntent: "시장 변화에 맞춘 실행 전략을 제시했는지 평가" },
        { key: "needed_technology", labelKo: "필요 기술·도구", scoringIntent: "AI, 데이터, 플랫폼, 생산기술 등 필요한 기술 요소를 고려했는지 평가" },
        { key: "partner_support", labelKo: "필요 파트너·지원", scoringIntent: "외부 파트너, 기관, 플랫폼, 전문가 지원을 고려했는지 평가" },
        { key: "actionability", labelKo: "실행 가능성", scoringIntent: "전략이 실제 행동으로 옮길 수 있을 만큼 구체적인지 평가" }
      ],
        scoringRubric: defaultQuestionRubric,
      }
    ],
  },
  {
    id: "06",
    titleKo: "규제 및 정책 대응 전략",
    titleEn: "Regulatory & Policy Response Strategy",
    questions: [
      {
        id: "06-1",
        cardId: "06",
        order: 1,
        titleKo: "규제 요건 파악",
        titleEn: "Identify Key Regulatory Requirements",
        visibleMission: "우리가 진출하려는 시장에서 반드시 확인해야 할 법·인증·통관 요건은 무엇일까?",
        hiddenGovernanceKeys: [
        { key: "legal_requirement", labelKo: "법적 요건", scoringIntent: "목표시장 판매·수출에 필요한 법적 요건을 확인했는지 평가" },
        { key: "certification_requirement", labelKo: "인증 요건", scoringIntent: "강제 또는 권장 인증, 등록, 시험 요건을 확인했는지 평가" },
        { key: "customs_labeling", labelKo: "통관·라벨링 요건", scoringIntent: "통관, 라벨링, 표시사항, 서류 요건을 고려했는지 평가" },
        { key: "impact_on_entry", labelKo: "진입 영향", scoringIntent: "규제가 일정, 비용, 채널 선택에 미치는 영향을 설명했는지 평가" }
      ],
        scoringRubric: defaultQuestionRubric,
      },
      {
        id: "06-2",
        cardId: "06",
        order: 2,
        titleKo: "정책 변화 분석",
        titleEn: "Policy Trends & Shifts",
        visibleMission: "최근 3년간 이 시장의 정책·규제 환경은 어떻게 바뀌었고, 우리 제품에 어떤 영향을 줄까?",
        hiddenGovernanceKeys: [
        { key: "policy_change", labelKo: "정책·규제 변화", scoringIntent: "최근 3년간 의미 있는 정책·규제 변화를 제시했는지 평가" },
        { key: "change_direction", labelKo: "강화·완화 방향", scoringIntent: "규제가 강화되는지, 완화되는지, 새롭게 등장하는지 구분했는지 평가" },
        { key: "impact_on_product", labelKo: "제품 영향", scoringIntent: "정책 변화가 우리 제품·서비스에 미치는 영향을 설명했는지 평가" },
        { key: "monitoring_need", labelKo: "모니터링 필요성", scoringIntent: "앞으로 계속 확인해야 할 규제 이슈를 제시했는지 평가" }
      ],
        scoringRubric: defaultQuestionRubric,
      },
      {
        id: "06-3",
        cardId: "06",
        order: 3,
        titleKo: "협상 및 대응 전략 수립",
        titleEn: "Building Negotiation & Adaptation Strategy",
        visibleMission: "규제를 충족하고 리스크를 줄이기 위해 우리가 활용할 수 있는 대응 전략은 무엇일까?",
        hiddenGovernanceKeys: [
        { key: "compliance_action", labelKo: "규제 충족 행동", scoringIntent: "인증 취득, 서류 준비, 시험, 현지 책임자 등 구체 행동을 제시했는지 평가" },
        { key: "risk_mitigation", labelKo: "리스크 완화 전략", scoringIntent: "비용·일정·통관 지연 리스크를 줄이는 방안을 제시했는지 평가" },
        { key: "local_partner", labelKo: "현지 파트너 활용", scoringIntent: "현지 인증기관, 수입사, 법무·규제 파트너 활용을 고려했는지 평가" },
        { key: "negotiation_point", labelKo: "협상 포인트", scoringIntent: "파트너 또는 기관과 조율 가능한 조건과 근거를 도출했는지 평가" }
      ],
        scoringRubric: defaultQuestionRubric,
      }
    ],
  },
  {
    id: "07",
    titleKo: "고객 인사이트 및 수요 분석",
    titleEn: "Customer Insight & Demand Analysis",
    questions: [
      {
        id: "07-1",
        cardId: "07",
        order: 1,
        titleKo: "고객 정의 & JTBD 분석",
        titleEn: "Defining Customers & Their JTBD",
        visibleMission: "우리의 고객은 누구이며, 무엇을 해결하려 할까?",
        hiddenGovernanceKeys: [
        { key: "customer_definition", labelKo: "고객 정의", scoringIntent: "핵심 고객을 구체적 인물·집단·조직으로 정의했는지 평가" },
        { key: "jtbd", labelKo: "해결 과업(JTBD)", scoringIntent: "고객이 실제로 해결하려는 과업과 상황을 제시했는지 평가" },
        { key: "pain_and_gain", labelKo: "고통·기대효과", scoringIntent: "고객의 불편과 기대하는 결과를 함께 설명했는지 평가" },
        { key: "buying_context", labelKo: "구매 맥락", scoringIntent: "언제, 왜, 어떤 조건에서 구매하는지 설명했는지 평가" }
      ],
        scoringRubric: defaultQuestionRubric,
      },
      {
        id: "07-2",
        cardId: "07",
        order: 2,
        titleKo: "감정 & 여정 분석",
        titleEn: "Emotion & Customer Journey Mapping",
        visibleMission: "고객은 어떤 감정을 느끼고, 어떤 순서로 구매를 결정할까?",
        hiddenGovernanceKeys: [
        { key: "emotion_map", labelKo: "감정 흐름", scoringIntent: "고객의 불안, 기대, 망설임, 만족 등 감정 흐름을 분석했는지 평가" },
        { key: "journey_steps", labelKo: "구매 여정 단계", scoringIntent: "인지→탐색→비교→구매→사용→재구매 흐름을 제시했는지 평가" },
        { key: "touchpoints", labelKo: "접점", scoringIntent: "검색, SNS, 리뷰, 전시회, 영업, 플랫폼 등 주요 접점을 제시했는지 평가" },
        { key: "decision_barrier", labelKo: "결정 장벽", scoringIntent: "고객이 구매를 망설이는 이유와 해소 방안을 제시했는지 평가" }
      ],
        scoringRubric: defaultQuestionRubric,
      },
      {
        id: "07-3",
        cardId: "07",
        order: 3,
        titleKo: "재사용 수요 유지 전략",
        titleEn: "Retention & Lifetime Value Strategy",
        visibleMission: "고객이 우리 제품을 계속 사용하는 이유는 무엇일까?",
        hiddenGovernanceKeys: [
        { key: "retention_reason", labelKo: "반복사용 이유", scoringIntent: "고객이 다시 사용하거나 재구매할 이유를 제시했는지 평가" },
        { key: "loyalty_trigger", labelKo: "충성도 유발 요소", scoringIntent: "가격, 품질, 경험, 커뮤니티, 편의성 등 유지 요인을 찾았는지 평가" },
        { key: "lifetime_value", labelKo: "장기 가치", scoringIntent: "반복 구매, 구독, 업셀링, 추천 가능성을 고려했는지 평가" },
        { key: "retention_action", labelKo: "유지 실행전략", scoringIntent: "재구매·반복사용을 만드는 구체적 액션을 제시했는지 평가" }
      ],
        scoringRubric: defaultQuestionRubric,
      }
    ],
  },
  {
    id: "08",
    titleKo: "SWOT 분석 및 실행전략 도출",
    titleEn: "SWOT Analysis & Strategic Action Plan",
    questions: [
      {
        id: "08-1",
        cardId: "08",
        order: 1,
        titleKo: "내부 역량 파악",
        titleEn: "Analyzing Internal Strengths & Weaknesses",
        visibleMission: "우리의 강점과 약점은 무엇일까?",
        hiddenGovernanceKeys: [
        { key: "strengths", labelKo: "강점", scoringIntent: "제품, 기술, 브랜드, 팀, 원산지, 가격, 채널 등 강점을 제시했는지 평가" },
        { key: "weaknesses", labelKo: "약점", scoringIntent: "인지도, 자금, 인력, 유통망, 인증, 생산 등 약점을 솔직히 제시했는지 평가" },
        { key: "evidence", labelKo: "내부 근거", scoringIntent: "강점과 약점의 근거를 사례나 조건으로 설명했는지 평가" },
        { key: "priority_internal_issue", labelKo: "핵심 내부 이슈", scoringIntent: "가장 중요한 강점과 보완해야 할 약점을 선택했는지 평가" }
      ],
        scoringRubric: defaultQuestionRubric,
      },
      {
        id: "08-2",
        cardId: "08",
        order: 2,
        titleKo: "외부 요인 파악",
        titleEn: "Analyzing External Opportunities & Threats",
        visibleMission: "우리 산업의 기회와 위협은 무엇일까?",
        hiddenGovernanceKeys: [
        { key: "opportunities", labelKo: "기회", scoringIntent: "시장 성장, 트렌드, 정책, 플랫폼, 파트너 등 외부 기회를 제시했는지 평가" },
        { key: "threats", labelKo: "위협", scoringIntent: "경쟁, 규제, 환율, 가격경쟁, 정치 리스크 등 위협을 제시했는지 평가" },
        { key: "external_evidence", labelKo: "외부 근거", scoringIntent: "기회와 위협의 근거를 구체적으로 제시했는지 평가" },
        { key: "priority_external_issue", labelKo: "핵심 외부 이슈", scoringIntent: "가장 중요한 기회와 위협을 선택했는지 평가" }
      ],
        scoringRubric: defaultQuestionRubric,
      },
      {
        id: "08-3",
        cardId: "08",
        order: 3,
        titleKo: "전략 수립 및 실행 계획",
        titleEn: "Formulating Strategic Actions",
        visibleMission: "SWOT 4요소를 조합하면 우리는 어떤 전략을 취해야 할까?",
        hiddenGovernanceKeys: [
        { key: "swot_combination", labelKo: "SWOT 조합", scoringIntent: "SO·WO·ST·WT 중 어떤 전략 조합을 쓸지 선택했는지 평가" },
        { key: "strategic_choice", labelKo: "전략 선택", scoringIntent: "나열이 아니라 실제 실행할 전략을 하나 이상 선택했는지 평가" },
        { key: "execution_plan", labelKo: "실행계획", scoringIntent: "선택 전략을 실행할 행동, 순서, 담당, 일정으로 연결했는지 평가" },
        { key: "risk_response", labelKo: "리스크 대응", scoringIntent: "위협과 약점에 대한 보완책을 포함했는지 평가" }
      ],
        scoringRubric: defaultQuestionRubric,
      }
    ],
  },
  {
    id: "09",
    titleKo: "전략 결론 및 AI 제언 검토",
    titleEn: "Strategic Conclusion & AI Recommendation Review",
    questions: [
      {
        id: "09-1",
        cardId: "09",
        order: 1,
        titleKo: "우선시장 결정",
        titleEn: "Selecting the Priority Market",
        visibleMission: "지금 가장 먼저 진출해야 할 시장은 어디이며, 그 선택의 근거는 무엇일까?",
        hiddenGovernanceKeys: [
        { key: "priority_market", labelKo: "우선시장", scoringIntent: "가장 먼저 진출할 시장 또는 국가를 명확히 선택했는지 평가" },
        { key: "selection_basis", labelKo: "선택 근거", scoringIntent: "시장성, 고객 적합성, 규제, 경쟁, PoC 가능성 등을 근거로 설명했는지 평가" },
        { key: "alternative_markets", labelKo: "대안 시장", scoringIntent: "다른 후보 시장과 비교하거나 후순위를 제시했는지 평가" },
        { key: "strategic_fit", labelKo: "전략 적합성", scoringIntent: "선택 시장이 앞선 카드의 시장·고객·규제 분석과 일치하는지 평가" }
      ],
        scoringRubric: defaultQuestionRubric,
      },
      {
        id: "09-2",
        cardId: "09",
        order: 2,
        titleKo: "협력 구조 설계",
        titleEn: "Partner & Execution Framework",
        visibleMission: "어떤 파트너와 협력해야 시장 진입 속도와 성공 가능성을 높일 수 있을까?",
        hiddenGovernanceKeys: [
        { key: "partner_type", labelKo: "파트너 유형", scoringIntent: "유통사, 바이어, 기관, 인증, 물류, 마케팅 등 필요한 파트너 유형을 제시했는지 평가" },
        { key: "role_definition", labelKo: "역할 정의", scoringIntent: "각 파트너가 맡을 역할과 기대 효과를 설명했는지 평가" },
        { key: "collaboration_structure", labelKo: "협력 구조", scoringIntent: "MOU, PoC, 대리점, 공동마케팅, 유통계약 등 협력 방식을 고려했는지 평가" },
        { key: "success_probability", labelKo: "성공 가능성 기여", scoringIntent: "협력이 시장 진입 성공 가능성을 어떻게 높이는지 설명했는지 평가" }
      ],
        scoringRubric: defaultQuestionRubric,
      },
      {
        id: "09-3",
        cardId: "09",
        order: 3,
        titleKo: "AI 기반 전략 제언",
        titleEn: "AI-Driven Strategic Recommendation",
        visibleMission: "AI가 제안한 전략 시나리오 중 우리 팀이 채택하거나 수정해야 할 전략은 무엇일까?",
        hiddenGovernanceKeys: [
        { key: "ai_recommendation_review", labelKo: "AI 제언 검토", scoringIntent: "AI가 제안한 전략을 그대로 수용하지 않고 검토했는지 평가" },
        { key: "adopted_strategy", labelKo: "채택 전략", scoringIntent: "채택할 전략과 이유를 명확히 제시했는지 평가" },
        { key: "modified_strategy", labelKo: "수정·보완 전략", scoringIntent: "우리 팀 상황에 맞게 수정할 부분을 제시했는지 평가" },
        { key: "human_decision", labelKo: "팀 최종 판단", scoringIntent: "최종 결정이 팀의 논리와 근거로 정리되었는지 평가" }
      ],
        scoringRubric: defaultQuestionRubric,
      }
    ],
  },
  {
    id: "10",
    titleKo: "PoC 성공 가능성 분석",
    titleEn: "PoC Success Probability Analysis",
    questions: [
      {
        id: "10-1",
        cardId: "10",
        order: 1,
        titleKo: "평가 기준 정하기",
        titleEn: "Setting Evaluation Criteria",
        visibleMission: "PoC 성공을 예측하려면 어떤 기준으로 살펴봐야 할까?",
        hiddenGovernanceKeys: [
        { key: "evaluation_criteria", labelKo: "평가기준", scoringIntent: "시장성, 고객 접근성, 규제 난이도, 파트너 가능성 등 평가기준을 제시했는지 평가" },
        { key: "success_definition", labelKo: "성공 정의", scoringIntent: "PoC가 성공했다는 기준을 수치나 조건으로 정의했는지 평가" },
        { key: "measurement_method", labelKo: "측정 방법", scoringIntent: "매출, 반응률, 인터뷰, 계약 가능성 등 측정 방식을 제시했는지 평가" },
        { key: "threshold", labelKo: "판단 기준값", scoringIntent: "성공/보류/실패를 나눌 기준값 또는 조건을 제시했는지 평가" }
      ],
        scoringRubric: defaultQuestionRubric,
      },
      {
        id: "10-2",
        cardId: "10",
        order: 2,
        titleKo: "데이터 비교하기",
        titleEn: "Comparing Data by Country",
        visibleMission: "후보 국가·지역별 비교데이터로 성공 가능성이 가장 높은 곳은?",
        hiddenGovernanceKeys: [
        { key: "candidate_markets", labelKo: "후보 국가·지역", scoringIntent: "2개 이상 후보 국가·지역을 비교했는지 평가" },
        { key: "comparison_data", labelKo: "비교 데이터", scoringIntent: "시장규모, 성장률, 규제, 경쟁, 채널, 비용 등 비교 데이터를 제시했는지 평가" },
        { key: "scoring_logic", labelKo: "점수화 논리", scoringIntent: "비교 기준을 점수나 우선순위로 정리했는지 평가" },
        { key: "top_candidate_reason", labelKo: "최우선 후보 근거", scoringIntent: "성공 가능성이 가장 높은 시장을 선택한 이유를 설명했는지 평가" }
      ],
        scoringRubric: defaultQuestionRubric,
      },
      {
        id: "10-3",
        cardId: "10",
        order: 3,
        titleKo: "PoC 우선권 도출",
        titleEn: "Selecting Prioritization & Execution",
        visibleMission: "검증 과제를 보며 PoC를 어디부터 시작해야 할까?",
        hiddenGovernanceKeys: [
        { key: "poc_location", labelKo: "PoC 지역·시장", scoringIntent: "PoC를 시작할 국가, 도시, 채널 또는 고객군을 구체화했는지 평가" },
        { key: "poc_scope", labelKo: "PoC 범위", scoringIntent: "제품, 기간, 예산, 파트너, 대상 고객 등 실험 범위를 정했는지 평가" },
        { key: "execution_sequence", labelKo: "실행 순서", scoringIntent: "PoC 준비→실행→측정→후속결정 순서를 제시했는지 평가" },
        { key: "backup_plan", labelKo: "백업 플랜", scoringIntent: "PoC 실패 또는 미흡 시 조정 방안을 제시했는지 평가" }
      ],
        scoringRubric: defaultQuestionRubric,
      }
    ],
  },
  {
    id: "11",
    titleKo: "우선 진출국 및 현지화 전략",
    titleEn: "Priority Market & Localization Strategy Proposal",
    questions: [
      {
        id: "11-1",
        cardId: "11",
        order: 1,
        titleKo: "우선 진출국 선정",
        titleEn: "Defining the Priority Market",
        visibleMission: "PoC 결과와 시장 데이터를 종합했을 때, 가장 먼저 진출해야 할 국가는?",
        hiddenGovernanceKeys: [
        { key: "priority_country", labelKo: "우선 진출국", scoringIntent: "가장 먼저 진출할 국가를 명확히 선택했는지 평가" },
        { key: "poc_market_link", labelKo: "PoC와 시장 데이터 연결", scoringIntent: "PoC 결과와 시장 데이터를 함께 반영했는지 평가" },
        { key: "entry_reason", labelKo: "진출 이유", scoringIntent: "시장성, 고객, 가격, 규제, 채널, 물류 등 근거를 제시했는지 평가" },
        { key: "entry_risk", labelKo: "진출 리스크", scoringIntent: "선택 국가의 주요 리스크를 함께 고려했는지 평가" }
      ],
        scoringRubric: defaultQuestionRubric,
      },
      {
        id: "11-2",
        cardId: "11",
        order: 2,
        titleKo: "현지화 및 차별화 전략",
        titleEn: "Benchmarking & Differentiation Strategy",
        visibleMission: "그 시장의 경쟁 환경은 어떻게 구성되고, 우리는 어떻게 다를까?",
        hiddenGovernanceKeys: [
        { key: "local_customer_fit", labelKo: "현지 고객 적합성", scoringIntent: "현지 고객의 문화, 취향, 가격 민감도, 구매행동을 반영했는지 평가" },
        { key: "local_competition", labelKo: "현지 경쟁구조", scoringIntent: "현지 경쟁사와 대체재를 고려했는지 평가" },
        { key: "localization_action", labelKo: "현지화 실행", scoringIntent: "언어, 패키지, 가격, 인증, 채널, 콘텐츠 현지화 방안을 제시했는지 평가" },
        { key: "differentiation", labelKo: "차별화 방식", scoringIntent: "현지 경쟁 속에서 우리만의 차별화 포인트를 제시했는지 평가" }
      ],
        scoringRubric: defaultQuestionRubric,
      },
      {
        id: "11-3",
        cardId: "11",
        order: 3,
        titleKo: "파트너·고객 확보 전략",
        titleEn: "Partner & Customer Acquisition Strategy",
        visibleMission: "해당 시장에서 어떤 파트너와 고객을 먼저 확보해야 가능할까?",
        hiddenGovernanceKeys: [
        { key: "first_partner", labelKo: "초기 파트너", scoringIntent: "초기 확보할 유통사, 바이어, 기관, 플랫폼 등을 제시했는지 평가" },
        { key: "first_customer", labelKo: "초기 고객군", scoringIntent: "초기 검증 또는 판매 대상 고객군을 구체화했는지 평가" },
        { key: "acquisition_method", labelKo: "확보 방식", scoringIntent: "컨택, 샘플, PoC, 전시회, 캠페인 등 접근 방식을 제시했는지 평가" },
        { key: "relationship_plan", labelKo: "관계 확장", scoringIntent: "초기 접점 이후 관계를 확장하는 후속 계획을 제시했는지 평가" }
      ],
        scoringRubric: defaultQuestionRubric,
      }
    ],
  },
  {
    id: "12",
    titleKo: "아이디어·브랜드 보호 전략",
    titleEn: "Protecting Our Idea & Brand Internationally",
    questions: [
      {
        id: "12-1",
        cardId: "12",
        order: 1,
        titleKo: "등록 현황 확인",
        titleEn: "Checking What’s Protected",
        visibleMission: "우리의 아이디어와 브랜드는 해외에서도 등록되어 있을까?",
        hiddenGovernanceKeys: [
        { key: "protectable_assets", labelKo: "보호 대상", scoringIntent: "상표, 디자인, 특허, 저작권, 도메인, 콘텐츠 등 보호할 대상을 구분했는지 평가" },
        { key: "registration_status", labelKo: "등록 현황", scoringIntent: "국내외 등록 여부 또는 확인 필요 상태를 정리했는지 평가" },
        { key: "priority_assets", labelKo: "우선 보호 자산", scoringIntent: "가장 먼저 보호해야 할 아이디어·브랜드 요소를 선정했는지 평가" },
        { key: "target_jurisdiction", labelKo: "대상 국가", scoringIntent: "우선 진출국에서의 보호 필요성을 고려했는지 평가" }
      ],
        scoringRubric: defaultQuestionRubric,
      },
      {
        id: "12-2",
        cardId: "12",
        order: 2,
        titleKo: "아이디어 겹침 점검",
        titleEn: "Checking for Similar Ideas or Conflicts",
        visibleMission: "혹시 우리와 비슷한 아이디어가 이미 다른 나라에 등록되어 있을 수 있을까?",
        hiddenGovernanceKeys: [
        { key: "similarity_search", labelKo: "유사성 조사", scoringIntent: "유사 상표, 디자인, 기술, 서비스명을 찾아볼 필요를 인식했는지 평가" },
        { key: "conflict_risk", labelKo: "충돌 리스크", scoringIntent: "타인의 권리와 충돌할 가능성을 정리했는지 평가" },
        { key: "name_design_check", labelKo: "이름·디자인 점검", scoringIntent: "브랜드명, 로고, 패키지, UI 등 혼동 가능성을 고려했는지 평가" },
        { key: "risk_response", labelKo: "리스크 대응", scoringIntent: "충돌 가능성이 있을 때 이름 변경, 디자인 수정, 권리 검토 등 대응을 제시했는지 평가" }
      ],
        scoringRubric: defaultQuestionRubric,
      },
      {
        id: "12-3",
        cardId: "12",
        order: 3,
        titleKo: "아이디어 보호 전략",
        titleEn: "Creating a Protection Plan",
        visibleMission: "누군가 우리 아이디어를 따라하지 못하게 어떻게 막을 수 있을까?",
        hiddenGovernanceKeys: [
        { key: "protection_route", labelKo: "보호 경로", scoringIntent: "상표출원, 디자인등록, 특허출원, 계약, 비밀유지 등 보호 수단을 제시했는지 평가" },
        { key: "filing_priority", labelKo: "출원 우선순위", scoringIntent: "어떤 국가와 권리를 먼저 진행할지 우선순위를 정했는지 평가" },
        { key: "contractual_protection", labelKo: "계약 보호", scoringIntent: "파트너, 제조사, 유통사와의 NDA·계약 조항을 고려했는지 평가" },
        { key: "monitoring_plan", labelKo: "사후 모니터링", scoringIntent: "모방, 침해, 도용을 확인하고 대응할 방법을 제시했는지 평가" }
      ],
        scoringRubric: defaultQuestionRubric,
      }
    ],
  },
  {
    id: "13",
    titleKo: "지원 네트워크와 확장 전략",
    titleEn: "Onboarding & Expansion Strategy",
    questions: [
      {
        id: "13-1",
        cardId: "13",
        order: 1,
        titleKo: "도움 네트워크 찾기",
        titleEn: "Building a Support Network",
        visibleMission: "우리 프로젝트를 도와줄 사람이나 기관은 누구일까?",
        hiddenGovernanceKeys: [
        { key: "support_institutions", labelKo: "지원기관", scoringIntent: "정부, 무역기관, 대학, 협회, 창업기관 등 지원 네트워크를 제시했는지 평가" },
        { key: "expert_network", labelKo: "전문가 네트워크", scoringIntent: "인증, 법률, 마케팅, 통역, 물류, 투자 등 전문가를 고려했는지 평가" },
        { key: "business_partner", labelKo: "사업 파트너", scoringIntent: "현지 유통, 제조, 플랫폼, 마케팅 파트너를 고려했는지 평가" },
        { key: "network_role", labelKo: "역할 매칭", scoringIntent: "각 네트워크가 어떤 역할을 할 수 있는지 설명했는지 평가" }
      ],
        scoringRubric: defaultQuestionRubric,
      },
      {
        id: "13-2",
        cardId: "13",
        order: 2,
        titleKo: "테스트 시장 정하기",
        titleEn: "Choosing a Test Market",
        visibleMission: "우리 프로젝트를 처음 시도해볼 나라는 어디일까? 그 이유는 무엇일까?",
        hiddenGovernanceKeys: [
        { key: "test_market", labelKo: "테스트 시장", scoringIntent: "처음 시도할 국가 또는 지역을 명확히 선택했는지 평가" },
        { key: "selection_reason", labelKo: "선정 이유", scoringIntent: "시장성, 접근성, 규제, 파트너, 비용, 고객 반응을 근거로 설명했는지 평가" },
        { key: "test_scope", labelKo: "테스트 범위", scoringIntent: "기간, 제품, 대상 고객, 채널 등 테스트 범위를 정했는지 평가" },
        { key: "learning_goal", labelKo: "학습 목표", scoringIntent: "테스트를 통해 무엇을 검증할지 명확히 했는지 평가" }
      ],
        scoringRubric: defaultQuestionRubric,
      },
      {
        id: "13-3",
        cardId: "13",
        order: 3,
        titleKo: "확장 전략 만들기",
        titleEn: "Planning for Growth & Expansion",
        visibleMission: "한 나라에서 성공했다면, 다른 나라로 어떻게 확장할 수 있을까?",
        hiddenGovernanceKeys: [
        { key: "scaling_logic", labelKo: "확장 논리", scoringIntent: "첫 시장 성공 요인을 다음 시장에 어떻게 적용할지 설명했는지 평가" },
        { key: "next_markets", labelKo: "다음 시장", scoringIntent: "후속 진출 국가 또는 고객군을 제시했는지 평가" },
        { key: "replicable_model", labelKo: "반복 가능한 모델", scoringIntent: "파트너, 채널, 메시지, 운영방식을 복제 가능한 구조로 만들었는지 평가" },
        { key: "resource_plan", labelKo: "자원 계획", scoringIntent: "확장에 필요한 예산, 인력, 파트너, 인증 등을 고려했는지 평가" }
      ],
        scoringRubric: defaultQuestionRubric,
      }
    ],
  },
  {
    id: "14",
    titleKo: "우선 진출국 바이어·파트너 타깃 리스트",
    titleEn: "Priority Buyer & Partner Targeting List",
    questions: [
      {
        id: "14-1",
        cardId: "14",
        order: 1,
        titleKo: "파트너 리스트업",
        titleEn: "Building the Partner Database",
        visibleMission: "우선 진출국에서 실제로 제안할 바이어·파트너 기업은 누구일까?",
        hiddenGovernanceKeys: [
        { key: "target_company_list", labelKo: "타깃 기업 리스트", scoringIntent: "실제 제안할 바이어·파트너 기업 또는 기관을 제시했는지 평가" },
        { key: "target_type", labelKo: "타깃 유형", scoringIntent: "수입사, 유통사, 플랫폼, 병원, 제조사, 기관 등 유형을 구분했는지 평가" },
        { key: "decision_contact", labelKo: "의사결정 접점", scoringIntent: "가능한 담당부서, 직책, 컨택 포인트를 고려했는지 평가" },
        { key: "selection_reason", labelKo: "선정 이유", scoringIntent: "왜 이 기업이 적합한지 사업형태, 시장위상, 핏을 설명했는지 평가" }
      ],
        scoringRubric: defaultQuestionRubric,
      },
      {
        id: "14-2",
        cardId: "14",
        order: 2,
        titleKo: "시너지 분석 및 제안 설계",
        titleEn: "Designing Synergy & Value Propositions",
        visibleMission: "우리 제품·서비스·솔루션은 그 기업의 사업과 어떤 시너지를 만들 수 있을까?",
        hiddenGovernanceKeys: [
        { key: "target_business_fit", labelKo: "타깃 사업 적합성", scoringIntent: "상대 기업의 사업모델과 우리 제안의 연결성을 설명했는지 평가" },
        { key: "synergy_point", labelKo: "시너지 포인트", scoringIntent: "매출, 고객, 기술, 유통, 브랜드 측면의 시너지를 제시했는지 평가" },
        { key: "value_proposition", labelKo: "가치제안", scoringIntent: "상대가 얻을 이익을 명확한 문장으로 정리했는지 평가" },
        { key: "proof_material", labelKo: "제안 근거 자료", scoringIntent: "제품자료, 인증, PoC, 사례, 수치 등 제안 근거를 고려했는지 평가" }
      ],
        scoringRubric: defaultQuestionRubric,
      },
      {
        id: "14-3",
        cardId: "14",
        order: 3,
        titleKo: "제안 전략 수립",
        titleEn: "Strategic Communication & Approach Plan",
        visibleMission: "첫 제안 메시지는 어떤 방식, 언어, 가치제안으로 접근해야 효과적일까?",
        hiddenGovernanceKeys: [
        { key: "message_strategy", labelKo: "메시지 전략", scoringIntent: "첫 제안의 핵심 메시지와 의사결정 포인트를 정리했는지 평가" },
        { key: "language_tone", labelKo: "언어·톤", scoringIntent: "현지 언어, 영어, 비즈니스 톤, 문화적 표현을 고려했는지 평가" },
        { key: "channel_timing", labelKo: "접근 채널·타이밍", scoringIntent: "이메일, LinkedIn, 전시회, 소개, 콜드콜 등 접근 방식을 정했는지 평가" },
        { key: "followup_plan", labelKo: "후속 전략", scoringIntent: "1차 제안 이후 후속 메시지, 미팅, 샘플, PoC 요청 계획을 제시했는지 평가" }
      ],
        scoringRubric: defaultQuestionRubric,
      }
    ],
  },
  {
    id: "15",
    titleKo: "지속가능한 미래와 책임 수출",
    titleEn: "Sustainable Future & Responsible Export",
    questions: [
      {
        id: "15-1",
        cardId: "15",
        order: 1,
        titleKo: "환경 영향 점검",
        titleEn: "Checking Environmental Impact",
        visibleMission: "우리 아이디어나 제품은 환경에 어떤 영향을 주며, 줄일 수 있는 부담은 무엇일까?",
        hiddenGovernanceKeys: [
        { key: "environmental_impact", labelKo: "환경 영향", scoringIntent: "원료, 생산, 포장, 물류, 사용, 폐기 과정의 환경 영향을 고려했는지 평가" },
        { key: "reduction_opportunity", labelKo: "부담 저감 방안", scoringIntent: "탄소, 폐기물, 에너지, 물 사용, 포장재 부담을 줄일 방법을 제시했는지 평가" },
        { key: "regulation_link", labelKo: "환경 규제 연결", scoringIntent: "CBAM, 포장규제, 친환경 인증 등 관련 규제 가능성을 고려했는지 평가" },
        { key: "measurable_indicator", labelKo: "측정 지표", scoringIntent: "감축률, 재활용률, 인증 여부 등 측정 가능한 지표를 고려했는지 평가" }
      ],
        scoringRubric: defaultQuestionRubric,
      },
      {
        id: "15-2",
        cardId: "15",
        order: 2,
        titleKo: "사회적 가치 탐색",
        titleEn: "Exploring Social Value",
        visibleMission: "우리 아이디어는 고객, 지역사회, 취약계층 또는 협력 파트너에게 어떤 가치를 줄 수 있을까?",
        hiddenGovernanceKeys: [
        { key: "social_value", labelKo: "사회적 가치", scoringIntent: "고객, 지역사회, 취약계층, 협력사에 제공할 가치를 제시했는지 평가" },
        { key: "stakeholders", labelKo: "이해관계자", scoringIntent: "누가 영향을 받는지 이해관계자를 구분했는지 평가" },
        { key: "inclusive_benefit", labelKo: "포용적 효과", scoringIntent: "접근성, 안전, 건강, 교육, 일자리 등 긍정 효과를 고려했는지 평가" },
        { key: "evidence_or_case", labelKo: "근거·사례", scoringIntent: "사회적 가치가 실제로 작동할 근거 또는 사례를 제시했는지 평가" }
      ],
        scoringRubric: defaultQuestionRubric,
      },
      {
        id: "15-3",
        cardId: "15",
        order: 3,
        titleKo: "지속가능 실행 전략",
        titleEn: "Planning for Long-Term Sustainability",
        visibleMission: "우리 프로젝트가 오래 지속되기 위해 환경·사회적 책임을 어떻게 실행 전략에 반영할까?",
        hiddenGovernanceKeys: [
        { key: "sustainability_action", labelKo: "지속가능 실행", scoringIntent: "환경·사회적 책임을 실제 운영, 제품, 마케팅, 파트너십에 반영했는지 평가" },
        { key: "esg_alignment", labelKo: "ESG·SDG 연결", scoringIntent: "ESG 또는 SDG 관점에서 어떤 가치와 연결되는지 설명했는지 평가" },
        { key: "business_viability", labelKo: "사업 지속성", scoringIntent: "지속가능성이 비용만이 아니라 장기 경쟁력과 연결되는지 평가" },
        { key: "monitoring_plan", labelKo: "관리 지표", scoringIntent: "지속가능성과 책임 수출을 추적할 지표와 주기를 제시했는지 평가" }
      ],
        scoringRubric: defaultQuestionRubric,
      }
    ],
  },
  {
    id: "16",
    titleKo: "TBT·인증 장벽 돌파 전략",
    titleEn: "TBT & Certification Barrier Strategy",
    questions: [
      {
        id: "16-1",
        cardId: "16",
        order: 1,
        titleKo: "산업 코드와 TBT 현황 파악",
        titleEn: "Identifying Industry Code & TBT Requirements",
        visibleMission: "우리 제품이 목표 시장에서 반드시 충족해야 하는 기술규제(TBT)와 강제 인증은 무엇일까?",
        hiddenGovernanceKeys: [
        { key: "industry_code", labelKo: "산업·품목 코드", scoringIntent: "제품의 산업 코드, HS코드, 표준·품목분류를 확인했는지 평가" },
        { key: "tbt_requirements", labelKo: "TBT 요건", scoringIntent: "기술규정, 표준, 적합성평가, 시험, 인증 요구를 파악했는지 평가" },
        { key: "mandatory_certification", labelKo: "강제 인증", scoringIntent: "목표 시장에서 반드시 필요한 강제 인증 또는 등록을 제시했는지 평가" },
        { key: "competitor_certification", labelKo: "경쟁자 인증 현황", scoringIntent: "경쟁자가 이미 확보한 인증이나 표준 대응 상태를 비교했는지 평가" }
      ],
        scoringRubric: defaultQuestionRubric,
      },
      {
        id: "16-2",
        cardId: "16",
        order: 2,
        titleKo: "TBT 대응 전략 설계",
        titleEn: "Designing a TBT Response Strategy",
        visibleMission: "TBT 장벽이 수출 비용과 일정에 미치는 영향을 줄이려면 어떤 대응 전략이 필요할까?",
        hiddenGovernanceKeys: [
        { key: "cost_schedule_impact", labelKo: "비용·일정 영향", scoringIntent: "TBT가 비용, 시험기간, 출시일정에 미치는 영향을 추정했는지 평가" },
        { key: "response_route", labelKo: "대응 경로", scoringIntent: "시험기관, 인증기관, 현지 대리인, 선행 검토 등 대응 경로를 제시했는지 평가" },
        { key: "priority_action", labelKo: "우선 실행 과제", scoringIntent: "가장 먼저 준비해야 할 인증·서류·시험을 정했는지 평가" },
        { key: "risk_buffer", labelKo: "리스크 버퍼", scoringIntent: "지연, 재시험, 서류 보완 등 리스크 완충 계획을 제시했는지 평가" }
      ],
        scoringRubric: defaultQuestionRubric,
      },
      {
        id: "16-3",
        cardId: "16",
        order: 3,
        titleKo: "DEPA·FTA 연계",
        titleEn: "Leveraging DEPA & FTA",
        visibleMission: "DEPA·FTA 등 디지털통상협정이나 무역협정을 활용해 인증·TBT 부담을 줄일 방법은 무엇이며, 이를 수출 전략에 어떻게 반영할까?",
        hiddenGovernanceKeys: [
        { key: "agreement_mapping", labelKo: "협정 매핑", scoringIntent: "DEPA, FTA, 상호인정, 디지털통상 규범 등 활용 가능한 협정을 검토했는지 평가" },
        { key: "tbt_relief_clause", labelKo: "TBT 부담 완화 요소", scoringIntent: "협정 내 투명성, 상호인정, 전자문서, 데이터 이동 등 부담 완화 가능성을 찾았는지 평가" },
        { key: "strategy_integration", labelKo: "수출전략 반영", scoringIntent: "협정 활용 방안을 일정, 국가 선택, 인증 전략에 연결했는지 평가" },
        { key: "support_channel", labelKo: "지원 채널", scoringIntent: "TBT 통보문, 정부 지원, 무역기관, 전문가 자문 등 확인 경로를 제시했는지 평가" }
      ],
        scoringRubric: defaultQuestionRubric,
      }
    ],
  }
];

export const getSignalGovernanceCardById = (id: string) =>
  SIGNAL_GOVERNANCE_CARDS.find((card) => card.id === id);

export const getSignalGovernanceQuestionById = (questionId: string) =>
  SIGNAL_GOVERNANCE_CARDS
    .flatMap((card) => card.questions)
    .find((question) => question.id === questionId);
