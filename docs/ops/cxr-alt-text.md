# CXR game alt text guidelines

The lesion matching game reads items from the `cxr_items` table in Supabase. Each record should provide enough metadata for descriptive alternative text:

- Use the `lesion` field to summarize the finding (e.g., `d-TGA`, `total anomalous pulmonary venous return`).
- Populate label text for the correct hotspot with clinically meaningful phrasing ("Main pulmonary artery prominence" instead of "Answer B").
- When uploading media, add a caption that restates the key visual cue in plain language.

The web client now builds the `<img>` alt text from this metadata ("Chest x-ray showing {label}" when the correct label is present). If no lesion or caption is stored, it falls back to the placeholder string:

> Chest radiograph for the congenital heart disease lesion matching game.

Document this placeholder in the CMS so editors know to replace it with a real description. Content updates should prioritize adding lesion names and precise label text so learners using assistive technology receive equivalent context.
