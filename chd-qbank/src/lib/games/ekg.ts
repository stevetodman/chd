export const DEFAULT_EKG_ALT_TEXT = "Electrocardiogram for the Read the EKG game.";

export type EkgOption = {
  id: string;
  label: string;
  text_md: string;
  is_correct: boolean;
};

export type EkgItem = {
  id: string;
  image_url: string;
  prompt_md?: string | null;
  explanation_md?: string | null;
  rhythm?: string | null;
  options: EkgOption[];
};

export type EkgOptionRow = {
  id: string;
  label: string;
  text_md: string;
  is_correct: boolean;
};

export type EkgItemRow = {
  id: string;
  image_url: string;
  prompt_md: string | null;
  explanation_md: string | null;
  rhythm: string | null;
  ekg_options: EkgOptionRow[] | null;
};

function plainTextFromMarkdown(markdown?: string | null): string | null {
  if (!markdown) return null;
  const plain = markdown
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[\*_`>#~|-]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return plain.length > 0 ? plain : null;
}

export function normalizeEkgItems(rows: EkgItemRow[]): EkgItem[] {
  return rows.map((item) => ({
    id: item.id,
    image_url: item.image_url,
    prompt_md: item.prompt_md,
    explanation_md: item.explanation_md,
    rhythm: item.rhythm,
    options: (item.ekg_options ?? []).map((option) => ({
      id: option.id,
      label: option.label,
      text_md: option.text_md,
      is_correct: option.is_correct
    }))
  }));
}

export function getNextEkgIndex(currentIndex: number, total: number): number {
  if (total === 0) return 0;
  return (currentIndex + 1) % total;
}

export function feedbackForEkgOption(option: EkgOption | null): string | null {
  if (!option) return null;
  return option.is_correct ? "Correct!" : "Not quite. Try another interpretation.";
}

export function ekgAltTextForItem(item: EkgItem | null): string {
  if (!item) return DEFAULT_EKG_ALT_TEXT;
  if (item.rhythm) {
    return `Electrocardiogram demonstrating ${item.rhythm}.`;
  }
  const promptText = plainTextFromMarkdown(item.prompt_md);
  if (promptText) {
    return `Electrocardiogram: ${promptText}`;
  }
  return DEFAULT_EKG_ALT_TEXT;
}
