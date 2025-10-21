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

export const SEED_QUESTIONS: Question[] = [
  {
    id: "seed-q-1",
    slug: "tga-prostaglandin",
    stem_md: "Term neonate with profound cyanosis and **egg-on-a-string** CXR.",
    lead_in: "Best initial management?",
    explanation_brief_md: "d-TGA requires ductal mixing; start prostaglandin E1.",
    explanation_deep_md: "Parallel circuits demand maintaining PDA; consider Rashkind if restrictive PFO.",
    topic: "cyanotic",
    subtopic: "management",
    lesion: "TGA",
    media_bundle: {
      id: "seed-media-1",
      cxr_url: "cxr/egg_tga.webp",
      alt_text: "Egg-on-a-string CXR"
    },
    choices: [
      { id: "seed-c-1a", label: "A", text_md: "Indomethacin", is_correct: false },
      { id: "seed-c-1b", label: "B", text_md: "**Prostaglandin E1**", is_correct: true },
      { id: "seed-c-1c", label: "C", text_md: "Beta-blocker", is_correct: false },
      { id: "seed-c-1d", label: "D", text_md: "ACE inhibitor", is_correct: false },
      { id: "seed-c-1e", label: "E", text_md: "Observe", is_correct: false }
    ]
  },
  {
    id: "seed-q-2",
    slug: "asd-fixed-split",
    stem_md: "Teenager with wide **fixed** split S2 and systolic ejection murmur at ULSB.",
    lead_in: "Most likely diagnosis?",
    explanation_brief_md: "Fixed split S2 indicates ASD with increased RA/RV flow.",
    explanation_deep_md: "Embryology: septum secundum deficiency; risk of paradoxical emboli.",
    topic: "acyanotic",
    subtopic: "imaging",
    lesion: "ASD",
    media_bundle: {
      id: "seed-media-2",
      diagram_url: "diagrams/asd_flow.svg",
      alt_text: "Blood flow diagram"
    },
    choices: [
      { id: "seed-c-2a", label: "A", text_md: "VSD", is_correct: false },
      { id: "seed-c-2b", label: "B", text_md: "**ASD (secundum)**", is_correct: true },
      { id: "seed-c-2c", label: "C", text_md: "PDA", is_correct: false },
      { id: "seed-c-2d", label: "D", text_md: "TOF", is_correct: false },
      { id: "seed-c-2e", label: "E", text_md: "Truncus", is_correct: false }
    ]
  },
  {
    id: "seed-q-3",
    slug: "coarctation-rib-notching",
    stem_md: "Adolescent with hypertension in arms, diminished femoral pulses, and rib notching on CXR.",
    lead_in: "Most likely associated finding?",
    explanation_brief_md: "Coarctation produces collateral intercostal flow causing rib notching.",
    explanation_deep_md: "Look for bicuspid aortic valve and Turner syndrome associations.",
    topic: "obstructive",
    subtopic: "imaging",
    lesion: "CoA",
    media_bundle: {
      id: "seed-media-3",
      cxr_url: "cxr/rib_notching.webp",
      alt_text: "Rib notching"
    },
    choices: [
      { id: "seed-c-3a", label: "A", text_md: "Snowman heart", is_correct: false },
      { id: "seed-c-3b", label: "B", text_md: "Differential blood pressure", is_correct: true },
      { id: "seed-c-3c", label: "C", text_md: "Boot-shaped heart", is_correct: false },
      { id: "seed-c-3d", label: "D", text_md: "Ebstein anomaly", is_correct: false },
      { id: "seed-c-3e", label: "E", text_md: "ASD", is_correct: false }
    ]
  }
];

export const MEDIA_STUBS: MediaBundle[] = [
  { id: "seed-media-1", cxr_url: "cxr/egg_tga.webp", alt_text: "Egg-on-a-string CXR" },
  { id: "seed-media-2", murmur_url: "murmurs/tof_harsh_systolic.mp3", alt_text: "Harsh systolic murmur" },
  { id: "seed-media-3", cxr_url: "cxr/rib_notching.webp", alt_text: "Rib notching" },
  { id: "seed-media-4", ekg_url: "ekg/rad_axis.svg", alt_text: "Right axis deviation" }
];
