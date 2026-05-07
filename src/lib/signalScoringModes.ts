// src/lib/signalScoringModes.ts
// SIGNAL 1,000점 채점 시스템 - 3가지 모드 점수 계산 유틸리티
// 기반: SIGNAL_final_scoring_modes_dev_handoff (2026.05.07)

export type ScoringMode = 'GAME_AUTO' | 'STANDARD_HYBRID' | 'CERTIFICATION';

export type Grade = 'S' | 'A' | 'B' | 'C' | 'D';

export type ReviewFlagType =
  | 'LOW_ACTIVITY'              // 활동 로그 부족
  | 'LOW_ROLE_OUTPUT'           // 담당 역할 산출물 부족
  | 'LOW_PEER_SIGNAL'           // 상호평가 낮음
  | 'HIGH_CONTRIBUTION'         // 활동·평가 모두 높음
  | 'POSSIBLE_FREE_RIDER'       // 무임승차 가능성
  | 'ALL_FULL_PEER_SCORE'       // 팀원 전원 만점
  | 'LOW_VARIANCE_PEER'         // 평가 편차 낮음
  | 'AI_LOW_CONFIDENCE'         // AI 신뢰도 낮음
  | 'MISSING_DATA';             // 데이터 부족

export type ReviewFlag = {
  type: ReviewFlagType;
  studentId?: string;
  teamId: string;
  message: string;
};

// ═══════════════════════════════════════════════════════
// 팀 점수 920점 (모든 모드 동일)
// ═══════════════════════════════════════════════════════

export type TeamScore920 = {
  A_questionCardQuality: number; // 0~640
  B_strategicCoherence: number;  // 0~160
  C_speedBonus: number;          // 0~80
  E_presentationQuality: number; // 0~40
};

export function calculateTeamScore920(input: TeamScore920): number {
  return (
    clamp(input.A_questionCardQuality, 0, 640) +
    clamp(input.B_strategicCoherence, 0, 160) +
    clamp(input.C_speedBonus, 0, 80) +
    clamp(input.E_presentationQuality, 0, 40)
  );
}

// ═══════════════════════════════════════════════════════
// 개인 점수 80점 — 모드별
// ═══════════════════════════════════════════════════════

// [GAME_AUTO] AI/로그 자동채점 중심 (대규모)
export type GameAutoPersonalScore = {
  aiRoleOutputScore40: number;     // 0~40
  behaviorAnalysisScore40: number; // 0~40
};

export function calculateGameAutoPersonalScore(input: GameAutoPersonalScore): number {
  return clamp(input.aiRoleOutputScore40, 0, 40) +
         clamp(input.behaviorAnalysisScore40, 0, 40);
}

// [STANDARD_HYBRID] 기본 추천 (30~100명)
export type StandardHybridPersonalScore = {
  aiRoleOutputScore35: number;     // 0~35
  behaviorAnalysisScore25: number; // 0~25
  lightweightPeerScore10: number;  // 0~10
  instructorReviewScore10: number; // 0~10, default 8
};

export function calculateStandardHybridPersonalScore(input: StandardHybridPersonalScore): number {
  return clamp(input.aiRoleOutputScore35, 0, 35) +
         clamp(input.behaviorAnalysisScore25, 0, 25) +
         clamp(input.lightweightPeerScore10, 0, 10) +
         clamp(input.instructorReviewScore10 ?? 8, 0, 10);
}

// [CERTIFICATION] 정밀 평가 (성적·인증)
export type CertificationPersonalScore = {
  roleOutputScore30: number;      // 0~30
  peerEvaluationScore20: number;  // 0~20
  observationScore30: number;     // 0~30
};

export function calculateCertificationPersonalScore(input: CertificationPersonalScore): number {
  return clamp(input.roleOutputScore30, 0, 30) +
         clamp(input.peerEvaluationScore20, 0, 20) +
         clamp(input.observationScore30, 0, 30);
}

// ═══════════════════════════════════════════════════════
// 등급 산출
// ═══════════════════════════════════════════════════════

export function getGrade(score: number): Grade {
  if (score >= 900) return 'S';
  if (score >= 800) return 'A';
  if (score >= 700) return 'B';
  if (score >= 600) return 'C';
  return 'D';
}

export function getGradeColor(grade: Grade): string {
  switch (grade) {
    case 'S': return '#FFD700'; // gold
    case 'A': return '#E7FE55'; // green
    case 'B': return '#06B6D4'; // cyan
    case 'C': return '#C1E8EB'; // aqua
    case 'D': return '#888888'; // gray
  }
}

// ═══════════════════════════════════════════════════════
// 최종 점수 계산
// ═══════════════════════════════════════════════════════

export type FinalScoreResult = {
  studentId: string;
  teamId: string;
  mode: ScoringMode;
  teamScore920: number;
  personalScore80: number;
  finalScore1000: number;
  grade: Grade;
  reviewFlags: ReviewFlag[];
};

export function calculateFinalScore(params: {
  studentId: string;
  teamId: string;
  mode: ScoringMode;
  teamScore: TeamScore920;
  personalInput: {
    gameAuto?: GameAutoPersonalScore;
    standardHybrid?: StandardHybridPersonalScore;
    certification?: CertificationPersonalScore;
  };
  reviewFlags?: ReviewFlag[];
}): FinalScoreResult {
  const teamScore920 = calculateTeamScore920(params.teamScore);

  let personalScore80 = 0;
  if (params.mode === 'GAME_AUTO') {
    if (!params.personalInput.gameAuto) {
      throw new Error('gameAuto score input required');
    }
    personalScore80 = calculateGameAutoPersonalScore(params.personalInput.gameAuto);
  } else if (params.mode === 'STANDARD_HYBRID') {
    if (!params.personalInput.standardHybrid) {
      throw new Error('standardHybrid score input required');
    }
    personalScore80 = calculateStandardHybridPersonalScore(params.personalInput.standardHybrid);
  } else if (params.mode === 'CERTIFICATION') {
    if (!params.personalInput.certification) {
      throw new Error('certification score input required');
    }
    personalScore80 = calculateCertificationPersonalScore(params.personalInput.certification);
  }

  const finalScore1000 = teamScore920 + personalScore80;

  return {
    studentId: params.studentId,
    teamId: params.teamId,
    mode: params.mode,
    teamScore920,
    personalScore80,
    finalScore1000,
    grade: getGrade(finalScore1000),
    reviewFlags: params.reviewFlags ?? [],
  };
}

// ═══════════════════════════════════════════════════════
// 속도 보너스 품질 게이트
// ═══════════════════════════════════════════════════════

export function canReceiveSpeedBonus(A: number, B: number): boolean {
  return A + B >= 600;
}

export function calculateSpeedBonusWithGate(params: {
  A_questionCardQuality: number;
  B_strategicCoherence: number;
  timeScore: number;
  rankScore: number;
  teamId: string;
}): { score: number; flag?: ReviewFlag } {
  const passed = canReceiveSpeedBonus(params.A_questionCardQuality, params.B_strategicCoherence);

  if (!passed) {
    return {
      score: 0,
      flag: {
        type: 'LOW_ACTIVITY',
        teamId: params.teamId,
        message: 'A+B 합계 < 600점. 속도 보너스 0점 처리됨.',
      },
    };
  }

  return {
    score: clamp(params.timeScore + params.rankScore, 0, 80),
  };
}

// ═══════════════════════════════════════════════════════
// 자동 확정 가능 여부
// ═══════════════════════════════════════════════════════

export function canAutoFinalize(params: {
  mode: ScoringMode;
  reviewFlags: ReviewFlag[];
}): boolean {
  // GAME_AUTO 모드만 자동 확정 가능
  if (params.mode !== 'GAME_AUTO') return false;
  // 플래그가 있으면 운영자 검토 필요
  return params.reviewFlags.length === 0;
}

// ═══════════════════════════════════════════════════════
// 행동 분석 (글자수, 작성 횟수, 시점 등)
// ═══════════════════════════════════════════════════════

export type BehaviorMetrics = {
  totalInsights: number;          // 총 인사이트 수
  completedInsights: number;       // 완료된 인사이트 수
  totalCharCount: number;          // 총 글자수
  avgCharCount: number;            // 평균 글자수
  cardsParticipated: number;       // 참여한 카드 수 (16개 중)
  hasNumbers: number;              // 숫자 사용 답변 수
  hasProperNouns: number;          // 고유명사 사용 답변 수
  hasExamples: number;             // 사례 사용 답변 수
  consistencyScore: number;        // 일관성 (0~100, 16카드 동안 꾸준히 참여)
};

// 행동 분석 점수 계산 (40점 만점, GAME_AUTO 모드)
export function calculateBehaviorScore40(metrics: BehaviorMetrics): {
  score: number;
  breakdown: {
    participation: number;    // 참여 빈도 15점
    quality: number;          // 답변 품질·근거성 15점
    consistency: number;      // 팀 기여 일관성 10점
  };
} {
  // 참여 빈도 (15점) - 16카드 중 몇 개 카드에 인사이트 작성?
  const participationRate = Math.min(metrics.cardsParticipated / 16, 1);
  const participation = Math.round(participationRate * 15);

  // 답변 품질·근거성 (15점) - 숫자, 고유명사, 사례 사용
  const totalAnswers = Math.max(metrics.totalInsights, 1);
  const evidenceRate = (
    metrics.hasNumbers + metrics.hasProperNouns + metrics.hasExamples
  ) / (totalAnswers * 3);
  const avgCharScore = Math.min(metrics.avgCharCount / 100, 1);  // 100자 만점
  const quality = Math.round((evidenceRate * 0.6 + avgCharScore * 0.4) * 15);

  // 팀 기여 일관성 (10점) - 16카드 동안 꾸준히 참여
  const consistency = Math.round((metrics.consistencyScore / 100) * 10);

  return {
    score: clamp(participation + quality + consistency, 0, 40),
    breakdown: { participation, quality, consistency },
  };
}

// 행동 분석 점수 계산 (25점 만점, STANDARD_HYBRID 모드)
export function calculateBehaviorScore25(metrics: BehaviorMetrics): {
  score: number;
  breakdown: {
    roleCardActivity: number;   // 담당 카드 활동 8
    teamConclusion: number;     // 팀 결론 기여 6
    evidence: number;           // 근거성 5
    consistency: number;        // 꾸준한 참여 3
    collaboration: number;      // 협업 흔적 3
  };
} {
  const totalAnswers = Math.max(metrics.totalInsights, 1);

  const roleCardActivity = Math.round(
    Math.min(metrics.cardsParticipated / 16, 1) * 8
  );
  const teamConclusion = Math.round(
    Math.min(metrics.completedInsights / Math.max(metrics.totalInsights, 1), 1) * 6
  );
  const evidence = Math.round(
    ((metrics.hasNumbers + metrics.hasProperNouns + metrics.hasExamples) / (totalAnswers * 3)) * 5
  );
  const consistency = Math.round((metrics.consistencyScore / 100) * 3);
  const collaboration = Math.round(
    Math.min(metrics.totalInsights / 16, 1) * 3
  );

  return {
    score: clamp(roleCardActivity + teamConclusion + evidence + consistency + collaboration, 0, 25),
    breakdown: { roleCardActivity, teamConclusion, evidence, consistency, collaboration },
  };
}

// ═══════════════════════════════════════════════════════
// 플래그 검출 (개인별)
// ═══════════════════════════════════════════════════════

export function detectPersonalFlags(params: {
  studentId: string;
  teamId: string;
  metrics: BehaviorMetrics;
  aiRoleOutputScore: number;
  aiRoleOutputMax: number;
  behaviorScore: number;
  behaviorScoreMax: number;
}): ReviewFlag[] {
  const flags: ReviewFlag[] = [];
  const { studentId, teamId, metrics } = params;

  // 활동 로그 부족
  if (metrics.cardsParticipated < 4) {
    flags.push({
      type: 'LOW_ACTIVITY',
      studentId, teamId,
      message: `참여 카드 ${metrics.cardsParticipated}/16 (4개 미만)`,
    });
  }

  // 담당 역할 산출물 부족
  const roleOutputRatio = params.aiRoleOutputScore / params.aiRoleOutputMax;
  if (roleOutputRatio < 0.4) {
    flags.push({
      type: 'LOW_ROLE_OUTPUT',
      studentId, teamId,
      message: `역할 산출물 ${params.aiRoleOutputScore}/${params.aiRoleOutputMax} (40% 미만)`,
    });
  }

  // 무임승차 가능성
  const behaviorRatio = params.behaviorScore / params.behaviorScoreMax;
  if (roleOutputRatio < 0.3 && behaviorRatio < 0.3) {
    flags.push({
      type: 'POSSIBLE_FREE_RIDER',
      studentId, teamId,
      message: '역할 산출물 + 행동 로그 모두 30% 미만',
    });
  }

  // 데이터 부족
  if (metrics.totalInsights === 0) {
    flags.push({
      type: 'MISSING_DATA',
      studentId, teamId,
      message: '인사이트 작성 기록 없음',
    });
  }

  // AI 신뢰도 낮음 (데이터 너무 부족)
  if (metrics.totalInsights < 3) {
    flags.push({
      type: 'AI_LOW_CONFIDENCE',
      studentId, teamId,
      message: `데이터 ${metrics.totalInsights}개로 AI 분석 신뢰도 낮음`,
    });
  }

  return flags;
}

// ═══════════════════════════════════════════════════════
// 팀 플래그 검출
// ═══════════════════════════════════════════════════════

export function detectTeamFlags(params: {
  teamId: string;
  A_score: number;
  B_score: number;
}): ReviewFlag[] {
  const flags: ReviewFlag[] = [];

  // 속도 보너스 품질 게이트 미달
  if (params.A_score + params.B_score < 600) {
    flags.push({
      type: 'LOW_ACTIVITY',
      teamId: params.teamId,
      message: `A+B 합계 ${params.A_score + params.B_score} < 600. 속도 보너스 0점 처리.`,
    });
  }

  return flags;
}

// ═══════════════════════════════════════════════════════
// 유틸리티
// ═══════════════════════════════════════════════════════

export function clamp(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) return min;
  return Math.min(Math.max(value, min), max);
}

export const DEFAULT_SCORING_MODE: ScoringMode = 'GAME_AUTO';
export const DEFAULT_INSTRUCTOR_REVIEW_SCORE = 8;
