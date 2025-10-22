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
  media_bundle?: MediaBundle | null;
  choices: Choice[];
};

export type Response = {
  id: string;
  question_id: string;
  choice_id: string;
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

export type HeatRow = {
  lesion: string;
  topic: string;
  attempts: number;
  correct_rate: number;
};

