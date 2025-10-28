export type EmbryologyDeckItem = {
  id: string;
  lesion: string;
  prompt: string;
  explanation: string;
  associations: string[];
};

export type EmbryologyOption = {
  id: string;
  lesion: string;
  associations: string[];
  isCorrect: boolean;
};

export type EmbryologyQuestion = {
  id: string;
  prompt: string;
  answer: string;
  explanation: string;
  associations: string[];
  options: EmbryologyOption[];
};

const CHOICES_PER_QUESTION = 4;

const EMBRYOLOGY_DECK: EmbryologyDeckItem[] = [
  {
    id: "secundum-asd",
    lesion: "Secundum atrial septal defect",
    prompt:
      "Excessive resorption of the septum primum or insufficient development of the septum secundum leaves a large, persistent foramen ovale. Which congenital heart disease does this describe?",
    explanation:
      "A secundum atrial septal defect leaves a deficient flap over the foramen ovale, producing left-to-right shunting across the atrial septum.",
    associations: [
      "Most common type of atrial septal defect",
      "Fixed, widely split S2 and risk of paradoxical emboli"
    ]
  },
  {
    id: "ventricular-septal-defect",
    lesion: "Ventricular septal defect",
    prompt:
      "Failure of the membranous interventricular septum to form because the endocardial cushions do not contribute properly results in which lesion?",
    explanation:
      "A membranous ventricular septal defect leaves an opening between the ventricles that allows a left-to-right shunt until pulmonary vascular resistance rises.",
    associations: [
      "Most common congenital cardiac anomaly",
      "Holosystolic murmur best heard at the left lower sternal border"
    ]
  },
  {
    id: "patent-ductus-arteriosus",
    lesion: "Patent ductus arteriosus",
    prompt:
      "Persistence of the vascular connection derived from the left sixth aortic arch that normally closes after birth is characteristic of which congenital heart disease?",
    explanation:
      "A patent ductus arteriosus maintains a connection between the left pulmonary artery and the descending aorta, creating a continuous left-to-right shunt until it is ligated or prostaglandin synthesis is inhibited.",
    associations: [
      "Produces a continuous, machine-like murmur",
      "Indomethacin promotes closure; prostaglandin E1/2 maintain patency"
    ]
  },
  {
    id: "tetralogy-of-fallot",
    lesion: "Tetralogy of Fallot",
    prompt:
      "Anterosuperior displacement of the infundibular (conal) septum during conotruncal partitioning generates which cyanotic congenital heart disease?",
    explanation:
      "Tetralogy of Fallot features a malaligned ventricular septal defect with overriding aorta, right ventricular outflow obstruction, and right ventricular hypertrophy.",
    associations: [
      "Cyanosis relieved by squatting as systemic vascular resistance rises",
      "Boot-shaped heart on chest radiograph"
    ]
  },
  {
    id: "transposition-of-the-great-arteries",
    lesion: "Transposition of the great arteries",
    prompt:
      "Failure of the aorticopulmonary septum to spiral during outflow tract development leads to which lesion characterized by parallel circulations?",
    explanation:
      "Transposition of the great arteries places the aorta anterior and arising from the right ventricle while the pulmonary trunk arises from the left ventricle, yielding separate systemic and pulmonary circuits that require a shunt for survival.",
    associations: [
      "Associated with maternal diabetes",
      "Needs a PDA, VSD, or ASD to sustain life"
    ]
  },
  {
    id: "persistent-truncus-arteriosus",
    lesion: "Persistent truncus arteriosus",
    prompt:
      "Failure of truncal and bulbar ridges to form and fuse into the aorticopulmonary septum causes which congenital heart disease?",
    explanation:
      "Persistent truncus arteriosus leaves a single arterial trunk that gives rise to the systemic, pulmonary, and coronary circulations, almost always accompanied by a ventricular septal defect.",
    associations: [
      "Results in early cyanosis from complete mixing",
      "Frequently linked to DiGeorge syndrome"
    ]
  },
  {
    id: "tricuspid-atresia",
    lesion: "Tricuspid atresia",
    prompt:
      "Complete failure of the right atrioventricular endocardial cushions to canalize the orifice between the right atrium and ventricle leads to which lesion?",
    explanation:
      "Tricuspid atresia produces an absent tricuspid valve and hypoplastic right ventricle, requiring both an atrial and a ventricular shunt for systemic and pulmonary blood flow.",
    associations: [
      "Marked cyanosis at birth",
      "Requires both an ASD or PFO and a VSD to sustain life"
    ]
  },
  {
    id: "total-anomalous-pulmonary-venous-return",
    lesion: "Total anomalous pulmonary venous return",
    prompt:
      "Failure of the pulmonary veins to connect to the left atrium, instead draining into systemic venous structures, defines which congenital heart disease?",
    explanation:
      "Total anomalous pulmonary venous return routes oxygenated pulmonary venous blood back to the right atrium, demanding an atrial shunt such as a patent foramen ovale for left-sided filling.",
    associations: [
      "Leads to right heart volume overload",
      "Snowman (figure-of-eight) silhouette on chest radiograph"
    ]
  },
  {
    id: "preductal-coarctation",
    lesion: "Preductal coarctation of the aorta",
    prompt:
      "Narrowing of the aortic arch proximal to the ductus arteriosus due to abnormal remodeling of the fourth aortic arch describes which congenital lesion?",
    explanation:
      "Preductal (infantile) coarctation of the aorta limits distal perfusion before the ductus arteriosus, often presenting with lower-extremity hypoperfusion and differential cyanosis in neonates.",
    associations: [
      "Associated with Turner syndrome",
      "Typically maintains ductal patency to perfuse the descending aorta"
    ]
  },
  {
    id: "postductal-coarctation",
    lesion: "Postductal coarctation of the aorta",
    prompt:
      "Juxtaductal narrowing of the aorta distal to the ligamentum arteriosum from aberrant involution of ductal tissue causes which lesion often diagnosed in adolescence?",
    explanation:
      "Postductal (adult-type) coarctation produces upper-extremity hypertension with delayed, diminished femoral pulses as collateral intercostal vessels enlarge to bypass the obstruction.",
    associations: [
      "Rib notching on chest radiograph from enlarged intercostal arteries",
      "Can cause headaches and epistaxis from upper-body hypertension"
    ]
  },
  {
    id: "ebstein-anomaly",
    lesion: "Ebstein anomaly",
    prompt:
      "Failure of the tricuspid valve leaflets to delaminate from the right ventricular wall, often linked to in utero lithium exposure, produces which congenital defect?",
    explanation:
      "Ebstein anomaly displaces the tricuspid valve toward the apex, atrializing a portion of the right ventricle and causing severe tricuspid regurgitation.",
    associations: [
      "Massive right atrial enlargement with right-to-left shunting across a PFO",
      "Associated with Wolff-Parkinson-White syndrome and maternal lithium use"
    ]
  },
  {
    id: "hypoplastic-left-heart-syndrome",
    lesion: "Hypoplastic left heart syndrome",
    prompt:
      "Underdevelopment of the left-sided cardiac structures, including the mitral valve, left ventricle, and ascending aorta due to inadequate flow during embryogenesis, defines which lesion?",
    explanation:
      "Hypoplastic left heart syndrome leaves the systemic circulation dependent on the right ventricle and ductus arteriosus until staged surgical palliation is performed.",
    associations: [
      "Requires maintenance of ductal patency with prostaglandin E1",
      "Presents with profound shock when the ductus arteriosus closes"
    ]
  }
];

const shuffle = <T,>(input: T[]): T[] => {
  const copy = [...input];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

export function createEmbryologyQuestionSet(): EmbryologyQuestion[] {
  const deck = shuffle(EMBRYOLOGY_DECK);
  return deck.map((card) => {
    const distractors = shuffle(EMBRYOLOGY_DECK.filter((item) => item.id !== card.id)).slice(
      0,
      Math.max(0, CHOICES_PER_QUESTION - 1)
    );

    const options = shuffle([card, ...distractors]).map((item) => ({
      id: `${card.id}__${item.id}`,
      lesion: item.lesion,
      associations: item.associations,
      isCorrect: item.id === card.id
    }));

    return {
      id: card.id,
      prompt: card.prompt,
      answer: card.lesion,
      explanation: card.explanation,
      associations: card.associations,
      options
    } satisfies EmbryologyQuestion;
  });
}

export const embryologyDeckSize = EMBRYOLOGY_DECK.length;
