import { computeWeeklyStreak, fetchPracticeTrendData } from "./practiceTrend";
import { fetchDashboardMetrics } from "./dashboard";

export type BadgeEvaluationContext = {
  totalAttempts: number;
  weeklyStreak: number;
};

export type BadgeDefinition = {
  id: string;
  label: string;
  description: string;
  icon: string;
  target: number;
  getProgress: (context: BadgeEvaluationContext) => number;
};

export type BadgeStatus = {
  id: string;
  label: string;
  description: string;
  icon: string;
  earned: boolean;
  progressCurrent: number;
  progressTarget: number;
};

const BADGE_DEFINITIONS: BadgeDefinition[] = [
  {
    id: "questions-50",
    label: "Question Champion",
    description: "Answered 50 practice questions.",
    icon: "🎯",
    target: 50,
    getProgress: (context) => context.totalAttempts
  },
  {
    id: "weekly-streak-4",
    label: "Momentum Keeper",
    description: "Practiced 4 weeks in a row.",
    icon: "🔥",
    target: 4,
    getProgress: (context) => context.weeklyStreak
  }
];

export function evaluateBadges(context: BadgeEvaluationContext): BadgeStatus[] {
  return BADGE_DEFINITIONS.map((definition) => {
    const progressCurrent = definition.getProgress(context);
    return {
      id: definition.id,
      label: definition.label,
      description: definition.description,
      icon: definition.icon,
      earned: progressCurrent >= definition.target,
      progressCurrent,
      progressTarget: definition.target
    } satisfies BadgeStatus;
  });
}

export async function fetchBadgeStatuses(userId: string): Promise<BadgeStatus[]> {
  const [metrics, trendData] = await Promise.all([fetchDashboardMetrics(), fetchPracticeTrendData(userId)]);
  const context: BadgeEvaluationContext = {
    totalAttempts: metrics.total_attempts,
    weeklyStreak: computeWeeklyStreak(trendData)
  };
  return evaluateBadges(context);
}
