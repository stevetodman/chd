export const APP_NAME = import.meta.env.VITE_APP_NAME ?? "CHD QBank";

export type UserAlias = {
  user_id: string;
  alias: string;
  locked: boolean;
};

export type MediaBundle = {
  id: string;
  murmur_url?: string | null;
  cxr_url?: string | null;
  ekg_url?: string | null;
  diagram_url?: string | null;
  alt_text?: string | null;
};

export type Choice = {
  id: string;
  label: "A" | "B" | "C" | "D" | "E";
  text_md: string;
  is_correct: boolean;
};

export type LabValue = {
  label: string;
  value: string;
  unit?: string | null;
};

export type FormulaReference = {
  name: string;
  expression: string;
};

export type ContextLabsPanel = {
  id: string;
  kind: "labs";
  title?: string | null;
  labs: LabValue[];
};

export type ContextFormulaPanel = {
  id: string;
  kind: "formula";
  title?: string | null;
  formulas?: FormulaReference[] | null;
  body_md?: string | null;
};

export type ContextPanel = ContextLabsPanel | ContextFormulaPanel;

export type QuestionDifficulty = "easy" | "med" | "hard";

export type Question = {
  id: string;
  slug: string;
  stem_md: string;
  lead_in?: string | null;
  explanation_brief_md: string;
  explanation_deep_md?: string | null;
  topic?: string | null;
  subtopic?: string | null;
  lesion?: string | null;
  difficulty?: QuestionDifficulty | null;
  media_bundle?: MediaBundle | null;
  choices: Choice[];
  context_panels?: ContextPanel[] | null;
};

export type Response = {
  id: string;
  question_id: string;
  choice_id: string | null;
  is_correct: boolean;
  ms_to_answer?: number | null;
  flagged: boolean;
  created_at: string;
};

export type ItemStats = {
  question_id: string;
  n_attempts: number;
  p_value: number | null;
  discrimination_pb: number | null;
  avg_time_ms: number | null;
  last_computed_at: string | null;
};

export type DistractorStats = {
  question_id: string;
  choice_id: string;
  picked_count: number;
  pick_rate: number | null;
};

export type HeatmapAggregateRow = {
  question_id: string;
  lesion: string | null;
  topic: string | null;
  week_start: string;
  attempts: number;
  correct_attempts: number;
  incorrect_attempts: number;
  correct_rate: number;
  avg_time_ms: number | null;
};

export type DashboardMetrics = {
  total_attempts: number;
  correct_attempts: number;
  flagged_count: number;
  weekly_points: number;
  all_time_points: number;
};

