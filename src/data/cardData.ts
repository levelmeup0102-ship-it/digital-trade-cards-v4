import type { CardColor, TopicCard, FlatCard } from '@/types';

export const CARD_COLORS: Record<string, CardColor> = {
  "01": { bg: "#00A9E0", name: "Azure Blue" },
  "02": { bg: "#003DA5", name: "Deep Blue" },
  "03": { bg: "#041E42", name: "Deep Navy" },
  "04": { bg: "#215283", name: "Gray Blue" },
  "05": { bg: "#582C83", name: "Purple" },
  "06": { bg: "#8A1538", name: "Wine Red" },
  "07": { bg: "#534AB7", name: "Indigo Purple" },
  "08": { bg: "#00B5AD", name: "Teal" },
  "09": { bg: "#4FB0C6", name: "Light Aqua" },
  "10": { bg: "#007681", name: "Blue Green" },
  "11": { bg: "#009639", name: "Forest Green" },
  "12": { bg: "#FFC72C", name: "Yellow" },
  "13": { bg: "#78BE20", name: "Lime Green" },
  "14": { bg: "#FF6F61", name: "Coral" },
  "15": { bg: "#FF671F", name: "Vivid Orange" },
  "16": { bg: "#512D38", name: "Dark Burgundy" },
};

export const TOPICS: TopicCard[] = [
  {
    id: "01", title: "시장 개요 및 정의", titleEn: "Market Overview & Definition", difficulty: 2,
    overview: "이 카드는 우리 제품이 속한 시장(산업)을 정의하고, 고객이 우리 제품을 언제, 왜 필요로 하는지를 이해하는 단계입니다.",
    insightQ: "우리 제품은 어떤 시장(산업)에 속하며, 고객은 어떤 이유로 우리를 선택할까?",
    subs: [
      { id: "01-1", title: "산업 코드와 포지셔닝", titleEn: "Industry Classification & Positioning", difficulty: 2,
        question: "수출할 때 사용되는 코드는 무엇이고, 우리 제품은 어떤 산업에 속할까?",
        checklist: ["우리 제품에 맞는 산업명을 찾아봤나요?","수출할 때 필요한 HS코드(품목분류)를 확인했나요?","같은 코드 내 대표 경쟁사를 조사했나요?","이 코드가 우리 제품의 인증·관세·유통에 어떤 영향을 주는지 정리했나요?"] },
      { id: "01-2", title: "JTBD 기반 고객 세그먼트", titleEn: "Jobs-to-be-Done Customer Segmentation", difficulty: 3,
        question: "고객은 언제, 왜 우리 제품을 필요로 할까?",
        checklist: ["고객이 우리 제품을 사용하는 상황을 2~3가지로 나눠봤나요?","각 상황에서 고객이 느끼는 불편함을 적었나요?","고객이 우리 제품을 선택하는 이유를 한문장으로 정리했나요?","비슷한 고객끼리 3개 그룹으로 정리했나요?"] },
      { id: "01-3", title: "시장 구조 & 플랫폼 흐름", titleEn: "Market Structure & Platform Flow", difficulty: 4,
        question: "우리 제품은 어떤 단계에서 사람들에게 소개되거나 팔리면 가장 좋을까?",
        checklist: ["생산→유통→판매→소비자 흐름을 간단히 그려봤나요?","우리 제품이 홍보되면 가장 효과적인 단계는?","그 단계에서 함께할 파트너를 적었나요?","작게 시도해볼 실험(PoC) 아이디어를 떠올려봤나요?"] },
    ]
  },
  {
    id: "02", title: "시장 분석 및 성장 구조", titleEn: "Market Size & Growth Structure", difficulty: 3,
    overview: "이 카드는 우리가 속한 산업의 규모와 성장 가능성을 이해하는 단계입니다. 시장의 크기와 성장률을 통해 우리 산업의 기회와 방향을 파악할 수 있습니다.",
    insightQ: "우리 산업의 시장은 지금 얼마나 크며, 앞으로 어디까지 성장할 수 있을까요?",
    subs: [
      { id: "02-1", title: "시장 규모 분석", titleEn: "Market Size Analysis", difficulty: 2,
        question: "지금 우리 산업의 시장 규모는 얼마나 될까?",
        checklist: ["최근 3~5년 기준 글로벌 시장 규모를 찾아봤나요?","출처를 함께 표기했나요?","연평균 성장률(CAGR)을 계산하거나 인용했나요?","우리 제품이 속한 세부 시장을 한 줄로 정리했나요?"] },
      { id: "02-2", title: "성장 동인 분석", titleEn: "Growth Drivers", difficulty: 3,
        question: "우리 산업이 성장하는 이유는 무엇인가요?",
        checklist: ["산업의 성장을 이끄는 주요 요인을 3가지 이상 정리했나요?","기술·소비습관·정책·환경 등 다양한 요인을 포함했나요?","ESG, 디지털 전환 등 사회적 흐름을 고려했나요?","그 요인이 우리 제품과 어떻게 연결되는지 표현했나요?"] },
      { id: "02-3", title: "미래 성장 전망", titleEn: "Future Outlook", difficulty: 3,
        question: "앞으로 이 시장은 어떤 방향으로 성장할까요?",
        checklist: ["향후 3~5년 시장 성장률(CAGR)을 명시했나요?","가장 빠르게 성장할 나라를 정했나요?","ESG·디지털화·AI 등 미래 트렌드를 포함했나요?","우리가 진출할 수 있는 새로운 기회를 한 줄로 제시했나요?"] },
    ]
  },
  {
    id: "03", title: "시장 세분화 및 타겟 전략", titleEn: "Market Segmentation & Targeting", difficulty: 3,
    overview: "이 카드는 시장에서 우리 제품과 가장 잘 맞는 고객 그룹을 찾는 단계입니다. 먼저 반응할 가능성이 높은 고객을 찾는 것이 중요합니다.",
    insightQ: "시장 중, 우리 제품을 가장 먼저 찾을 고객은 누구일까? 왜 우리를 선택할까?",
    subs: [
      { id: "03-1", title: "세분화 기준 설정", titleEn: "Setting Segmentation Criteria", difficulty: 2, question: "시장을 나누면 어떤 차이와 기회를 발견할 수 있을까?",
        checklist: ["시장을 나눌 수 있는 2~3가지 기준을 적었나요?","각 기준별로 고객의 특징을 한 줄로 정리했나요?","고객의 행동·관심·구매 이유의 차이가 보이나요?","그 차이가 우리 제품 전략에 어떤 기회를 줄 수 있나요?"] },
      { id: "03-2", title: "핵심 세그먼트 선정", titleEn: "Identifying Core Segment", difficulty: 3, question: "여러 고객 그룹 중, 우리 제품에 가장 잘 맞는 고객은 누구일까?",
        checklist: ["최소 3개의 고객 그룹을 구분했나요?","각 그룹의 크기와 구매력을 비교했나요?","우리 제품과 가장 잘 맞는 그룹을 표시했나요?","그 그룹이 우리 제품을 선택할 이유를 한 줄로 적었나요?"] },
      { id: "03-3", title: "타깃 전략 구체화", titleEn: "Targeting Strategy", difficulty: 4, question: "선택한 고객에게 어떤 방법으로 다가가면 관심을 가질까?",
        checklist: ["고객이 관심을 가지는 주제나 문제를 정리했나요?","맞는 홍보·판매 채널을 정했나요?","전달할 메시지나 표현을 구상했나요?","작게 시도해볼 캠페인 아이디어를 적었나요?"] },
    ]
  },
  {
    id: "04", title: "경쟁 분석 및 차별화 전략", titleEn: "Competitive Analysis & Differentiation", difficulty: 3,
    overview: "이 카드는 우리가 속한 시장의 주요 경쟁자를 파악하고, 그들과 비교해 우리만의 강점(차별화 포인트)을 찾는 단계입니다.",
    insightQ: "우리는 누구와 경쟁하고 있으며, 어떤 점에서 차별화할 수 있을까?",
    subs: [
      { id: "04-1", title: "경쟁자 리스트업", titleEn: "Competitor Identification", difficulty: 2, question: "우리 시장에서 경쟁하고 있는 주요 기업은 누구일까?",
        checklist: ["우리 산업과 유사한 제품·서비스를 제공하는 기업 2~3곳을 찾았나요?","각 기업의 대표 제품명 또는 브랜드를 정리했나요?","주요 시장(국내/해외)을 구분했나요?","공신력 있는 출처에서 정보를 확인했나요?"] },
      { id: "04-2", title: "경쟁 구조 분석", titleEn: "Market Structure & Business Model", difficulty: 3, question: "경쟁사들은 어떤 방식으로 고객을 확보하고, 어떤 수익 구조로 운영될까?",
        checklist: ["각 경쟁사의 핵심 수익 구조를 정리했나요?","고객 확보 방식을 파악했나요?","파트너사·협업 모델 등 차별적 요소를 구분했나요?","경쟁사들의 공통된 성공요인을 한 줄로 요약했나요?"] },
      { id: "04-3", title: "차별화 전략 수립", titleEn: "Building Differentiation Strategy", difficulty: 4, question: "우리 제품은 경쟁사와 어떤 점에서 다를까?",
        checklist: ["우리 제품이 제공하는 핵심 가치를 한 문장으로 표현했나요?","경쟁사 대비 강점 2가지, 약점 1가지를 명확히 구분했나요?","차별화 요소를 구체적으로 제시했나요?","차별화 전략을 실행할 수 있는 행동 아이디어를 적었나요?"] },
    ]
  },
  {
    id: "05", title: "시장 기회 분석 및 전략 포인트 도출", titleEn: "Market Opportunity & Strategic Point", difficulty: 3,
    overview: "이 카드는 시장에서 일어나는 정책·기술·소비 변화를 관찰하고, 그 안에서 우리가 대응할 새로운 기회 요인을 찾는 단계입니다.",
    insightQ: "시장이 빠르게 변하는 지금, 그 변화 속에서 우리가 잡을 수 있는 기회는 무엇일까?",
    subs: [
      { id: "05-1", title: "시장 변화 감지", titleEn: "Detecting Market Changes", difficulty: 2, question: "최근의 규제·기술·소비 변화가 우리 제품의 수출 타이밍이나 방향에 어떤 영향을 줄까?",
        checklist: ["최근 1~2년간 시장에서 주목받는 변화를 찾아봤나요?","이 변화가 우리 산업에 긍정적/부정적 영향을 주는 부분은?","고객의 구매 패턴이 이전과 달라진 점은?","변화가 일시적인 현상인지, 장기 트렌드인지 구분했나요?"] },
      { id: "05-2", title: "기회 요인 식별", titleEn: "Identifying Opportunities", difficulty: 3, question: "이 변화 속에서, 우리 산업에는 어떤 새로운 기회가 생길 수 있을까?",
        checklist: ["시장 변화가 만들어낸 새로운 수요나 틈새시장을 찾았나요?","그 기회가 나타나는 지역·고객·산업 분야를 정리했나요?","우리 제품이 그 기회를 활용할 수 있는 강점을 적었나요?","함께할 수 있는 협력사·파트너 후보를 조사했나요?"] },
      { id: "05-3", title: "전략 포인트 도출", titleEn: "Strategic Point Identification", difficulty: 4, question: "변화와 기회를 전략적으로 활용하려면 우리는 무엇을 조정하거나 새로 시도해야 할까?",
        checklist: ["현재 마케팅·판매 전략에서 즉시 조정할 부분은?","시장 변화를 검증하기 위한 작은 실험(PoC) 아이디어를 적었나요?","시장 데이터를 주기적으로 분석하거나 공유하는 체계가 있나요?","외부 파트너와 협력하거나 정보 교류할 수 있는 방법을 생각했나요?"] },
    ]
  },
  {
    id: "06", title: "규제 및 시장 진입 조건 분석", titleEn: "Regulatory & Market Entry Analysis", difficulty: 4,
    overview: "이 카드는 우리가 진출하려는 국가나 시장의 규제·정책 환경을 이해하는 단계입니다.",
    insightQ: "진출하려는 시장에서 마주할 규제는 무엇이며, 그 안에서 우리가 활용할 수 있는 협상 여지는 어디에 있을까?",
    subs: [
      { id: "06-1", title: "규제 요건 파악", titleEn: "Identify Key Regulatory Requirements", difficulty: 3, question: "우리가 진출하려는 시장에는 어떤 규제나 인증 제도가 있을까?",
        checklist: ["주요 법·제도(수입 인증, 안전 기준, 세관 절차 등)를 찾아봤나요?","필요한 인증서나 서류를 정리했나요?","미비한 정보도 함께 기록했나요?","규제 기관과 관련 부서를 함께 확인했나요?"] },
      { id: "06-2", title: "정책 변화 분석", titleEn: "Policy Trends & Shifts", difficulty: 4, question: "최근 3년간, 이 시장의 정책·규제 환경은 어떻게 바뀌었을까?",
        checklist: ["최근 3년 내 제·개정된 주요 법·정책 변화를 2~3가지 찾았나요?","인증 강화·완화, ESG, 디지털 규제 등 글로벌 트렌드를 구분했나요?","정책 변화가 우리 산업·제품에 미친 영향을 정리했나요?","앞으로 바뀔 가능성이 높은 규제 신호를 찾아봤나요?"] },
      { id: "06-3", title: "진입 전략 수립", titleEn: "Market Entry Strategy", difficulty: 4, question: "규제를 완화하거나 우회하기 위해 우리가 활용할 수 있는 방법은 무엇일까?",
        checklist: ["규제 대응을 위한 단기 조치를 명시했나요?","정부 기관, 무역협회, 현지 파트너 등 협력 가능한 주체를 정리했나요?","FTA, 상호인정제도 등 규제 완화 제도를 조사했나요?","협상을 유리하게 이끌 수 있는 우리의 강점을 한 문장으로 표현했나요?"] },
    ]
  },
  {
    id: "07", title: "고객 구매 여정 및 경험 설계", titleEn: "Customer Journey & Experience Design", difficulty: 4,
    overview: "이 카드는 고객이 우리 제품을 사용하고 반복 사용하는 이유를 이해하는 단계입니다.",
    insightQ: "고객은 무엇을 원하며, 왜 우리의 솔루션을 반복적으로 사용하게 될까?",
    subs: [
      { id: "07-1", title: "고객 정의 & JTBD 분석", titleEn: "Defining Customers & Their JTBDs", difficulty: 3, question: "우리의 고객은 누구이며, 무엇을 해결하려 할까?",
        checklist: ["주요 고객군을 3개 이상 구분했나요?","각 고객이 해결하고 싶은 일을 한 문장으로 적었나요?","구매 결정자와 실제 사용자를 구분했나요?","우리 제품이 고객의 핵심 니즈와 어떻게 연결되는지 이해했나요?"] },
      { id: "07-2", title: "고객 여정 맵핑", titleEn: "Customer Journey Mapping", difficulty: 4, question: "고객은 어떤 감정을 느끼고, 어떤 순간이 가장 중요할까?",
        checklist: ["고객 여정을 3단계(인지→사용→반복)로 구분했나요?","각 단계에서 고객이 느끼는 감정을 정리했나요?","고객의 감정이 강하게 바뀌는 핵심 터치포인트를 표시했나요?","감정을 개선하거나 강화할 방법을 한 줄로 적었나요?"] },
      { id: "07-3", title: "경험 설계 & 재사용 전략", titleEn: "Experience Design & Retention", difficulty: 4, question: "고객이 우리 제품을 계속 사용하는 이유는 무엇일까?",
        checklist: ["고객이 우리 제품을 반복해서 사용하는 이유를 2가지 이상 적었나요?","그 이유가 기능적 가치인지 감정적 가치인지 구분했나요?","고객의 충성도를 높일 수 있는 구조를 구상했나요?","재사용을 촉진할 수 있는 실험 아이디어를 적었나요?"] },
    ]
  },
  {
    id: "08", title: "비즈니스 모델 및 수익 구조 설계", titleEn: "Business Model & Revenue Design", difficulty: 4,
    overview: "이 카드는 우리 제품/서비스가 어떻게 수익을 만들어내는지 설계하는 단계입니다.",
    insightQ: "우리의 강점·약점·기회·위협을 조합하면, 지금 어떤 전략을 실행해야 할까?",
    subs: [
      { id: "08-1", title: "수익 모델 설계", titleEn: "Revenue Model Design", difficulty: 3, question: "우리 제품은 어떤 방식으로 돈을 버는가?",
        checklist: ["주요 수익 모델을 1~2가지로 정의했나요?","고객이 돈을 내는 이유(가치)를 명확히 했나요?","경쟁사 수익 모델과 비교했나요?","수익 모델을 실행할 수 있는 조건을 확인했나요?"] },
      { id: "08-2", title: "비용 구조 분석", titleEn: "Cost Structure Analysis", difficulty: 4, question: "우리가 지출해야 하는 주요 비용은 무엇인가?",
        checklist: ["고정비와 변동비를 구분했나요?","핵심 비용 항목 3가지를 정리했나요?","비용 절감이 가능한 영역을 찾았나요?","수익 대비 비용 구조가 지속 가능한지 검토했나요?"] },
      { id: "08-3", title: "수익성 전략 수립", titleEn: "Profitability Strategy", difficulty: 5, question: "어떻게 하면 더 많은 수익을 낼 수 있을까?",
        checklist: ["단기 수익화 전략을 적었나요?","장기 성장을 위한 수익 구조를 설계했나요?","파트너십을 통한 수익 확대 방안을 고려했나요?","수익성 목표(KPI)를 구체적으로 정의했나요?"] },
    ]
  },
  {
    id: "09", title: "가격 전략 및 시장 포지셔닝", titleEn: "Pricing Strategy & Market Positioning", difficulty: 5,
    overview: "이 카드는 우리 제품의 가격을 어떻게 설정하고 시장에서 어떻게 포지셔닝할지 결정하는 단계입니다.",
    insightQ: "지금까지의 분석을 바탕으로, 우리는 어디로, 누구와, 어떻게 진출할까?",
    subs: [
      { id: "09-1", title: "가격 전략 설정", titleEn: "Pricing Strategy", difficulty: 3, question: "우리 제품의 가격은 어떻게 정해야 할까?",
        checklist: ["경쟁사 가격을 조사했나요?","고객이 지불할 의향이 있는 가격대를 파악했나요?","가격 전략(침투/스키밍/프리미엄)을 선택했나요?","가격 결정 근거를 데이터로 뒷받침했나요?"] },
      { id: "09-2", title: "시장 포지셔닝", titleEn: "Market Positioning", difficulty: 4, question: "시장에서 우리는 어떤 위치에 있어야 할까?",
        checklist: ["포지셔닝 맵을 그려봤나요?","우리만의 고유한 포지션을 정의했나요?","포지셔닝 메시지를 한 문장으로 표현했나요?","포지셔닝이 타깃 고객과 일치하는지 확인했나요?"] },
      { id: "09-3", title: "가격-포지션 최적화", titleEn: "Price-Position Optimization", difficulty: 5, question: "가격과 포지션의 조합이 최적인가?",
        checklist: ["가격과 포지셔닝이 일관성 있게 연결되나요?","다양한 고객 세그먼트에 맞는 가격 옵션을 고려했나요?","가격 변경 시나리오와 그 영향을 검토했나요?","최종 가격-포지션 전략을 팀과 합의했나요?"] },
    ]
  },
  {
    id: "10", title: "제품 전략 및 가치 제안 설계", titleEn: "Product Strategy & Value Proposition", difficulty: 5,
    overview: "이 카드는 우리 제품의 핵심 가치를 정의하고 전략적으로 설계하는 단계입니다.",
    insightQ: "여러 나라 중, PoC를 어디서 먼저 시도하면 좋을까? 그 판단은 감이 아니라 데이터로 가능할까?",
    subs: [
      { id: "10-1", title: "제품 핵심 가치 정의", titleEn: "Core Value Definition", difficulty: 3, question: "우리 제품이 고객에게 제공하는 가장 핵심적인 가치는 무엇인가?",
        checklist: ["제품의 핵심 기능 3가지를 정리했나요?","각 기능이 고객에게 주는 가치를 연결했나요?","경쟁사 대비 독보적인 가치를 찾았나요?","고객이 우리를 선택해야 하는 이유를 한 문장으로 정리했나요?"] },
      { id: "10-2", title: "가치 제안 설계", titleEn: "Value Proposition Design", difficulty: 4, question: "우리의 가치 제안을 어떻게 표현하면 고객이 가장 잘 이해할까?",
        checklist: ["가치 제안 캔버스를 작성해봤나요?","고객의 Pain Point와 우리 솔루션을 연결했나요?","가치 제안을 단순하고 명확하게 표현했나요?","다양한 고객 세그먼트별 가치 제안을 차별화했나요?"] },
      { id: "10-3", title: "제품 로드맵 설계", titleEn: "Product Roadmap Design", difficulty: 5, question: "제품이 어떻게 발전해야 고객과 시장 모두를 만족시킬 수 있을까?",
        checklist: ["단기(3~6개월) 제품 목표를 정했나요?","중장기(1년 이상) 발전 방향을 구상했나요?","고객 피드백을 제품에 반영하는 체계를 설계했나요?","제품 로드맵의 우선순위를 명확히 했나요?"] },
    ]
  },
  {
    id: "11", title: "유통 및 판매 채널 전략", titleEn: "Distribution & Sales Channel Strategy", difficulty: 4,
    overview: "이 카드는 우리 제품이 고객에게 도달하는 최적의 경로를 설계하는 단계입니다.",
    insightQ: "PoC 결과와 시장 정보를 종합했을 때, 가장 먼저 진출할 나라는 어디이며, 그 시장에서 어떻게 차별화할 수 있을까?",
    subs: [
      { id: "11-1", title: "채널 분석", titleEn: "Channel Analysis", difficulty: 3, question: "우리 제품이 고객에게 닿을 수 있는 채널은 어디어디인가?",
        checklist: ["온라인/오프라인 채널을 모두 조사했나요?","각 채널의 장단점을 비교했나요?","경쟁사가 주로 사용하는 채널을 파악했나요?","우리 타깃 고객이 주로 이용하는 채널을 확인했나요?"] },
      { id: "11-2", title: "채널 전략 수립", titleEn: "Channel Strategy", difficulty: 4, question: "어떤 채널을 우선적으로 공략해야 할까?",
        checklist: ["주력 채널 1~2개를 선정했나요?","채널별 진입 비용과 효과를 비교했나요?","파트너십을 통한 채널 확보 방안을 검토했나요?","채널 전략의 단기/장기 목표를 설정했나요?"] },
      { id: "11-3", title: "유통 파트너 확보", titleEn: "Distribution Partner Acquisition", difficulty: 4, question: "어떤 파트너와 협력하면 채널 진입이 가장 효과적일까?",
        checklist: ["핵심 유통 파트너 후보를 조사했나요?","파트너십 조건을 구체적으로 검토했나요?","파트너에게 제안할 가치를 명확히 했나요?","파트너 확보를 위한 접근 전략을 수립했나요?"] },
    ]
  },
  {
    id: "12", title: "마케팅 및 고객 확보 전략", titleEn: "Marketing & Customer Acquisition", difficulty: 3,
    overview: "이 카드는 우리 제품을 알리고 첫 번째 고객을 확보하는 전략을 설계하는 단계입니다.",
    insightQ: "내가 만든 아이디어와 이름(브랜드)은 해외에서도 안전하게 지켜질까?",
    subs: [
      { id: "12-1", title: "마케팅 채널 선정", titleEn: "Marketing Channel Selection", difficulty: 2, question: "우리 제품을 알리기 위해 어떤 마케팅 채널을 사용해야 할까?",
        checklist: ["타깃 고객이 주로 이용하는 미디어를 파악했나요?","디지털/오프라인 마케팅 채널을 비교했나요?","예산 대비 효과가 높은 채널을 선택했나요?","초기 테스트할 마케팅 채널을 정했나요?"] },
      { id: "12-2", title: "고객 확보 전략", titleEn: "Customer Acquisition Strategy", difficulty: 3, question: "첫 번째 고객을 어떻게 확보할 것인가?",
        checklist: ["초기 고객 확보 목표(수량/기간)를 설정했나요?","고객 획득 비용(CAC)을 추정했나요?","첫 고객 확보를 위한 구체적인 액션 플랜을 세웠나요?","고객 추천/바이럴 전략을 고려했나요?"] },
      { id: "12-3", title: "브랜드 메시지 설계", titleEn: "Brand Message Design", difficulty: 3, question: "우리 브랜드를 고객에게 어떻게 전달해야 할까?",
        checklist: ["브랜드 핵심 메시지를 한 문장으로 정의했나요?","메시지가 타깃 고객에게 명확히 전달되는지 확인했나요?","다양한 채널에 맞게 메시지를 조정했나요?","브랜드 톤앤보이스를 정의했나요?"] },
    ]
  },
  {
    id: "13", title: "시장 진입 실행 전략 (Go-to-Market)", titleEn: "Go-to-Market Execution Strategy", difficulty: 2,
    overview: "이 카드는 실제로 시장에 진입하기 위한 실행 계획을 수립하는 단계입니다.",
    insightQ: "우리 프로젝트가 해외에서도 잘 작동하려면 누구와, 어디서, 어떤 방법으로 시작해야 할까?",
    subs: [
      { id: "13-1", title: "GTM 실행 계획", titleEn: "GTM Execution Plan", difficulty: 2, question: "시장 진입을 위해 가장 먼저 해야 할 일은 무엇인가?",
        checklist: ["GTM 전략의 핵심 목표를 정했나요?","첫 3개월 실행 계획을 구체화했나요?","팀별 역할과 책임을 명확히 했나요?","첫 번째 마일스톤을 설정했나요?"] },
      { id: "13-2", title: "파일럿 시장 선정", titleEn: "Pilot Market Selection", difficulty: 3, question: "처음 진입할 시장을 어디로 정해야 할까?",
        checklist: ["파일럿 시장 후보를 2~3개 정했나요?","각 시장의 진입 난이도를 비교했나요?","파일럿 성공 기준을 정의했나요?","파일럿 결과를 확장에 어떻게 활용할지 계획했나요?"] },
      { id: "13-3", title: "실행 타임라인 설계", titleEn: "Execution Timeline Design", difficulty: 3, question: "언제, 무엇을, 어떻게 실행할 것인가?",
        checklist: ["월별 실행 계획을 수립했나요?","각 단계의 성공 지표(KPI)를 정의했나요?","리소스 배분 계획을 세웠나요?","실행 중 발생할 수 있는 장애물을 파악했나요?"] },
    ]
  },
  {
    id: "14", title: "리스크 분석 및 대응 전략", titleEn: "Risk Analysis & Response Strategy", difficulty: 4,
    overview: "이 카드는 시장 진입 과정에서 발생할 수 있는 리스크를 파악하고 대응 전략을 수립하는 단계입니다.",
    insightQ: "우선 진출국에서, 우리는 어떤 기업에 먼저 제안하고 어떤 방식으로 접근해야 할까?",
    subs: [
      { id: "14-1", title: "리스크 식별", titleEn: "Risk Identification", difficulty: 3, question: "우리 전략 실행 시 어떤 위험 요소가 있을까?",
        checklist: ["시장/경쟁/규제/운영 리스크를 각각 파악했나요?","가장 큰 리스크 3가지를 선정했나요?","각 리스크의 발생 가능성과 영향도를 평가했나요?","리스크 우선순위를 정했나요?"] },
      { id: "14-2", title: "리스크 대응 전략", titleEn: "Risk Response Strategy", difficulty: 4, question: "각 리스크에 어떻게 대응할 것인가?",
        checklist: ["리스크별 대응 방안을 수립했나요?","사전 예방 조치와 사후 대응 방안을 구분했나요?","비상 계획(Contingency Plan)을 마련했나요?","리스크 모니터링 방법을 정했나요?"] },
      { id: "14-3", title: "리스크 관리 체계", titleEn: "Risk Management System", difficulty: 4, question: "리스크를 지속적으로 관리하는 체계는 어떻게 만들까?",
        checklist: ["리스크 관리 담당자를 지정했나요?","정기적인 리스크 검토 주기를 설정했나요?","리스크 발생 시 보고 체계를 구축했나요?","파트너/이해관계자와 리스크를 공유하는 방법을 정했나요?"] },
    ]
  },
  {
    id: "15", title: "확장 및 성장 전략", titleEn: "Expansion & Growth Strategy", difficulty: 2,
    overview: "이 카드는 초기 시장 진입 성공 후 어떻게 규모를 키울지 설계하는 단계입니다.",
    insightQ: "우리 프로젝트는 환경과 사람 모두에게 긍정적인 영향을 주고 있을까?",
    subs: [
      { id: "15-1", title: "성장 동력 파악", titleEn: "Growth Engine Identification", difficulty: 2, question: "우리 비즈니스의 성장을 이끄는 핵심 동력은 무엇인가?",
        checklist: ["주요 성장 동력 2~3가지를 정의했나요?","성장 동력을 강화할 수 있는 방법을 찾았나요?","경쟁사의 성장 동력과 비교했나요?","우리만의 지속 가능한 성장 엔진을 설계했나요?"] },
      { id: "15-2", title: "시장 확장 전략", titleEn: "Market Expansion Strategy", difficulty: 2, question: "다음 단계로 진출할 시장은 어디이며, 어떻게 확장할까?",
        checklist: ["확장할 다음 시장을 선정했나요?","기존 성공 사례를 새 시장에 어떻게 적용할지 계획했나요?","시장별 현지화 전략을 수립했나요?","확장 시 필요한 자원과 파트너를 파악했나요?"] },
      { id: "15-3", title: "지속 성장 모델 설계", titleEn: "Sustainable Growth Model", difficulty: 3, question: "장기적으로 지속 가능한 성장 모델은 무엇인가?",
        checklist: ["장기 성장 목표(3~5년)를 설정했나요?","성장에 필요한 재원 조달 방안을 검토했나요?","조직과 인력 확장 계획을 구상했나요?","지속 성장을 위한 핵심 역량을 정의했나요?"] },
    ]
  },
  {
    id: "16", title: "TBT·인증 장벽 돌파 전략", titleEn: "TBT & Certification Barrier Strategy", difficulty: 2,
    overview: "이 카드는 실제 수출 가능 여부를 최종 검증하고, 기술 장벽과 인증 문제를 해결하는 단계입니다.",
    insightQ: "AI를 쓸 때, 우리의 데이터와 정보는 얼마나 안전하게 지켜지고 있을까?",
    subs: [
      { id: "16-1", title: "TBT 장벽 파악", titleEn: "TBT Barrier Analysis", difficulty: 2, question: "수출 목표 국가에서 우리 제품이 마주할 기술 장벽은 무엇인가?",
        checklist: ["목표 국가의 TBT(무역기술장벽) 현황을 조사했나요?","우리 제품에 적용되는 기술 규제를 파악했나요?","인증 취득에 필요한 시간과 비용을 추정했나요?","TBT 대응 전문 기관이나 컨설턴트를 파악했나요?"] },
      { id: "16-2", title: "인증 전략 수립", titleEn: "Certification Strategy", difficulty: 2, question: "필요한 인증을 어떻게 효율적으로 취득할 수 있을까?",
        checklist: ["필수 인증 목록을 작성했나요?","인증 취득 우선순위를 정했나요?","정부 지원 인증 프로그램을 조사했나요?","인증 취득 타임라인을 계획했나요?"] },
      { id: "16-3", title: "장벽 돌파 실행 계획", titleEn: "Barrier Breakthrough Plan", difficulty: 3, question: "TBT와 인증 장벽을 극복하고 실제 수출을 실현하는 최종 계획은?",
        checklist: ["TBT 대응 실행 계획을 수립했나요?","인증 취득을 위한 자원(예산/인력)을 확보했나요?","장벽 극복 후 수출 개시 시점을 설정했나요?","성공적인 수출을 위한 최종 체크리스트를 완성했나요?"] },
    ]
  },
];

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
