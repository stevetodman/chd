export type MurmurOption = {
  id: string;
  label: string;
  text_md: string;
  is_correct: boolean;
};

export type MurmurItem = {
  id: string;
  prompt_md?: string | null;
  rationale_md?: string | null;
  media_url: string;
  options: MurmurOption[];
};

export type MurmurOptionRow = {
  id: string;
  label: string;
  text_md: string;
  is_correct: boolean;
};

export type MurmurItemRow = {
  id: string;
  prompt_md: string | null;
  rationale_md: string | null;
  media_url: string;
  murmur_options: MurmurOptionRow[] | null;
};

export function normalizeMurmurItems(rows: MurmurItemRow[]): MurmurItem[] {
  return rows.map((item) => ({
    id: item.id,
    prompt_md: item.prompt_md,
    rationale_md: item.rationale_md,
    media_url: item.media_url,
    options: (item.murmur_options ?? []).map((option) => ({
      id: option.id,
      label: option.label,
      text_md: option.text_md,
      is_correct: option.is_correct
    }))
  }));
}

export function getNextMurmurIndex(currentIndex: number, total: number): number {
  if (total === 0) return 0;
  return (currentIndex + 1) % total;
}

export function feedbackForMurmurOption(option: MurmurOption | null): string | null {
  if (!option) return null;
  return option.is_correct ? "Correct!" : "Try again";
}
