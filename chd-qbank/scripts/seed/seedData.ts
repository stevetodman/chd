export type MediaBundleSeed = {
  id: string;
  murmur_url?: string | null;
  cxr_url?: string | null;
  ekg_url?: string | null;
  diagram_url?: string | null;
  alt_text?: string | null;
};

export type QuestionChoiceSeed = {
  label: "A" | "B" | "C" | "D" | "E";
  text_md: string;
  is_correct: boolean;
};

export type ContextLabsPanelSeed = {
  id: string;
  kind: "labs";
  title?: string | null;
  labs: { label: string; value: string; unit?: string | null }[];
};

export type ContextFormulaPanelSeed = {
  id: string;
  kind: "formula";
  title?: string | null;
  formulas?: { name: string; expression: string }[] | null;
  body_md?: string | null;
};

export type ContextPanelSeed = ContextLabsPanelSeed | ContextFormulaPanelSeed;

export type QuestionSeed = {
  slug: string;
  stem_md: string;
  lead_in?: string | null;
  explanation_brief_md: string;
  explanation_deep_md: string;
  topic?: string | null;
  subtopic?: string | null;
  lesion?: string | null;
  difficulty_target?: number | null;
  bloom?: string | null;
  lecture_link?: string | null;
  mediaBundleId?: string | null;
  status: "draft" | "published" | "archived";
  context_panels?: ContextPanelSeed[] | null;
  choices: QuestionChoiceSeed[];
};

export type CxrLabelSeed = {
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
  is_correct: boolean;
};

export type CxrItemSeed = {
  id: string;
  slug: string;
  image_url: string;
  caption_md?: string | null;
  lesion?: string | null;
  topic?: string | null;
  status: "draft" | "published" | "archived";
  labels: CxrLabelSeed[];
};

export const MEDIA_BUNDLES: MediaBundleSeed[] = [
  {
    id: "b9f56d5f-8d1a-4c64-8cb1-2d241c0861d1",
    cxr_url: "https://cdn.example.com/chd/cxr-dtga-demo.jpg",
    alt_text: "Chest radiograph with narrow mediastinum in transposition",
    diagram_url: null,
    ekg_url: null,
    murmur_url: null
  },
  {
    id: "4adcf3de-06c0-4c58-9cd2-68d81a1d1b0a",
    diagram_url: "https://cdn.example.com/chd/diagram-coarctation.png",
    murmur_url: "https://cdn.example.com/chd/audio-coarctation.mp3",
    cxr_url: null,
    ekg_url: null,
    alt_text: "Diagram showing narrowing of the aortic isthmus"
  }
];

export const QUESTIONS: QuestionSeed[] = [
  {
    slug: "ductal_shock_prostaglandin",
    stem_md:
      "4-day-old neonate with poor perfusion and metabolic acidosis after ductus closure. CXR shows narrow mediastinum.",
    lead_in: "Which medication should be started immediately?",
    explanation_brief_md: "Ductal-dependent systemic circulation requires prostaglandin to reopen the ductus.",
    explanation_deep_md:
      "Transposition presents with profound shock once the ductus closes. Continuous prostaglandin E1 infusion re-establishes mixing while preparing for balloon atrial septostomy and arterial switch.",
    topic: "cyanotic",
    subtopic: "management",
    lesion: "d-TGA",
    difficulty_target: 2,
    bloom: "application",
    lecture_link: "Module 5",
    mediaBundleId: MEDIA_BUNDLES[0].id,
    status: "published",
    context_panels: [
      {
        id: "ductal-gas",
        kind: "labs",
        title: "Arterial blood gas",
        labs: [
          { label: "pH", value: "7.21" },
          { label: "PaO2", value: "32", unit: "mm Hg" },
          { label: "Lactate", value: "5.1", unit: "mmol/L" }
        ]
      }
    ],
    choices: [
      { label: "A", text_md: "Bolus fluids and observe", is_correct: false },
      { label: "B", text_md: "Start **prostaglandin E1** infusion", is_correct: true },
      { label: "C", text_md: "Administer IV indomethacin", is_correct: false },
      { label: "D", text_md: "Begin propranolol", is_correct: false }
    ]
  },
  {
    slug: "coarctation_arm_leg_gradient",
    stem_md:
      "16-year-old with headaches, differential clubbing, and radio-femoral delay. Murmur heard best at the left infrascapular area.",
    lead_in: "What additional finding best supports the suspected diagnosis?",
    explanation_brief_md:
      "Coarctation produces systolic hypertension with delayed femoral pulses and rib notching from collateral flow.",
    explanation_deep_md:
      "Narrowing distal to the left subclavian elevates upper-extremity pressures. Chronic collateralization erodes the inferior ribs, visible on imaging.",
    topic: "acyanotic",
    subtopic: "diagnosis",
    lesion: "coarctation of the aorta",
    difficulty_target: 3,
    bloom: "analysis",
    lecture_link: "Module 7",
    mediaBundleId: MEDIA_BUNDLES[1].id,
    status: "published",
    context_panels: [
      {
        id: "gradient-formula",
        kind: "formula",
        title: "Pressure gradient",
        formulas: [{ name: "ΔP", expression: "4 × V^2" }],
        body_md: "Use Doppler velocity across the narrowed segment to estimate the gradient."
      }
    ],
    choices: [
      { label: "A", text_md: "Diminished carotid pulse", is_correct: false },
      { label: "B", text_md: "Systolic murmur louder with inspiration", is_correct: false },
      { label: "C", text_md: "Lower-extremity hypertension", is_correct: false },
      { label: "D", text_md: "Notching of the inferior ribs on imaging", is_correct: true }
    ]
  },
  {
    slug: "tetralogy_squat_relief",
    stem_md:
      "Toddler with Tetralogy of Fallot has episodic cyanosis during play that improves when she squats.",
    lead_in: "What is the physiologic benefit of squatting during a tet spell?",
    explanation_brief_md:
      "Squatting raises systemic vascular resistance, reducing the right-to-left shunt across the VSD.",
    explanation_deep_md:
      "By increasing afterload, squatting drives more flow across the pulmonary circuit, improving arterial oxygen saturation.",
    topic: "cyanotic",
    subtopic: "physiology",
    lesion: "Tetralogy of Fallot",
    difficulty_target: 2,
    bloom: "understanding",
    lecture_link: "Module 4",
    mediaBundleId: MEDIA_BUNDLES[0].id,
    status: "published",
    choices: [
      { label: "A", text_md: "Decreases venous return", is_correct: false },
      { label: "B", text_md: "Lowers systemic vascular resistance", is_correct: false },
      { label: "C", text_md: "Increases systemic vascular resistance", is_correct: true },
      { label: "D", text_md: "Induces metabolic alkalosis", is_correct: false }
    ]
  },
  {
    slug: "vsd_holosystolic_location",
    stem_md: "Infant with failure to thrive has a harsh holosystolic murmur at the lower left sternal border.",
    lead_in: "Which lesion best explains these findings?",
    explanation_brief_md: "A ventricular septal defect produces a holosystolic murmur at the left lower sternal border.",
    explanation_deep_md:
      "Moderate VSDs cause excessive pulmonary blood flow and failure to thrive. The murmur results from the left-to-right shunt through the septal defect.",
    topic: "acyanotic",
    subtopic: "murmurs",
    lesion: "Ventricular septal defect",
    difficulty_target: 1,
    bloom: "remembering",
    lecture_link: "Module 2",
    mediaBundleId: null,
    status: "published",
    choices: [
      { label: "A", text_md: "Atrial septal defect", is_correct: false },
      { label: "B", text_md: "Patent ductus arteriosus", is_correct: false },
      { label: "C", text_md: "Ventricular septal defect", is_correct: true },
      { label: "D", text_md: "Pulmonary valve stenosis", is_correct: false }
    ]
  },
  {
    slug: "truncus_sat_curve",
    stem_md:
      "Neonate with truncus arteriosus has single great vessel with diastolic runoff and bounding pulses.",
    lead_in: "Which pulse oximetry pattern is expected?",
    explanation_brief_md:
      "Systemic and pulmonary circulations mix, producing similar saturations in all extremities.",
    explanation_deep_md:
      "With truncus arteriosus, both circulations share the same arterial outflow, so pre- and post-ductal saturations are equal but modestly reduced.",
    topic: "cyanotic",
    subtopic: "physiology",
    lesion: "Truncus arteriosus",
    difficulty_target: 3,
    bloom: "application",
    lecture_link: "Module 6",
    mediaBundleId: null,
    status: "published",
    choices: [
      { label: "A", text_md: "Right arm 88%, leg 74%", is_correct: false },
      { label: "B", text_md: "Right arm 88%, leg 88%", is_correct: true },
      { label: "C", text_md: "Right arm 96%, leg 78%", is_correct: false },
      { label: "D", text_md: "Right arm 78%, leg 96%", is_correct: false }
    ]
  },
  {
    slug: "ebstein_ecg_p_wave",
    stem_md:
      "Teen with exertional dyspnea and tricuspid regurgitation murmur. ECG shows massively tall P waves in lead II.",
    lead_in: "Which diagnosis best fits this ECG pattern?",
    explanation_brief_md:
      "Ebstein anomaly causes giant right atrial enlargement with tall peaked P waves.",
    explanation_deep_md:
      "Malformation of the tricuspid valve causes atrialization of the RV and marked RA dilation, reflected by tall P waves and accessory pathways.",
    topic: "cyanotic",
    subtopic: "diagnosis",
    lesion: "Ebstein anomaly",
    difficulty_target: 2,
    bloom: "analysis",
    lecture_link: "Module 8",
    mediaBundleId: MEDIA_BUNDLES[1].id,
    status: "published",
    choices: [
      { label: "A", text_md: "Endocardial cushion defect", is_correct: false },
      { label: "B", text_md: "Ebstein anomaly", is_correct: true },
      { label: "C", text_md: "Pulmonary valve atresia", is_correct: false },
      { label: "D", text_md: "Total anomalous pulmonary venous return", is_correct: false }
    ]
  },
  {
    slug: "pda_murmur_timing",
    stem_md:
      "Preterm infant with wide pulse pressure and continuous machine-like murmur best heard below the left clavicle.",
    lead_in: "What is the timing of this murmur?",
    explanation_brief_md:
      "Patent ductus arteriosus produces a continuous murmur spanning systole and diastole.",
    explanation_deep_md:
      "The murmur results from persistent flow from the aorta to the pulmonary artery, creating a washing-machine quality throughout the cardiac cycle.",
    topic: "acyanotic",
    subtopic: "murmurs",
    lesion: "Patent ductus arteriosus",
    difficulty_target: 1,
    bloom: "remembering",
    lecture_link: "Module 1",
    mediaBundleId: MEDIA_BUNDLES[1].id,
    status: "published",
    choices: [
      { label: "A", text_md: "Early systolic only", is_correct: false },
      { label: "B", text_md: "Mid-diastolic only", is_correct: false },
      { label: "C", text_md: "Holosystolic", is_correct: false },
      { label: "D", text_md: "Continuous throughout systole and diastole", is_correct: true }
    ]
  },
  {
    slug: "svt_vagal_adenosine",
    stem_md:
      "9-year-old with palpitations and narrow-complex tachycardia at 220 bpm. Vagal maneuvers transiently slow the rate.",
    lead_in: "What is the next best step in management?",
    explanation_brief_md: "Stable AV node–dependent SVT responds to rapid IV adenosine.",
    explanation_deep_md:
      "Adenosine transiently blocks AV nodal conduction, terminating re-entrant tachycardia in hemodynamically stable patients.",
    topic: "arrhythmia",
    subtopic: "management",
    lesion: "AVNRT",
    difficulty_target: 2,
    bloom: "application",
    lecture_link: "Module 3",
    mediaBundleId: null,
    status: "published",
    choices: [
      { label: "A", text_md: "Synchronized cardioversion", is_correct: false },
      { label: "B", text_md: "Initiate IV adenosine", is_correct: true },
      { label: "C", text_md: "Start metoprolol drip", is_correct: false },
      { label: "D", text_md: "Observe without therapy", is_correct: false }
    ]
  },
  {
    slug: "hlhs_preop_management",
    stem_md:
      "Newborn with hypoplastic left heart syndrome is awaiting Norwood procedure. Oxygen saturation is 78% on room air.",
    lead_in: "What is the primary hemodynamic goal before surgery?",
    explanation_brief_md:
      "Balance systemic and pulmonary blood flow to maintain adequate systemic perfusion.",
    explanation_deep_md:
      "Allowing mild desaturation keeps pulmonary vascular resistance higher, favoring systemic output through the ductus until surgical palliation.",
    topic: "cyanotic",
    subtopic: "management",
    lesion: "HLHS",
    difficulty_target: 4,
    bloom: "analysis",
    lecture_link: "Module 9",
    mediaBundleId: MEDIA_BUNDLES[0].id,
    status: "published",
    context_panels: [
      {
        id: "qp-qs",
        kind: "formula",
        title: "Qp:Qs",
        formulas: [{ name: "Qp:Qs", expression: "(SaO2 - SvO2) / (SpvO2 - SpaO2)" }],
        body_md: "Target Qp:Qs close to 1:1 prior to stage 1 palliation."
      }
    ],
    choices: [
      { label: "A", text_md: "Increase FiO2 to 100%", is_correct: false },
      { label: "B", text_md: "Maintain Qp:Qs balance with permissive hypoxemia", is_correct: true },
      { label: "C", text_md: "Diurese to reduce preload", is_correct: false },
      { label: "D", text_md: "Aggressively lower pulmonary vascular resistance", is_correct: false }
    ]
  },
  {
    slug: "pulmonary_atresia_sat_target",
    stem_md:
      "Infant with pulmonary atresia on prostaglandin has saturations around 82% with ductal-dependent pulmonary blood flow.",
    lead_in: "Which oxygen saturation target is appropriate before shunt placement?",
    explanation_brief_md:
      "Maintain saturations in the low-to-mid 80s to ensure adequate systemic output while awaiting surgery.",
    explanation_deep_md:
      "Over-oxygenation drops pulmonary vascular resistance, stealing flow from systemic circulation. Accepting saturations near 80% protects systemic perfusion.",
    topic: "cyanotic",
    subtopic: "management",
    lesion: "Pulmonary atresia",
    difficulty_target: 3,
    bloom: "application",
    lecture_link: "Module 5",
    mediaBundleId: MEDIA_BUNDLES[0].id,
    status: "published",
    choices: [
      { label: "A", text_md: "≥95%", is_correct: false },
      { label: "B", text_md: "90-92%", is_correct: false },
      { label: "C", text_md: "80-85%", is_correct: true },
      { label: "D", text_md: "<70%", is_correct: false }
    ]
  }
];

export const CXR_ITEMS: CxrItemSeed[] = [
  {
    id: "33333333-3333-3333-3333-333333333333",
    slug: "demo_cxr_cardiomegaly",
    image_url: "https://cdn.example.com/chd/cxr-dtga-demo.jpg",
    caption_md: "PA film demonstrating cardiomegaly with pulmonary plethora.",
    lesion: "d-TGA",
    topic: "cyanotic",
    status: "published",
    labels: [
      { label: "Aortic knob", x: 0.62, y: 0.28, w: 0.12, h: 0.12, is_correct: false },
      { label: "Main pulmonary artery", x: 0.47, y: 0.42, w: 0.18, h: 0.16, is_correct: true },
      { label: "Right hemidiaphragm", x: 0.53, y: 0.75, w: 0.3, h: 0.15, is_correct: false },
      { label: "Trachea", x: 0.5, y: 0.14, w: 0.08, h: 0.18, is_correct: false }
    ]
  }
];
