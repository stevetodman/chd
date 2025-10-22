import { describe, expect, it } from "vitest";

type AnswerEvent = {
  userId: string;
  questionId: string;
  isCorrect: boolean;
  effectiveAt: string;
  createdAt: string;
};

type Attempt = {
  userId: string;
  createdAt: string;
  isCorrect: boolean;
};

type WeeklyInput = {
  now: Date;
  responseEvents: AnswerEvent[];
  murmurAttempts?: Attempt[];
  cxrAttempts?: Attempt[];
};

const MS_PER_DAY = 86_400_000;

const toDate = (value: string): Date => new Date(value);

const startOfWeekUtc = (date: Date): Date => {
  const midnight = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  const dayOfWeek = date.getUTCDay();
  const diffFromMonday = (dayOfWeek + 6) % 7;
  return new Date(midnight - diffFromMonday * MS_PER_DAY);
};

const withinBounds = (value: Date, start: Date, end: Date): boolean =>
  value.getTime() >= start.getTime() && value.getTime() < end.getTime();

const computeWeeklyLeaderboard = ({
  now,
  responseEvents,
  murmurAttempts = [],
  cxrAttempts = []
}: WeeklyInput): Map<string, number> => {
  const weekStart = startOfWeekUtc(now);
  const weekEnd = new Date(weekStart.getTime() + 7 * MS_PER_DAY);

  const grouped = new Map<string, AnswerEvent>();

  const filteredEvents = responseEvents
    .map((event) => ({ ...event, effective: toDate(event.effectiveAt), created: toDate(event.createdAt) }))
    .filter((event) => withinBounds(event.effective, weekStart, weekEnd))
    .sort((a, b) => {
      const userCompare = a.userId.localeCompare(b.userId);
      if (userCompare !== 0) return userCompare;
      const questionCompare = a.questionId.localeCompare(b.questionId);
      if (questionCompare !== 0) return questionCompare;
      const effectiveCompare = b.effective.getTime() - a.effective.getTime();
      if (effectiveCompare !== 0) return effectiveCompare;
      return b.created.getTime() - a.created.getTime();
    });

  for (const event of filteredEvents) {
    const key = `${event.userId}:${event.questionId}`;
    if (!grouped.has(key)) {
      grouped.set(key, {
        userId: event.userId,
        questionId: event.questionId,
        isCorrect: event.isCorrect,
        effectiveAt: event.effectiveAt,
        createdAt: event.createdAt
      });
    }
  }

  const totals = new Map<string, number>();

  for (const { userId, isCorrect } of grouped.values()) {
    if (!isCorrect) continue;
    totals.set(userId, (totals.get(userId) ?? 0) + 1);
  }

  const addAttempts = (attempts: Attempt[]) => {
    for (const attempt of attempts) {
      if (!attempt.isCorrect) continue;
      const createdAt = toDate(attempt.createdAt);
      if (!withinBounds(createdAt, weekStart, weekEnd)) continue;
      totals.set(attempt.userId, (totals.get(attempt.userId) ?? 0) + 1);
    }
  };

  addAttempts(murmurAttempts);
  addAttempts(cxrAttempts);

  return totals;
};

describe("weekly leaderboard aggregation", () => {
  const now = new Date("2024-05-08T12:00:00Z");

  it("awards points when a response is corrected during the week", () => {
    const responseEvents: AnswerEvent[] = [
      {
        userId: "user-corrected",
        questionId: "question-1",
        isCorrect: false,
        effectiveAt: "2024-04-29T09:00:00Z",
        createdAt: "2024-04-29T09:00:00Z"
      },
      {
        userId: "user-corrected",
        questionId: "question-1",
        isCorrect: true,
        effectiveAt: "2024-05-06T08:00:00Z",
        createdAt: "2024-05-06T08:00:00Z"
      }
    ];

    const leaderboard = computeWeeklyLeaderboard({ now, responseEvents });

    expect(leaderboard.get("user-corrected")).toBe(1);
  });

  it("does not double count when answers flip within the week", () => {
    const responseEvents: AnswerEvent[] = [
      {
        userId: "user-flip",
        questionId: "question-2",
        isCorrect: true,
        effectiveAt: "2024-05-07T10:00:00Z",
        createdAt: "2024-05-07T10:00:00Z"
      },
      {
        userId: "user-flip",
        questionId: "question-2",
        isCorrect: false,
        effectiveAt: "2024-05-07T11:30:00Z",
        createdAt: "2024-05-07T11:30:00Z"
      }
    ];

    const leaderboard = computeWeeklyLeaderboard({ now, responseEvents });

    expect(leaderboard.get("user-flip")).toBeUndefined();
  });
});
