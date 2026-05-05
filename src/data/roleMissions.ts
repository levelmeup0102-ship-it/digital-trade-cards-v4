// ─────────────────────────────────────────────
// SIGNAL · 직무별 미션 브리핑 (캐릭터 소개)
// ─────────────────────────────────────────────
// Welcome 화면과 게임 중 "내 직무 보기" 모달에서 사용.
// 본문 2~3줄, 인게임 미션 정확히 2줄로 압축.
// ─────────────────────────────────────────────

import type { RoleCode } from './roleData';

export interface RoleMission {
  // 인트로 한 줄 — 임팩트 있게
  tagline: string;
  // 본문 — "당신은 ~입니다" 톤 (2~3줄)
  description: string;
  // 게임 내 미션 — 구체적으로 뭘 해야 하는지 (정확히 2줄)
  inGameMission: string;
  // 핵심 강점 3가지
  strengths: string[];
}

export const ROLE_MISSIONS: Record<RoleCode, RoleMission> = {

  ceo: {
    tagline: "팀의 비전을 그리는 최종 결정권자",
    description:
      "당신은 우리 회사의 대표이사입니다. 팀원들의 인사이트를 종합해 결론을 내리고, 16장의 카드로 디지털 무역 전략을 완성하세요.",
    inGameMission:
      "팀원 인사이트를 종합해 팀 답변과 중간 결론을 작성하고, 결론 탭에서 한 문장 전략을 완성합니다.",
    strengths: ["의사결정", "전략 종합", "팀 리딩"],
  },

  market_analyst: {
    tagline: "숫자 뒤에 숨은 진실을 읽어내는 사람",
    description:
      "당신은 우리 회사의 시장 분석가입니다. 데이터로 팀의 의사결정을 뒷받침하고, 시장 변화의 신호를 가장 먼저 포착하세요.",
    inGameMission:
      "각 카드에 시장 규모·성장률·경쟁사 데이터를 수치와 출처로 답변합니다. 카드 01·02·03·05번이 핵심입니다.",
    strengths: ["데이터 분석", "시장 조사", "트렌드 포착"],
  },

  brand_strategist: {
    tagline: "경쟁 속에서 우리만의 색을 그리는 디자이너",
    description:
      "당신은 우리 회사의 브랜드 전략가입니다. 차별화 포인트와 포지셔닝으로 우리만의 자리를 만드세요.",
    inGameMission:
      "각 카드에 우리만의 차별화 포인트와 브랜드 메시지를 작성합니다. 카드 04·08번이 핵심입니다.",
    strengths: ["창의력", "포지셔닝", "스토리텔링"],
  },

  customer_insight: {
    tagline: "고객의 진짜 목소리에 귀를 기울이는 사람",
    description:
      "당신은 우리 회사의 고객 인사이트 리드입니다. 데이터에 안 보이는 진짜 니즈와 사용 상황을 읽어내세요.",
    inGameMission:
      "각 카드에 고객 페르소나와 JTBD(해야 할 일), 사용 상황을 작성합니다. 카드 07번이 핵심입니다.",
    strengths: ["공감력", "인터뷰", "페르소나 설계"],
  },

  global_sales: {
    tagline: "국경을 넘어 새로운 기회를 여는 개척자",
    description:
      "당신은 우리 회사의 해외영업 매니저입니다. 어느 나라에 어떻게 팔지 결정하고 시장을 개척하세요.",
    inGameMission:
      "각 카드에 진출 국가, 현지 파트너, 시장 특수성을 작성합니다. 카드 10·11·14번이 핵심입니다.",
    strengths: ["협상력", "시장 개척", "글로벌 네트워크"],
  },

  digital_marketer: {
    tagline: "클릭 한 번으로 세상에 신호를 보내는 사람",
    description:
      "당신은 우리 회사의 디지털 마케터입니다. SNS·광고·이커머스로 세상에 우리 제품을 알리세요.",
    inGameMission:
      "각 카드에 활용할 디지털 채널과 콘텐츠 캠페인을 작성합니다. 카드 05·07번이 핵심입니다.",
    strengths: ["콘텐츠 기획", "퍼포먼스 마케팅", "채널 운영"],
  },

  compliance_officer: {
    tagline: "보이지 않는 장벽을 지혜로 넘는 전문가",
    description:
      "당신은 우리 회사의 무역 규제 전문가입니다. 인증·관세·정책의 룰북을 알고 안전한 진출 길을 찾으세요.",
    inGameMission:
      "각 카드에 인증, 규제 리스크, FTA 활용 방안을 작성합니다. 카드 06·12·16번이 핵심입니다.",
    strengths: ["규정 분석", "리스크 관리", "문서 검토"],
  },

};

// 헬퍼: 직무 코드로 미션 가져오기
export function getRoleMission(code: RoleCode | string | null | undefined): RoleMission | null {
  if (!code) return null;
  return ROLE_MISSIONS[code as RoleCode] || null;
}
