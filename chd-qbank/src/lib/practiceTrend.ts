import type { PracticeTrendDatum } from '../types/practice';

const toUtcWeekStart = (value: Date): Date => {
  const base = new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
  const day = base.getUTCDay();
  const diff = (day + 6) % 7;
  base.setUTCDate(base.getUTCDate() - diff);
  base.setUTCHours(0, 0, 0, 0);
  return base;
};

export function computeWeeklyStreak(trendData: PracticeTrendDatum[]): number {
  let streak = 0;
  for (let index = trendData.length - 1; index >= 0; index -= 1) {
    if ((trendData[index]?.attempts ?? 0) > 0) {
      streak += 1;
    } else {
      break;
    }
  }
  return streak;
}

export async function fetchPracticeTrendData(
  userId: string,
  weeksToShow = 8,
): Promise<PracticeTrendDatum[]> {
  const { supabase } = await import('./supabaseClient');

  const now = new Date();
  const latestWeek = toUtcWeekStart(now);
  const earliestWeek = new Date(latestWeek);
  earliestWeek.setUTCDate(earliestWeek.getUTCDate() - (weeksToShow - 1) * 7);

  const { data, error } = await supabase
    .from('responses')
    .select('created_at, is_correct')
    .eq('user_id', userId)
    .gte('created_at', earliestWeek.toISOString())
    .order('created_at', { ascending: true });

  if (error) throw error;

  const aggregates = new Map<string, { attempts: number; correct: number }>();

  for (const row of data ?? []) {
    if (!row?.created_at) continue;
    const createdAt = new Date(row.created_at);
    const weekStart = toUtcWeekStart(createdAt);
    const key = weekStart.toISOString().slice(0, 10);
    const entry = aggregates.get(key) ?? { attempts: 0, correct: 0 };
    entry.attempts += 1;
    if (row.is_correct) entry.correct += 1;
    aggregates.set(key, entry);
  }

  const formatter = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' });
  const points: PracticeTrendDatum[] = [];

  for (let i = 0; i < weeksToShow; i += 1) {
    const cursor = new Date(earliestWeek);
    cursor.setUTCDate(cursor.getUTCDate() + i * 7);
    const key = cursor.toISOString().slice(0, 10);
    const summary = aggregates.get(key) ?? { attempts: 0, correct: 0 };
    const accuracy = summary.attempts > 0 ? (summary.correct / summary.attempts) * 100 : null;
    points.push({
      label: formatter.format(cursor),
      attempts: summary.attempts,
      accuracy,
    });
  }

  return points;
}
