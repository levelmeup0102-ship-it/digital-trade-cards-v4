import type { CardColor, TopicCard, FlatCard } from '@/types';

// ═══════════════════════════════════════════════════════
// SIGNAL V3 — ConnectAI 글로벌 진출 전략카드
// 16개 카드 × 3개 질문 = 48개 질문카드
// ═══════════════════════════════════════════════════════

// ⭐ V3 신규 카드 색상 (ConnectAI Color System v1.0)
export const CARD_COLORS: Record<string, CardColor> = {
  "01": { bg: "#00A9E0", name: "Azure Blue" },        // 시장 개요
  "02": { bg: "#003DA5", name: "Deep Blue" },         // 시장 규모
  "03": { bg: "#00B5AD", name: "Teal" },              // 세분화·타깃
  "04": { bg: "#582C83", name: "Purple" },            // 경쟁환경
  "05": { bg: "#FFC72C", name: "Yellow" },            // 시장 변화·기회
  "06": { bg: "#041E42", name: "Deep Navy" },         // 규제·정책
  "07": { bg: "#78BE20", name: "Lime Green" },        // 고객 인사이트
  "08": { bg: "#8A1538", name: "Wine Red" },          // SWOT
  "09": { bg: "#FF6F61", name: "Coral" },             // 전략결론·AI
  "10": { bg: "#4FB0C6", name: "Light Aqua" },        // PoC 분석
  "11": { bg: "#007681", name: "Blue Green" },        // 우선진출국
  "12": { bg: "#512D38", name: "Dark Burgundy" },     // 아이디어 보호
  "13": { bg: "#FF671F", name: "Vivid Orange" },      // 지원망·확장
  "14": { bg: "#215283", name: "Gray Blue" },         // 바이어·파트너
  "15": { bg: "#009639", name: "Forest Green" },      // 지속가능
  "16": { bg: "#0072CE", name: "Azure" },             // TBT·인증
};

// ═══════════════════════════════════════════════════════
// 16개 주제카드 데이터
// ═══════════════════════════════════════════════════════

export const TOPICS: TopicCard[] = [

  // ─── 카드 01 ────────────────────────────────────
  {
    id: "01",
    title: "시장 개요 및 산업 정의",
    titleEn: "Market Overview & Definition",
    difficulty: 2,
    category: "시장 이해",
    overview: "우리 제품이나 서비스가 속한 시장을 정의하고, 고객이 실제로 해결하려는 문제와 구매 채널을 정리합니다.",
    insightQ: "우리 제품은 어떤 시장에 속하며, 고객은 어떤 이유로 우리를 선택할까?",
    finalStrategyTemplate: "우리 제품·서비스는 ___ 시장에서 ___ 고객의 ___ 문제를 해결하기 위해 ___ 채널을 중심으로 진출한다.",
    subs: [
      {
        id: "01-1",
        title: "산업 코드와 포지셔닝",
        titleEn: "Industry Classification & Positioning",
        difficulty: 2,
        question: "수출할 때 우리 제품·서비스를 어떤 산업과 품목분류로 정의해야 할까?",
        resultUsage: "산업 정의",
        conclusionTemplate: "우리 제품·서비스는 ___ 산업의 ___ 분류에 속하며, 해외 진출 시 ___ 이 핵심 변수다.",
        checklist: [],
      },
      {
        id: "01-2",
        title: "JTBD 기반 고객 세그먼트",
        titleEn: "JTBD-Based Customer Segmentation",
        difficulty: 3,
        question: "고객은 어떤 문제를 해결하기 위해 우리 제품·서비스를 구매하려고 할까?",
        resultUsage: "고객/문제 정의",
        conclusionTemplate: "우리 고객은 ___ 상황에서 ___ 문제를 해결하기 위해 우리 제품·서비스를 선택한다.",
        checklist: [],
      },
      {
        id: "01-3",
        title: "시장 구조 & 플랫폼 흐름",
        titleEn: "Market Structure & Platform Flow",
        difficulty: 4,
        question: "우리 제품·서비스는 어떤 생산·유통·플랫폼 구조를 통해 고객에게 전달될까?",
        resultUsage: "구매 채널 정의",
        conclusionTemplate: "우리 제품·서비스는 ___ 구조를 통해 생산·유통되며, 핵심 구매 채널은 ___ 이다.",
        checklist: [],
      },
    ],
  },

  // ─── 카드 02 ────────────────────────────────────
  {
    id: "02",
    title: "시장 규모 및 성장 전망",
    titleEn: "Market Size & Growth Outlook",
    difficulty: 3,
    category: "시장 이해",
    overview: "우리 제품·서비스가 속한 시장의 크기, 성장 동인, 미래 전망을 분석해 진출 가능성을 판단합니다.",
    insightQ: "우리 산업의 시장 규모는 얼마나 크고, 앞으로 어떻게 성장할 수 있을까?",
    finalStrategyTemplate: "우리 시장은 ___ 규모로 성장 중이며, ___ 요인을 기반으로 ___ 시장을 우선 공략한다.",
    subs: [
      {
        id: "02-1",
        title: "시장 규모 분석",
        titleEn: "Market Size Analysis",
        difficulty: 2,
        question: "제품·서비스가 속한 시장 규모는 얼마나 클까?",
        resultUsage: "시장 매력도 판단",
        conclusionTemplate: "우리 시장은 현재 약 ___ 규모이며, 진입할 만한 이유는 ___ 이다.",
        checklist: [],
      },
      {
        id: "02-2",
        title: "성장 동인 분석",
        titleEn: "Growth Drivers",
        difficulty: 3,
        question: "우리 산업이 성장하는 이유는 무엇일까?",
        resultUsage: "성장 가능성 판단",
        conclusionTemplate: "이 시장의 성장을 이끄는 핵심 요인은 ___, ___, ___ 이다.",
        checklist: [],
      },
      {
        id: "02-3",
        title: "미래 성장 전망",
        titleEn: "Future Outlook",
        difficulty: 3,
        question: "앞으로 이 시장은 어떤 방향으로 성장할까?",
        resultUsage: "미래 기회 판단",
        conclusionTemplate: "향후 ___ 시장이 유망하며, 우리는 ___ 기회를 우선 공략해야 한다.",
        checklist: [],
      },
    ],
  },

  // ─── 카드 03 ────────────────────────────────────
  {
    id: "03",
    title: "시장 세분화 및 핵심 타깃 선정",
    titleEn: "Market Segmentation Analysis",
    difficulty: 3,
    category: "시장 이해",
    overview: "시장을 여러 기준으로 나누고, 우리 제품·서비스에 가장 적합한 핵심 고객군을 선택합니다.",
    insightQ: "시장을, 유저 특성 등 다양한 기준으로 나눈다면 우리는 누구를 타깃으로 선택해야 할까?",
    finalStrategyTemplate: "우리는 ___ 기준으로 시장을 나누고, ___ 고객군을 핵심 타깃으로 선택한다.",
    subs: [
      {
        id: "03-1",
        title: "세분화 기준 설정",
        titleEn: "Setting Segmentation Criteria",
        difficulty: 2,
        question: "시장을 나누려면 어떤 기준을 먼저 생각해야 할까?",
        resultUsage: "세분화 기준",
        conclusionTemplate: "우리는 시장을 ___, ___, ___ 기준으로 나누고 분석한다.",
        checklist: [],
      },
      {
        id: "03-2",
        title: "핵심 고객군 선정",
        titleEn: "Identifying Core Segment",
        difficulty: 3,
        question: "여러 고객 그룹 중, 우리 제품에 가장 맞는 고객은 누구일까?",
        resultUsage: "핵심 고객군 정의",
        conclusionTemplate: "우리의 핵심 고객군은 ___ 이며, 이들이 중요한 이유는 ___ 이다.",
        checklist: [],
      },
      {
        id: "03-3",
        title: "타깃 전략 구체화",
        titleEn: "Targeting Strategy",
        difficulty: 4,
        question: "선택한 고객에게 어떤 방식으로 다가가면 좋을까?",
        resultUsage: "타깃 접근 전략",
        conclusionTemplate: "우리는 ___ 고객에게 ___ 메시지와 ___ 채널로 접근한다.",
        checklist: [],
      },
    ],
  },

  // ─── 카드 04 ────────────────────────────────────
  {
    id: "04",
    title: "경쟁환경 및 차별화 분석",
    titleEn: "Competitive Landscape & Differentiation",
    difficulty: 3,
    category: "시장 이해",
    overview: "직접 경쟁자, 간접 경쟁자, 경쟁 구조를 분석하고 우리만의 차별화 방향을 정리합니다.",
    insightQ: "우리와 비슷한 플레이어는 누구이며, 어떤 틈에서 차별화할 수 있을까?",
    finalStrategyTemplate: "우리는 ___ 경쟁환경 속에서 ___ 차별화로 시장 진입 기회를 만든다.",
    subs: [
      {
        id: "04-1",
        title: "경쟁자 리스트업",
        titleEn: "Competitor Identification",
        difficulty: 2,
        question: "우리 시장에서 경쟁하고 있는 주요 기업은 누구일까?",
        resultUsage: "경쟁자 정의",
        conclusionTemplate: "우리의 주요 경쟁자는 ___, ___, ___ 이며, 가장 강한 경쟁자는 ___ 이다.",
        checklist: [],
      },
      {
        id: "04-2",
        title: "경쟁 구조 분석",
        titleEn: "Market Structure & Business Model",
        difficulty: 3,
        question: "경쟁사는 어떤 방식으로 고객을 확보하고, 어떤 수익 구조로 운영될까?",
        resultUsage: "경쟁구조 이해",
        conclusionTemplate: "이 시장의 경쟁 구조는 ___ 중심이며, 경쟁사는 ___ 방식으로 고객을 확보한다.",
        checklist: [],
      },
      {
        id: "04-3",
        title: "차별화 전략 수립",
        titleEn: "Building Differentiation Strategy",
        difficulty: 4,
        question: "우리 제품은 경쟁사와 어떤 점에서 다를까?",
        resultUsage: "차별화 포인트",
        conclusionTemplate: "우리는 ___ 을 차별화 포인트로 삼아, 고객에게 ___ 가치를 제공한다.",
        checklist: [],
      },
    ],
  },

  // ─── 카드 05 ────────────────────────────────────
  {
    id: "05",
    title: "시장 변화 및 기회 요인 분석",
    titleEn: "Market Trends & Opportunity Analysis",
    difficulty: 3,
    category: "시장 이해",
    overview: "최근 시장 변화, 기회 요인, 변화 대응 전략을 연결해 우리에게 유리한 타이밍을 찾습니다.",
    insightQ: "시장에 어떤 변화가 있으며, 그 변화 속에서 우리가 잡을 수 있는 기회는 무엇일까?",
    finalStrategyTemplate: "우리는 ___ 변화 속에서 ___ 기회를 포착하고, ___ 방식으로 대응한다.",
    subs: [
      {
        id: "05-1",
        title: "시장 변화 감지",
        titleEn: "Detecting Market Changes",
        difficulty: 2,
        question: "최근 1~3년 사이 시장·고객·기술·플랫폼에서 어떤 변화가 생겼을까?",
        resultUsage: "시장 변화 인식",
        conclusionTemplate: "최근 시장에서 가장 중요한 변화는 ___, ___, ___ 이다.",
        checklist: [],
      },
      {
        id: "05-2",
        title: "기회 요인 식별",
        titleEn: "Identifying Opportunities",
        difficulty: 3,
        question: "이 변화 속에서 우리 제품·서비스는 어떤 새로운 기회를 잡을 수 있을까?",
        resultUsage: "기회 요인",
        conclusionTemplate: "우리에게 가장 큰 기회는 ___ 이며, 그 이유는 ___ 이다.",
        checklist: [],
      },
      {
        id: "05-3",
        title: "변화 대응 전략",
        titleEn: "Strategy for Adapting to Change",
        difficulty: 4,
        question: "변화에 기회를 잡으려면 우리에게 필요한 기술과 도움이 되는 요소는 무엇일까?",
        resultUsage: "변화 대응 전략",
        conclusionTemplate: "우리는 ___ 변화에 대응하기 위해 ___ 전략을 실행한다.",
        checklist: [],
      },
    ],
  },

  // ─── 카드 06 ────────────────────────────────────
  {
    id: "06",
    title: "규제 및 정책 대응 전략",
    titleEn: "Regulatory & Policy Response Strategy",
    difficulty: 4,
    category: "전략 설계",
    overview: "목표 시장의 법·인증·통관 요건과 최근 정책 변화를 분석하고, 규제 리스크를 줄일 대응 전략을 설계합니다.",
    insightQ: "진출하려는 시장에서 반드시 충족해야 할 규제는 무엇이며, 그 규제가 수출 일정·비용·진입 방식에 미치는 영향을 어떻게 줄일 수 있을까?",
    finalStrategyTemplate: "우리는 목표 시장의 ___ 규제를 충족하기 위해 ___ 대응 전략을 우선 실행한다.",
    subs: [
      {
        id: "06-1",
        title: "규제 요건 파악",
        titleEn: "Identify Key Regulatory Requirements",
        difficulty: 3,
        question: "우리가 진출하려는 시장에서 반드시 확인해야 할 법·인증·통관 요건은 무엇일까?",
        resultUsage: "규제 요건 정의",
        conclusionTemplate: "목표 시장에서 반드시 확인해야 할 핵심 규제는 ___ 이며, 가장 중요한 인증·통관 요건은 ___ 이다.",
        checklist: [],
      },
      {
        id: "06-2",
        title: "정책 변화 분석",
        titleEn: "Policy Trends & Shifts",
        difficulty: 4,
        question: "최근 3년간 이 시장의 정책·규제 환경은 어떻게 바뀌었고, 우리 제품에 어떤 영향을 줄까?",
        resultUsage: "정책 변화 영향",
        conclusionTemplate: "최근 정책 변화 중 우리에게 가장 큰 영향을 주는 요소는 ___ 이다.",
        checklist: [],
      },
      {
        id: "06-3",
        title: "협상 및 대응 전략 수립",
        titleEn: "Building Negotiation & Adaptation Strategy",
        difficulty: 4,
        question: "규제를 충족하고 리스크를 줄이기 위해 우리가 활용할 수 있는 대응 전략은 무엇일까?",
        resultUsage: "규제 대응 전략",
        conclusionTemplate: "우리는 ___ 방식으로 규제를 충족하고, ___ 전략으로 리스크를 줄인다.",
        checklist: [],
      },
    ],
  },

  // ─── 카드 07 ────────────────────────────────────
  {
    id: "07",
    title: "고객 인사이트 및 수요 분석",
    titleEn: "Customer Insight & Demand Analysis",
    difficulty: 3,
    category: "고객 인사이트",
    overview: "고객의 상황, 감정, 구매여정, 반복사용 이유를 분석해 실질적 수요를 파악합니다.",
    insightQ: "고객은 겉으로 표현하는 말 외에 어떤 진짜 욕구와 반복수요를 가지고 있을까?",
    finalStrategyTemplate: "우리는 ___ 고객의 ___ 감정과 문제를 해결하며, ___ 방식으로 반복수요를 만든다.",
    subs: [
      {
        id: "07-1",
        title: "고객 정의 & JTBD 분석",
        titleEn: "Defining Customers & Their JTBD",
        difficulty: 3,
        question: "우리의 고객은 누구이며, 무엇을 해결하려 할까?",
        resultUsage: "고객 문제 정의",
        conclusionTemplate: "우리 고객은 ___ 이며, 이들은 ___ 문제를 해결하기 위해 우리 제품·서비스를 찾는다.",
        checklist: [],
      },
      {
        id: "07-2",
        title: "감정 & 여정 분석",
        titleEn: "Emotion & Customer Journey Mapping",
        difficulty: 4,
        question: "고객은 어떤 감정을 느끼고, 어떤 순서로 구매를 결정할까?",
        resultUsage: "고객 구매여정",
        conclusionTemplate: "고객은 ___ 감정에서 시작해 ___ 과정을 거쳐 구매를 결정한다.",
        checklist: [],
      },
      {
        id: "07-3",
        title: "재사용 수요 유지 전략",
        titleEn: "Retention & Lifetime Value Strategy",
        difficulty: 4,
        question: "고객이 우리 제품을 계속 사용하는 이유는 무엇일까?",
        resultUsage: "반복사용/재구매 전략",
        conclusionTemplate: "고객이 계속 사용하게 만들기 위해 우리는 ___ 경험과 ___ 가치를 제공해야 한다.",
        checklist: [],
      },
    ],
  },

  // ─── 카드 08 ────────────────────────────────────
  {
    id: "08",
    title: "SWOT 분석 및 실행전략 도출",
    titleEn: "SWOT Analysis & Strategic Action Plan",
    difficulty: 4,
    category: "전략 설계",
    overview: "내부 역량과 외부 환경을 함께 분석하고, SWOT을 실제 실행전략으로 연결합니다.",
    insightQ: "우리의 강점·약점을 바탕으로 기회와 위협을 조합해 어떤 전략을 실행해야 할까?",
    finalStrategyTemplate: "우리는 ___ 강점으로 ___ 기회를 잡고, ___ 약점과 위협은 ___ 방식으로 보완한다.",
    subs: [
      {
        id: "08-1",
        title: "내부 역량 파악",
        titleEn: "Analyzing Internal Strengths & Weaknesses",
        difficulty: 3,
        question: "우리의 강점과 약점은 무엇일까?",
        resultUsage: "내부 역량 분석",
        conclusionTemplate: "우리의 핵심 강점은 ___ 이고, 반드시 보완해야 할 약점은 ___ 이다.",
        checklist: [],
      },
      {
        id: "08-2",
        title: "외부 요인 파악",
        titleEn: "Analyzing External Opportunities & Threats",
        difficulty: 4,
        question: "우리 산업의 기회와 위협은 무엇일까?",
        resultUsage: "외부 환경 분석",
        conclusionTemplate: "우리에게 가장 큰 기회는 ___ 이며, 가장 조심해야 할 위협은 ___ 이다.",
        checklist: [],
      },
      {
        id: "08-3",
        title: "전략 수립 및 실행 계획",
        titleEn: "Formulating Strategic Actions",
        difficulty: 5,
        question: "SWOT 4요소를 조합하면 우리는 어떤 전략을 취해야 할까?",
        resultUsage: "실행전략",
        conclusionTemplate: "우리는 ___ 전략 조합을 선택하고, 이를 위해 ___ 을 실행한다.",
        checklist: [],
      },
    ],
  },

  // ─── 카드 09 ────────────────────────────────────
  {
    id: "09",
    title: "전략 결론 및 AI 제언 검토",
    titleEn: "Strategic Conclusion & AI Recommendation Review",
    difficulty: 4,
    category: "전략 설계",
    overview: "우선 시장을 결정하고, 협력 구조를 설계하며, AI 제언을 팀의 판단으로 검토해 실행 시나리오를 정합니다.",
    insightQ: "지금까지의 분석과 AI 제언을 바탕으로, 우리는 어느 시장에, 누구와 함께, 어떤 방식으로 진출할까?",
    finalStrategyTemplate: "우리는 ___ 시장에 ___ 파트너와 함께 ___ 방식으로 진출한다.",
    subs: [
      {
        id: "09-1",
        title: "우선시장 결정",
        titleEn: "Selecting the Priority Market",
        difficulty: 4,
        question: "지금 가장 먼저 진출해야 할 시장은 어디이며, 그 선택의 근거는 무엇일까?",
        resultUsage: "우선시장 결정",
        conclusionTemplate: "우리는 ___ 시장을 우선 진출 시장으로 선택하며, 그 이유는 ___ 이다.",
        checklist: [],
      },
      {
        id: "09-2",
        title: "협력 구조 설계",
        titleEn: "Partner & Execution Framework",
        difficulty: 4,
        question: "어떤 파트너와 협력해야 시장 진입 속도와 성공 가능성을 높일 수 있을까?",
        resultUsage: "협력구조",
        conclusionTemplate: "우리는 ___ 파트너와 협력해 ___ 방식으로 시장 진입을 추진한다.",
        checklist: [],
      },
      {
        id: "09-3",
        title: "AI 기반 전략 제언",
        titleEn: "AI-Driven Strategic Recommendation",
        difficulty: 5,
        question: "AI가 제안한 전략 시나리오 중 우리 팀이 채택하거나 수정해야 할 전략은 무엇일까?",
        resultUsage: "AI 제언 검토",
        conclusionTemplate: "AI 제언 중 우리는 ___ 전략을 채택하고, ___ 부분은 우리 상황에 맞게 수정한다.",
        checklist: [],
      },
    ],
  },

  // ─── 카드 10 ────────────────────────────────────
  {
    id: "10",
    title: "PoC 성공 가능성 분석",
    titleEn: "PoC Success Probability Analysis",
    difficulty: 4,
    category: "전략 설계",
    overview: "PoC 평가기준을 정하고, 국가별 데이터를 비교해 가장 실현 가능한 검증 시나리오를 도출합니다.",
    insightQ: "어떤 나라, PoC 방식, 파트너 구조를 활용할 때 그 검증은 과연 어디까지 이어질 수 있을까?",
    finalStrategyTemplate: "우리는 ___ 기준으로 PoC를 평가하고, ___ 시장에서 ___ 방식으로 먼저 검증한다.",
    subs: [
      {
        id: "10-1",
        title: "평가 기준 정하기",
        titleEn: "Setting Evaluation Criteria",
        difficulty: 3,
        question: "PoC 성공을 예측하려면 어떤 기준으로 살펴봐야 할까?",
        resultUsage: "PoC 평가기준",
        conclusionTemplate: "PoC 성공 가능성은 ___, ___, ___ 기준으로 평가한다.",
        checklist: [],
      },
      {
        id: "10-2",
        title: "데이터 비교하기",
        titleEn: "Comparing Data by Country",
        difficulty: 4,
        question: "후보 국가·지역별 비교데이터로 성공 가능성이 가장 높은 곳은?",
        resultUsage: "국가별 PoC 비교",
        conclusionTemplate: "비교 결과 ___ 시장의 PoC 성공 가능성이 가장 높다.",
        checklist: [],
      },
      {
        id: "10-3",
        title: "PoC 우선권 도출",
        titleEn: "Selecting Prioritization & Execution",
        difficulty: 4,
        question: "검증 과제를 보며 PoC를 어디부터 시작해야 할까?",
        resultUsage: "PoC 우선 실행안",
        conclusionTemplate: "우리는 ___ 에서 ___ 방식으로 PoC를 먼저 실행한다.",
        checklist: [],
      },
    ],
  },

  // ─── 카드 11 ────────────────────────────────────
  {
    id: "11",
    title: "우선 진출국 및 현지화 전략",
    titleEn: "Priority Market & Localization Strategy",
    difficulty: 4,
    category: "실행 설계",
    overview: "PoC 결과와 시장 정보를 바탕으로 우선 진출국을 선정하고, 현지화 및 파트너·고객 확보 전략을 수립합니다.",
    insightQ: "PoC 결과와 시장 정보를 종합했을 때, 가장 먼저 진출할 나라는 어디이며 그 시장에서 어떻게 차별화할 수 있을까?",
    finalStrategyTemplate: "우리는 ___ 국가를 우선 진출국으로 선택하고, ___ 현지화 전략으로 초기 고객과 파트너를 확보한다.",
    subs: [
      {
        id: "11-1",
        title: "우선 진출국 선정",
        titleEn: "Defining the Priority Market",
        difficulty: 4,
        question: "PoC 결과와 시장 데이터를 종합했을 때, 가장 먼저 진출해야 할 국가는?",
        resultUsage: "우선 진출국",
        conclusionTemplate: "우리는 ___ 을 1순위 진출국으로 선택한다.",
        checklist: [],
      },
      {
        id: "11-2",
        title: "현지화 및 차별화 전략",
        titleEn: "Benchmarking & Differentiation Strategy",
        difficulty: 4,
        question: "그 시장의 경쟁 환경은 어떻게 구성되고, 우리는 어떻게 다를까?",
        resultUsage: "현지화·차별화 전략",
        conclusionTemplate: "우리는 현지 시장에서 ___ 을 기준으로 차별화한다.",
        checklist: [],
      },
      {
        id: "11-3",
        title: "파트너·고객 확보 전략",
        titleEn: "Partner & Customer Acquisition Strategy",
        difficulty: 4,
        question: "해당 시장에서 어떤 파트너와 고객을 먼저 확보해야 가능할까?",
        resultUsage: "초기 확보 대상",
        conclusionTemplate: "우리는 ___ 파트너와 ___ 고객군을 먼저 확보한다.",
        checklist: [],
      },
    ],
  },

  // ─── 카드 12 ────────────────────────────────────
  {
    id: "12",
    title: "아이디어·브랜드 보호 전략",
    titleEn: "Protecting Our Idea & Brand Internationally",
    difficulty: 4,
    category: "실행 설계",
    overview: "아이디어, 브랜드, 디자인, 기술을 해외에서 보호하기 위해 등록 가능성, 충돌 여부, 보호전략을 점검합니다.",
    insightQ: "내가 만든 아이디어나 브랜드는 해외에서도 안전하게 지켜질 수 있을까?",
    finalStrategyTemplate: "우리는 ___ 요소를 우선 보호하고, ___ 시장 진출 전 ___ 등록·검토를 진행한다.",
    subs: [
      {
        id: "12-1",
        title: "등록 현황 확인",
        titleEn: "Checking What's Protected",
        difficulty: 3,
        question: "우리의 아이디어와 브랜드는 해외에서도 등록되어 있을까?",
        resultUsage: "보호 현황",
        conclusionTemplate: "현재 보호가 필요한 요소는 ___ 이며, 우선 확인해야 할 등록 항목은 ___ 이다.",
        checklist: [],
      },
      {
        id: "12-2",
        title: "아이디어 겹침 점검",
        titleEn: "Checking for Similar Ideas or Conflicts",
        difficulty: 4,
        question: "혹시 우리와 비슷한 아이디어가 이미 다른 나라에 등록되어 있을 수 있을까?",
        resultUsage: "충돌 가능성",
        conclusionTemplate: "유사 아이디어·상표·디자인과의 충돌 가능성은 ___ 이며, 주의할 점은 ___ 이다.",
        checklist: [],
      },
      {
        id: "12-3",
        title: "아이디어 보호 전략",
        titleEn: "Creating a Protection Plan",
        difficulty: 4,
        question: "누군가 우리 아이디어를 따라하지 못하게 어떻게 막을 수 있을까?",
        resultUsage: "보호 실행전략",
        conclusionTemplate: "우리는 ___ 방식으로 아이디어와 브랜드를 보호하고, ___ 지역부터 등록을 추진한다.",
        checklist: [],
      },
    ],
  },

  // ─── 카드 13 ────────────────────────────────────
  {
    id: "13",
    title: "지원 네트워크와 확장 전략",
    titleEn: "Onboarding & Expansion Strategy",
    difficulty: 3,
    category: "실행 설계",
    overview: "프로젝트를 다른 나라에서 실제로 시작하기 위해 도움 네트워크, 테스트 시장, 확장 전략을 설계합니다.",
    insightQ: "우리 프로젝트가 해외에서도 잘 작동하려면 누구와, 어디서, 어떤 방법으로 시작해야 할까?",
    finalStrategyTemplate: "우리는 ___ 네트워크와 ___ 테스트 시장을 기반으로, ___ 방식으로 해외 확장을 시작한다.",
    subs: [
      {
        id: "13-1",
        title: "도움 네트워크 찾기",
        titleEn: "Building a Support Network",
        difficulty: 2,
        question: "우리 프로젝트를 도와줄 사람이나 기관은 누구일까?",
        resultUsage: "지원 네트워크",
        conclusionTemplate: "우리 프로젝트를 도와줄 핵심 네트워크는 ___, ___, ___ 이다.",
        checklist: [],
      },
      {
        id: "13-2",
        title: "테스트 시장 정하기",
        titleEn: "Choosing a Test Market",
        difficulty: 3,
        question: "우리 프로젝트를 처음 시도해볼 나라는 어디일까? 그 이유는 무엇일까?",
        resultUsage: "테스트 시장",
        conclusionTemplate: "우리는 ___ 을 테스트 시장으로 선택하며, 그 이유는 ___ 이다.",
        checklist: [],
      },
      {
        id: "13-3",
        title: "확장 전략 만들기",
        titleEn: "Planning for Growth & Expansion",
        difficulty: 3,
        question: "한 나라에서 성공했다면, 다른 나라로 어떻게 확장할 수 있을까?",
        resultUsage: "확장 전략",
        conclusionTemplate: "첫 시장에서 검증한 뒤, 우리는 ___ 방식으로 ___ 시장까지 확장한다.",
        checklist: [],
      },
    ],
  },

  // ─── 카드 14 ────────────────────────────────────
  {
    id: "14",
    title: "우선 진출국 바이어·파트너 타깃 리스트",
    titleEn: "Priority Buyer & Partner Targeting List",
    difficulty: 4,
    category: "실행 설계",
    overview: "우선 진출국에서 실제 제안을 보낼 기업과 기관을 찾고, 제안 메시지와 접근 전략을 설계합니다.",
    insightQ: "우선 진출국에서 실제로 접촉할 바이어·파트너는 누구이며, 어떤 가치제안과 메시지로 접근해야 할까?",
    finalStrategyTemplate: "우리는 ___ 타깃 기업에 ___ 가치제안으로 접근하고, ___ 방식으로 후속 협의를 만든다.",
    subs: [
      {
        id: "14-1",
        title: "파트너 리스트업",
        titleEn: "Building the Partner Database",
        difficulty: 3,
        question: "우선 진출국에서 실제로 제안할 바이어·파트너 기업은 누구일까?",
        resultUsage: "타깃 리스트",
        conclusionTemplate: "우리가 먼저 제안할 타깃 기업·기관은 ___, ___, ___ 이다.",
        checklist: [],
      },
      {
        id: "14-2",
        title: "시너지 분석 및 제안 설계",
        titleEn: "Designing Synergy & Value Propositions",
        difficulty: 4,
        question: "우리 제품·서비스·솔루션은 그 기업의 사업과 어떤 시너지를 만들 수 있을까?",
        resultUsage: "가치제안",
        conclusionTemplate: "우리의 제안은 ___ 기업에게 ___ 시너지를 제공할 수 있다.",
        checklist: [],
      },
      {
        id: "14-3",
        title: "제안 전략 수립",
        titleEn: "Strategic Communication & Approach Plan",
        difficulty: 4,
        question: "첫 제안 메시지는 어떤 방식, 언어, 가치제안으로 접근해야 효과적일까?",
        resultUsage: "컨택 전략",
        conclusionTemplate: "첫 제안은 ___ 방식으로 접근하고, 핵심 메시지는 ___ 로 설계한다.",
        checklist: [],
      },
    ],
  },

  // ─── 카드 15 ────────────────────────────────────
  {
    id: "15",
    title: "지속가능한 미래와 책임 수출",
    titleEn: "Sustainable Future & Responsible Export",
    difficulty: 3,
    category: "실행 설계",
    overview: "우리 아이디어나 제품이 환경과 사회에 미치는 영향을 살피고, 장기적으로 지속 가능한 실행 전략을 세웁니다.",
    insightQ: "우리 프로젝트는 환경과 사람에게 어떤 영향을 주며, 지속가능하게 성장하기 위해 무엇을 실천해야 할까?",
    finalStrategyTemplate: "우리 프로젝트는 ___ 환경 영향을 줄이고, ___ 사회적 가치를 만들어 지속가능하게 성장한다.",
    subs: [
      {
        id: "15-1",
        title: "환경 영향 점검",
        titleEn: "Checking Environmental Impact",
        difficulty: 2,
        question: "우리 아이디어나 제품은 환경에 어떤 영향을 주며, 줄일 수 있는 부담은 무엇일까?",
        resultUsage: "환경 영향",
        conclusionTemplate: "우리 프로젝트가 환경에 주는 영향은 ___ 이며, 줄여야 할 부담은 ___ 이다.",
        checklist: [],
      },
      {
        id: "15-2",
        title: "사회적 가치 탐색",
        titleEn: "Exploring Social Value",
        difficulty: 3,
        question: "우리 아이디어는 고객, 지역사회, 취약계층 또는 협력 파트너에게 어떤 가치를 줄 수 있을까?",
        resultUsage: "사회적 가치",
        conclusionTemplate: "우리 아이디어는 ___ 에게 ___ 가치를 제공할 수 있다.",
        checklist: [],
      },
      {
        id: "15-3",
        title: "지속가능 실행 전략",
        titleEn: "Planning for Long-Term Sustainability",
        difficulty: 3,
        question: "우리 프로젝트가 오래 지속되기 위해 환경·사회적 책임을 어떻게 실행 전략에 반영할까?",
        resultUsage: "지속가능 실행전략",
        conclusionTemplate: "우리는 ___ 실천을 통해 환경·사회적 책임을 실행하고, ___ 방식으로 지속가능성을 높인다.",
        checklist: [],
      },
    ],
  },

  // ─── 카드 16 ────────────────────────────────────
  {
    id: "16",
    title: "TBT·인증 장벽 돌파 전략",
    titleEn: "TBT & Certification Barrier Strategy",
    difficulty: 5,
    category: "실행 설계",
    overview: "목표 시장의 기술규제, 강제 인증, TBT 비용과 일정을 파악하고, DEPA·FTA 등 무역협정 활용 가능성을 검토합니다.",
    insightQ: "우리 제품은 목표 시장의 기술규제와 인증 장벽을 어떻게 준비해, 경쟁자보다 빠르고 안전하게 시장에 진입할 수 있을까?",
    finalStrategyTemplate: "우리는 ___ 기술규제와 인증 장벽을 ___ 전략으로 준비해, 목표 시장에 더 빠르고 안전하게 진입한다.",
    subs: [
      {
        id: "16-1",
        title: "산업 코드와 TBT 현황 파악",
        titleEn: "Identifying Industry Code & TBT Requirements",
        difficulty: 4,
        question: "우리 제품이 목표 시장에서 반드시 충족해야 하는 기술규제(TBT)와 강제 인증은 무엇일까?",
        resultUsage: "TBT·인증 요건",
        conclusionTemplate: "목표 시장에서 반드시 충족해야 할 기술규제와 인증은 ___ 이다.",
        checklist: [],
      },
      {
        id: "16-2",
        title: "TBT 대응 전략 설계",
        titleEn: "Designing a TBT Response Strategy",
        difficulty: 5,
        question: "TBT 장벽이 수출 비용과 일정에 미치는 영향을 줄이려면 어떤 대응 전략이 필요할까?",
        resultUsage: "TBT 대응전략",
        conclusionTemplate: "TBT 장벽으로 인한 비용·일정 영향을 줄이기 위해 우리는 ___ 전략을 실행한다.",
        checklist: [],
      },
      {
        id: "16-3",
        title: "DEPA·FTA 연계",
        titleEn: "Leveraging DEPA & FTA",
        difficulty: 5,
        question: "DEPA·FTA 등 디지털통상협정이나 무역협정을 활용해 인증·TBT 부담을 줄일 방법은 무엇이며, 이를 수출 전략에 어떻게 반영할까?",
        resultUsage: "협정 활용 전략",
        conclusionTemplate: "우리는 ___ 협정 또는 제도를 활용해 인증·TBT 부담을 줄이고, ___ 일정으로 실행한다.",
        checklist: [],
      },
    ],
  },
];

// ═══════════════════════════════════════════════════════
// 헬퍼 함수
// ═══════════════════════════════════════════════════════

export function buildCardList(): FlatCard[] {
  const cards: FlatCard[] = [];
  TOPICS.forEach((topic) => {
    cards.push({ type: 'topic', data: topic, parentId: topic.id });
    topic.subs.forEach((sub) => {
      cards.push({ type: 'question', data: sub, parentId: topic.id });
    });
  });
  return cards;
}

export const ALL_CARDS = buildCardList();

// 빈칸 채우기 템플릿 파싱: "텍스트 ___ 텍스트" → ['텍스트 ', ' 텍스트']
export function parseTemplate(template: string): string[] {
  return template.split('___');
}

// 빈칸 채우기 결과 합성: parts + values → 완성 문장
export function composeFromTemplate(template: string, values: string[]): string {
  const parts = parseTemplate(template);
  let result = '';
  for (let i = 0; i < parts.length; i++) {
    result += parts[i];
    if (i < values.length) {
      result += values[i] || '___';
    }
  }
  return result;
}

// 카테고리별 카드 ID 그룹
export const CARDS_BY_CATEGORY = {
  '시장 이해': ['01', '02', '03', '04', '05'],
  '전략 설계': ['06', '08', '09', '10'],
  '고객 인사이트': ['07'],
  '실행 설계': ['11', '12', '13', '14', '15', '16'],
} as const;
