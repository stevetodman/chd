export const mediaBundleSeeds = [
  {
    id: "9433c067-3d45-4774-baee-803d06b3bead",
    cxr_url:
      "https://images.unsplash.com/photo-1584432810401-03f03b06ac51?auto=format&fit=crop&w=900&q=80",
    diagram_url:
      "https://images.unsplash.com/photo-1526256262350-7da7584cf5eb?auto=format&fit=crop&w=900&q=80",
    alt_text:
      "Chest radiograph demonstrating right lower lobe consolidation with an accompanying coronary anatomy diagram."
  },
  {
    id: "6173e64e-6b00-4543-b203-02ffeaa95a03",
    murmur_url: "https://cdn.human.doctor/audio/cardiology/aortic-stenosis-systolic.mp3",
    ekg_url:
      "https://images.unsplash.com/photo-1512790182412-b19e6d62bc39?auto=format&fit=crop&w=900&q=80",
    alt_text:
      "Phonocardiogram of a crescendo-decrescendo systolic murmur with an example ECG showing right axis deviation."
  }
];

export const questionSeeds = [
  {
    id: "333279d9-8da1-4b9c-92e5-3187e705cf45",
    slug: "acs_initial_management",
    stem_md:
      "58-year-old man presents 90 minutes after sudden retrosternal chest pressure radiating to the left arm. ECG shows ST elevations in leads II, III, and aVF. Blood pressure is 146/88 mmHg, oxygen saturation is 95% on room air, and the first troponin I is mildly elevated.",
    lead_in: "Which intervention should be initiated immediately?",
    explanation_brief_md: "Chewed aspirin rapidly inhibits platelet aggregation and reduces mortality in STEMI.",
    explanation_deep_md:
      "Early antiplatelet therapy is guideline-directed for suspected STEMI before reperfusion. Beta-blockers, statins, and anticoagulation follow but do not replace aspirin as the first critical therapy.",
    difficulty_target: 2,
    bloom: "application",
    topic: "Cardiology",
    subtopic: "Acute coronary syndrome",
    lesion: "STEMI",
    lecture_link: "https://learn.chd.edu/lectures/acs-basics",
    media_bundle_id: "9433c067-3d45-4774-baee-803d06b3bead",
    context_panels: [
      {
        id: "labs-acs-troponin",
        kind: "labs",
        title: "Initial labs",
        labs: [
          { label: "Troponin I", value: "0.08", unit: "ng/mL" },
          { label: "CK-MB", value: "21", unit: "U/L" }
        ]
      }
    ],
    status: "published",
    choices: [
      {
        id: "4406b11c-963d-4435-8644-c6a8f429c934",
        label: "A",
        text_md: "Administer sublingual nitroglycerin without cardiac monitoring",
        is_correct: false
      },
      {
        id: "ae815488-9d16-469b-9b70-eb9dc7aeedb6",
        label: "B",
        text_md: "Give **chewed aspirin** before activating the cath lab",
        is_correct: true
      },
      {
        id: "cf7d6c0c-1959-44a7-8f19-133cede0f042",
        label: "C",
        text_md: "Start IV metoprolol to control heart rate",
        is_correct: false
      },
      {
        id: "94a2169d-1ad2-408c-8079-89f62098d22f",
        label: "D",
        text_md: "Administer high-dose atorvastatin before PCI",
        is_correct: false
      },
      {
        id: "aeca9974-c455-4244-864a-d2154535654e",
        label: "E",
        text_md: "Obtain emergent CT angiography of the chest",
        is_correct: false
      }
    ]
  },
  {
    id: "781599f0-8a9f-4134-8a1f-7e0b28a7e3b9",
    slug: "hf_diuretic_titration",
    stem_md:
      "72-year-old woman with ischemic cardiomyopathy (LVEF 25%) presents with progressive lower-extremity edema and orthopnea despite adherence to furosemide 20 mg daily, carvedilol, lisinopril, and spironolactone. Exam shows elevated JVP and bibasilar crackles.",
    lead_in: "What is the best next step to address her congestion?",
    explanation_brief_md:
      "Loop diuretics require dose titration to overcome diuretic resistance; doubling the dose is the recommended starting adjustment.",
    explanation_deep_md:
      "In symptomatic volume overload on low-dose loop therapy, increasing the loop dose achieves a higher threshold of natriuresis. Adding thiazide synergy or vasodilators is reserved for inadequate response after dose titration.",
    difficulty_target: 3,
    bloom: "analysis",
    topic: "Heart failure",
    subtopic: "Pharmacology",
    lesion: "HFrEF",
    lecture_link: "https://learn.chd.edu/lectures/hf-optimization",
    media_bundle_id: null,
    context_panels: null,
    status: "published",
    choices: [
      {
        id: "280b677e-ceb2-422c-979a-2ef959454349",
        label: "A",
        text_md: "Add metolazone before the next diuretic dose",
        is_correct: false
      },
      {
        id: "d851902a-e57b-4b62-9a59-c89936ef63cf",
        label: "B",
        text_md: "Double the furosemide dose to 40 mg daily",
        is_correct: true
      },
      {
        id: "5c6e4fe3-f74d-44a3-a717-396b951803a5",
        label: "C",
        text_md: "Switch to low-dose hydrochlorothiazide",
        is_correct: false
      },
      {
        id: "c7d1b48f-d808-445d-87a1-98bb75a74633",
        label: "D",
        text_md: "Start intravenous nitroglycerin",
        is_correct: false
      }
    ]
  },
  {
    id: "01c7f50f-8660-4dc5-9b46-15a57d30aa4e",
    slug: "rheumatic_major_criteria",
    stem_md:
      "16-year-old girl presents with choreiform movements, emotional lability, and a recent sore throat treated with no antibiotics. Exam reveals a new holosystolic murmur at the apex radiating to the axilla.",
    lead_in: "Which major Jones criterion most specifically supports the diagnosis?",
    explanation_brief_md: "Sydenham chorea is highly specific for acute rheumatic fever.",
    explanation_deep_md:
      "While migratory arthritis is common, Sydenham chorea indicates basal ganglia involvement from antistreptococcal antibodies, essentially pathognomonic for acute rheumatic fever.",
    difficulty_target: 2,
    bloom: "knowledge",
    topic: "Valvular disease",
    subtopic: "Rheumatic fever",
    lesion: "Mitral regurgitation",
    lecture_link: "https://learn.chd.edu/lectures/rheumatic-fever",
    media_bundle_id: null,
    context_panels: null,
    status: "published",
    choices: [
      {
        id: "e1a71a79-a377-4dea-a212-f830efbd73c2",
        label: "A",
        text_md: "Erythema marginatum",
        is_correct: false
      },
      {
        id: "f9bce9d7-c1c3-4a7f-9056-b10f0d938a99",
        label: "B",
        text_md: "Migratory polyarthritis",
        is_correct: false
      },
      {
        id: "4559be66-9c4d-48a7-be07-c3b1b0310163",
        label: "C",
        text_md: "Subcutaneous nodules",
        is_correct: false
      },
      {
        id: "4d955a3c-6ffc-4618-ad99-4ee7fbb39d1e",
        label: "D",
        text_md: "Sydenham chorea",
        is_correct: true
      },
      {
        id: "de7b8913-adce-40c7-a8d8-017f652ba34a",
        label: "E",
        text_md: "Prolonged PR interval",
        is_correct: false
      }
    ]
  },
  {
    id: "f97558eb-b7f3-4792-8ec5-83b13cc10320",
    slug: "afib_rate_control_choice",
    stem_md:
      "68-year-old man with hypertension and type 2 diabetes develops palpitations. ECG shows atrial fibrillation with a ventricular response of 130 bpm. He is hemodynamically stable and denies chest pain or heart failure symptoms.",
    lead_in: "What is the best initial management?",
    explanation_brief_md:
      "Rate control with a beta blocker improves symptoms and prevents tachycardia-mediated cardiomyopathy in stable atrial fibrillation.",
    explanation_deep_md:
      "In the absence of hypotension or heart failure exacerbation, beta blockers are first-line for ventricular rate control. Rhythm control strategies or cardioversion are reserved for symptomatic or unstable patients.",
    difficulty_target: 2,
    bloom: "application",
    topic: "Arrhythmias",
    subtopic: "Atrial fibrillation",
    lesion: "AF with RVR",
    lecture_link: "https://learn.chd.edu/lectures/afib-management",
    media_bundle_id: null,
    context_panels: [
      {
        id: "formula-map",
        kind: "formula",
        title: "Mean arterial pressure",
        formulas: [{ name: "MAP", expression: "(2*DBP + SBP) / 3" }],
        body_md: "Helps determine hemodynamic stability when evaluating rate control options."
      }
    ],
    status: "published",
    choices: [
      {
        id: "fa89b6be-e33a-4395-82cd-3a599b849d3d",
        label: "A",
        text_md: "Immediate electrical cardioversion",
        is_correct: false
      },
      {
        id: "66b900b3-1860-476c-9783-5c6277b28cbc",
        label: "B",
        text_md: "Start IV amiodarone",
        is_correct: false
      },
      {
        id: "6a411346-25c7-4e6d-a4cf-d20945e12ce2",
        label: "C",
        text_md: "Initiate oral metoprolol",
        is_correct: true
      },
      {
        id: "711c09f0-f365-45ef-b83c-2424ca517d55",
        label: "D",
        text_md: "Begin digoxin therapy",
        is_correct: false
      }
    ]
  },
  {
    id: "8f389ec1-199f-4c10-a203-ea4275fd8442",
    slug: "pericarditis_ecg_pattern",
    stem_md:
      "26-year-old medical student presents with pleuritic chest pain relieved by sitting forward following a viral prodrome. Exam reveals a pericardial friction rub.",
    lead_in: "What ECG finding is most consistent with the suspected diagnosis?",
    explanation_brief_md:
      "Diffuse ST-segment elevation with PR depression reflects pericardial inflammation affecting many leads.",
    explanation_deep_md:
      "Acute fibrinous pericarditis produces diffuse concave ST elevations and PR depressions except in aVR/V1, distinguishing it from localized ischemia.",
    difficulty_target: 1,
    bloom: "knowledge",
    topic: "Pericardial disease",
    subtopic: "Acute pericarditis",
    lesion: "Viral pericarditis",
    lecture_link: "https://learn.chd.edu/lectures/pericarditis",
    media_bundle_id: "9433c067-3d45-4774-baee-803d06b3bead",
    context_panels: [
      {
        id: "labs-pericarditis",
        kind: "labs",
        title: "Inflammatory markers",
        labs: [
          { label: "ESR", value: "44", unit: "mm/h" },
          { label: "CRP", value: "8.1", unit: "mg/dL" }
        ]
      }
    ],
    status: "published",
    choices: [
      {
        id: "b1602d41-b7aa-4114-8d48-23106fe65a98",
        label: "A",
        text_md: "Widespread concave ST elevation with PR depression",
        is_correct: true
      },
      {
        id: "a7c19f39-5ffe-4bfb-9405-ebe8f697f5ec",
        label: "B",
        text_md: "ST elevation isolated to V2-V4",
        is_correct: false
      },
      {
        id: "42d5a64e-ac96-45d6-9e3f-7a537e6707bf",
        label: "C",
        text_md: "Diffuse ST depression with PR elevation",
        is_correct: false
      },
      {
        id: "702a5a6d-b963-44c9-a774-d8f445a42984",
        label: "D",
        text_md: "Sinus tachycardia with low-voltage QRS complexes only",
        is_correct: false
      },
      {
        id: "6378ba8b-6780-4c2c-8ff1-8bbc4fb62fcf",
        label: "E",
        text_md: "Electrical alternans",
        is_correct: false
      }
    ]
  },
  {
    id: "612dee82-51a7-4399-9f7d-5069a8c92988",
    slug: "tof_hypercyanotic_spell",
    stem_md:
      "3-year-old boy with unrepaired tetralogy of Fallot suddenly becomes profoundly cyanotic while crying. He is irritable and tachypneic with a harsh systolic murmur.",
    lead_in: "What is the most appropriate immediate intervention?",
    explanation_brief_md:
      "Knee-chest positioning with beta blockade increases systemic vascular resistance and reduces right-to-left shunting.",
    explanation_deep_md:
      "Hypercyanotic spells result from infundibular spasm causing increased right-to-left flow. Squatting or knee-chest positioning and beta blockers (e.g., propranolol) relieve dynamic obstruction while preparing for definitive repair.",
    difficulty_target: 3,
    bloom: "application",
    topic: "Congenital heart disease",
    subtopic: "Tetralogy of Fallot",
    lesion: "TOF",
    lecture_link: "https://learn.chd.edu/lectures/tof-management",
    media_bundle_id: "6173e64e-6b00-4543-b203-02ffeaa95a03",
    context_panels: null,
    status: "published",
    choices: [
      {
        id: "b9be8108-d476-468a-85f2-729521a17fae",
        label: "A",
        text_md: "Administer IV prostaglandin E1",
        is_correct: false
      },
      {
        id: "266f5a38-ad5a-4a03-90c2-69badfa0e0f4",
        label: "B",
        text_md: "Place the child in a knee-chest position and give propranolol",
        is_correct: true
      },
      {
        id: "4671bb9c-ce22-418f-844c-10a3e6e7d58f",
        label: "C",
        text_md: "Start high-flow oxygen and furosemide",
        is_correct: false
      },
      {
        id: "cb53cdc8-e86f-4606-9339-8981c8b56b0f",
        label: "D",
        text_md: "Intubate and hyperventilate",
        is_correct: false
      }
    ]
  },
  {
    id: "9ecd8216-3ec3-4a35-beaf-77f57d6e12ae",
    slug: "htn_diabetes_med",
    stem_md:
      "52-year-old man with long-standing type 2 diabetes has blood pressure 152/92 mmHg on repeat measurement. Urine albumin-to-creatinine ratio is 80 mg/g. Creatinine is normal.",
    lead_in: "Which antihypertensive agent is preferred?",
    explanation_brief_md: "ACE inhibitors slow diabetic nephropathy progression and treat hypertension.",
    explanation_deep_md:
      "Patients with diabetes and albuminuria benefit from ACE inhibitors for renal protection independent of blood pressure control. ARBs are alternatives if ACE inhibitors are not tolerated.",
    difficulty_target: 1,
    bloom: "application",
    topic: "Hypertension",
    subtopic: "Comorbid diabetes",
    lesion: "Diabetic nephropathy",
    lecture_link: "https://learn.chd.edu/lectures/htn-diabetes",
    media_bundle_id: null,
    context_panels: null,
    status: "published",
    choices: [
      {
        id: "e22298e3-ac90-4c30-9165-ba9e49a16f09",
        label: "A",
        text_md: "Hydrochlorothiazide",
        is_correct: false
      },
      {
        id: "20266651-ce0d-44b4-a5d0-0666d5bb543b",
        label: "B",
        text_md: "**Lisinopril**",
        is_correct: true
      },
      {
        id: "01ab5919-32ec-443c-8142-6b86048ad3fd",
        label: "C",
        text_md: "Amlodipine",
        is_correct: false
      },
      {
        id: "98c17c39-1ea9-492a-b8ad-bf728a7500e0",
        label: "D",
        text_md: "Metoprolol",
        is_correct: false
      }
    ]
  },
  {
    id: "9c7448ec-9721-41b2-a25b-4bc9a0d8a16c",
    slug: "coarctation_arm_leg_bp",
    stem_md:
      "14-year-old boy is evaluated for headache and epistaxis. Upper extremity blood pressure is 160/95 mmHg, while lower extremity pressure is 110/70 mmHg. Femoral pulses are delayed compared with radial pulses.",
    lead_in: "Which additional finding most strongly supports the diagnosis?",
    explanation_brief_md: "Rib notching on chest radiograph reflects collateral circulation around aortic coarctation.",
    explanation_deep_md:
      "Chronic narrowing distal to the left subclavian artery causes enlarged intercostal arteries that erode rib undersurfaces, producing characteristic notching on imaging.",
    difficulty_target: 2,
    bloom: "analysis",
    topic: "Congenital heart disease",
    subtopic: "Coarctation of the aorta",
    lesion: "Coarctation",
    lecture_link: "https://learn.chd.edu/lectures/coarctation",
    media_bundle_id: null,
    context_panels: null,
    status: "published",
    choices: [
      {
        id: "90d3a040-7ca1-40e7-b5fa-2c9823e18c5e",
        label: "A",
        text_md: "Prominent a waves on jugular venous pulse",
        is_correct: false
      },
      {
        id: "7a32cce4-bf38-4b14-9984-583b908b8e1d",
        label: "B",
        text_md: "Mid-systolic click with late systolic murmur",
        is_correct: false
      },
      {
        id: "fecd1289-e261-45dc-a292-dbc2c0b39e8d",
        label: "C",
        text_md: "Differential cyanosis of lower extremities",
        is_correct: false
      },
      {
        id: "8879601c-3130-4442-beb9-897bf3d1ace3",
        label: "D",
        text_md: "Notching of the inferior ribs on CXR",
        is_correct: true
      }
    ]
  },
  {
    id: "e68d3298-e0b5-49c9-9fd4-9ab136213b98",
    slug: "tamponade_ultrasound_sign",
    stem_md:
      "45-year-old woman presents after a motor vehicle collision with tachycardia, hypotension, and jugular venous distension. Focused cardiac ultrasound is performed.",
    lead_in: "Which echocardiographic finding confirms the suspected diagnosis?",
    explanation_brief_md:
      "Right atrial collapse during diastole indicates pericardial tamponade physiology.",
    explanation_deep_md:
      "Cardiac tamponade features elevated pericardial pressures causing diastolic collapse of low-pressure chambers (RA then RV). Plethoric IVC and pulsus paradoxus further support the diagnosis.",
    difficulty_target: 3,
    bloom: "analysis",
    topic: "Pericardial disease",
    subtopic: "Tamponade",
    lesion: "Pericardial effusion",
    lecture_link: "https://learn.chd.edu/lectures/tamponade",
    media_bundle_id: "9433c067-3d45-4774-baee-803d06b3bead",
    context_panels: null,
    status: "published",
    choices: [
      {
        id: "08524091-bc16-4a77-9f00-1406b1867f0b",
        label: "A",
        text_md: "Respiratory variation in mitral inflow >15%",
        is_correct: false
      },
      {
        id: "8d67167f-025b-49a0-9359-11149a165695",
        label: "B",
        text_md: "Right atrial collapse in diastole",
        is_correct: true
      },
      {
        id: "a90080d9-836f-4085-9212-6a2a33887e79",
        label: "C",
        text_md: "Left ventricular outflow tract obstruction",
        is_correct: false
      },
      {
        id: "faf2232f-a6c4-43f4-a7f3-80a77bcc269c",
        label: "D",
        text_md: "Prominent mitral valve prolapse",
        is_correct: false
      }
    ]
  },
  {
    id: "be11dc66-d953-4724-a297-45823ad57e48",
    slug: "endocarditis_dental_prophylaxis",
    stem_md:
      "35-year-old woman with a mechanical mitral valve is scheduled for dental extraction. She has no history of drug allergy.",
    lead_in: "Which prophylactic regimen is recommended?",
    explanation_brief_md: "High-risk patients with prosthetic valves require amoxicillin before invasive dental work.",
    explanation_deep_md:
      "Endocarditis prophylaxis is indicated for prosthetic valves undergoing mucosal manipulation. Amoxicillin 30 to 60 minutes before the procedure is first-line therapy.",
    difficulty_target: 1,
    bloom: "application",
    topic: "Infective endocarditis",
    subtopic: "Prevention",
    lesion: "Prosthetic valve",
    lecture_link: "https://learn.chd.edu/lectures/endocarditis-prevention",
    media_bundle_id: null,
    context_panels: null,
    status: "published",
    choices: [
      {
        id: "603b326b-f994-4c99-a7cd-15f4ac54ae43",
        label: "A",
        text_md: "No prophylaxis needed",
        is_correct: false
      },
      {
        id: "b4e8c69d-8fc4-4e40-ac2e-2342d0d6106e",
        label: "B",
        text_md: "Oral amoxicillin 1 hour before the procedure",
        is_correct: true
      },
      {
        id: "b7fa326c-1b6b-4115-8759-f6bd13a2bf13",
        label: "C",
        text_md: "Single dose IV vancomycin",
        is_correct: false
      },
      {
        id: "51643e40-3064-4a0b-804b-24f4c3e3de07",
        label: "D",
        text_md: "Oral azithromycin immediately after the procedure",
        is_correct: false
      }
    ]
  }
];

export const cxrItemSeeds = [
  {
    id: "e8b3cf71-3ffa-4aea-8f12-ff515ceb35b6",
    slug: "cxr_right_pleural_effusion",
    image_url:
      "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=900&q=80",
    caption_md:
      "Upright PA chest radiograph demonstrating blunting of the right costophrenic angle with meniscus sign consistent with a moderate pleural effusion.",
    lesion: "Pleural effusion",
    topic: "Radiology",
    status: "published",
    labels: [
      {
        id: "b27d487d-3e77-4c20-af66-70651b1e89d3",
        label: "Right costophrenic angle",
        x: 0.68,
        y: 0.82,
        w: 0.14,
        h: 0.16,
        is_correct: true
      },
      {
        id: "d64a657e-9295-4ce2-9c2d-63b7c40a2cd2",
        label: "Left upper lobe",
        x: 0.28,
        y: 0.28,
        w: 0.18,
        h: 0.18,
        is_correct: false
      }
    ]
  }
];
