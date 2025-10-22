import type { QuestionQueryRow } from "../../lib/practice";

export const syntheticPracticeQuestions: QuestionQueryRow[] = [
  {
    id: "practice-q1",
    slug: "practice-question-1",
    stem_md:
      "A 12-year-old with repaired tetralogy of Fallot presents with fatigue. Echo shows pulmonary regurgitation with RV dilation.",
    lead_in: "What is the next best step in management?",
    explanation_brief_md: "Severe pulmonary regurgitation after TOF repair is treated with pulmonary valve replacement.",
    explanation_deep_md:
      "Chronic pulmonary insufficiency causes progressive RV dilation and arrhythmia risk; timely valve replacement improves outcomes.",
    topic: "tetralogy of fallot",
    subtopic: "postoperative care",
    lesion: "tetralogy of fallot",
    media_bundle: {
      id: "bundle-1",
      murmur_url: null,
      cxr_url: "https://example.com/cxr/tof.png",
      ekg_url: "https://example.com/ekg/rbbb.png",
      diagram_url: null,
      alt_text: "Postoperative tetralogy repair imaging"
    },
    context_panels: [
      {
        id: "labs-1",
        kind: "labs",
        title: "Key labs",
        labs: [
          { label: "BNP", value: "600", unit: "pg/mL" },
          { label: "Hemoglobin", value: "13.1", unit: "g/dL" }
        ]
      }
    ],
    choices: [
      {
        id: "choice-a",
        label: "A",
        text_md: "Start beta-blocker therapy",
        is_correct: false
      },
      {
        id: "choice-b",
        label: "B",
        text_md: "Schedule pulmonary valve replacement",
        is_correct: true
      },
      {
        id: "choice-c",
        label: "C",
        text_md: "Refer for heart transplant evaluation",
        is_correct: false
      }
    ]
  },
  {
    id: "practice-q2",
    slug: "practice-question-2",
    stem_md:
      "Term neonate with d-transposition of the great arteries presents with severe cyanosis despite oxygen. Echo confirms intact ventricular septum.",
    lead_in: "Which intervention improves systemic oxygenation immediately?",
    explanation_brief_md:
      "Balloon atrial septostomy enlarges the atrial communication to improve mixing in d-TGA.",
    explanation_deep_md:
      "When the atrial septum is restrictive, balloon atrial septostomy increases oxygenated blood delivery until arterial switch surgery.",
    topic: "transposition of the great arteries",
    subtopic: "neonatal management",
    lesion: "d-transposition of the great arteries",
    media_bundle: null,
    context_panels: [
      {
        id: "formula-1",
        kind: "formula",
        title: "Oxygen content",
        formulas: [
          { name: "CaO2", expression: "(1.34 x Hb x SaO2) + (0.003 x PaO2)" }
        ],
        body_md: "Mixing at the atrial level is critical while systemic and pulmonary circulations run in parallel."
      }
    ],
    choices: [
      {
        id: "choice-d",
        label: "A",
        text_md: "Initiate inhaled nitric oxide",
        is_correct: false
      },
      {
        id: "choice-e",
        label: "B",
        text_md: "Perform balloon atrial septostomy",
        is_correct: true
      },
      {
        id: "choice-f",
        label: "C",
        text_md: "Start prostaglandin E1 infusion",
        is_correct: false
      }
    ]
  },
  {
    id: "practice-q3",
    slug: "practice-question-3",
    stem_md:
      "Five-year-old with complete atrioventricular septal defect develops progressive failure to thrive and pulmonary overcirculation.",
    lead_in: "What complication is most concerning if surgical repair is delayed?",
    explanation_brief_md: "Irreversible pulmonary vascular remodeling leads to Eisenmenger physiology if repair is delayed.",
    explanation_deep_md:
      "Left-to-right shunting exposes pulmonary vasculature to systemic pressures, causing intimal proliferation and eventual shunt reversal.",
    topic: "atrioventricular septal defect",
    subtopic: "hemodynamics",
    lesion: "complete AVSD",
    media_bundle: null,
    context_panels: null,
    choices: [
      {
        id: "choice-g",
        label: "A",
        text_md: "Left ventricular outflow obstruction",
        is_correct: false
      },
      {
        id: "choice-h",
        label: "B",
        text_md: "Eisenmenger syndrome",
        is_correct: true
      },
      {
        id: "choice-i",
        label: "C",
        text_md: "Coarctation of the aorta",
        is_correct: false
      }
    ]
  }
];

export const syntheticMurmurItems = [
  {
    id: "murmur-item-1",
    prompt_md: "Listen to the holosystolic murmur heard best at the lower left sternal border.",
    rationale_md: "The murmur radiates to the right lower sternal border and increases with inspiration, consistent with tricuspid regurgitation.",
    media_url: "https://example.com/media/murmur-tricuspid.mp3",
    murmur_options: [
      { id: "murmur-opt-1", label: "A", text_md: "Mitral regurgitation", is_correct: false },
      { id: "murmur-opt-2", label: "B", text_md: "Tricuspid regurgitation", is_correct: true },
      { id: "murmur-opt-3", label: "C", text_md: "Aortic stenosis", is_correct: false }
    ]
  }
] as const;

export const syntheticCxrItems = [
  {
    id: "cxr-item-1",
    image_url: "https://example.com/media/cxr-total-anomalous.jpg",
    caption_md: "Supra-cardiac TAPVR with pulmonary edema.",
    cxr_labels: [
      {
        id: "cxr-label-1",
        label: "Snowman sign",
        is_correct: true,
        x: 0.32,
        y: 0.18,
        w: 0.42,
        h: 0.35
      },
      {
        id: "cxr-label-2",
        label: "Boot-shaped heart",
        is_correct: false,
        x: null,
        y: null,
        w: null,
        h: null
      }
    ]
  }
] as const;
