# High-Impact Website Improvements

As a professional website designer reviewing the current CHD QBank interface, here are the three most impactful updates to elevate usability, visual polish, and conversion.

## 1. Craft a Purpose-Built Dashboard Hero
- **Current state:** The dashboard immediately lists cards and metrics without a clear visual hierarchy, so users are left to parse data before understanding the most important next action.
- **Recommendation:** Introduce a hero strip at the top of the dashboard featuring a welcome headline, the learner's alias, and a primary CTA ("Resume practice" or "Start new quiz"). Use a soft gradient or illustrated background paired with a concise progress summary chip.
- **Impact:** Establishing an above-the-fold focal point clarifies the page's intent, improves scannability, and drives higher engagement with the main action within the first 5 seconds on page.

## 2. Elevate Data Visualization & Feedback
- **Current state:** The PracticeTrendChart component renders data but lacks contextual annotations, onboarding copy, or empty states that explain why the chart matters.
- **Recommendation:** Add a lightweight tooltip system with weekly delta comparisons, annotate the peak and most recent week, and include celebratory microcopy for streaks. When data is missing, show a friendly illustration explaining how to build history.
- **Impact:** Richer context transforms raw metrics into actionable insight, helping learners feel progress momentum and increasing repeat practice sessions.

## 3. Build a Consistent Visual Language for Cards
- **Current state:** Cards across Dashboard, Practice, and Review views mix shadows, border radii, and typography scales, creating a slightly fragmented visual rhythm.
- **Recommendation:** Define a shared card system in `src/components/ui/Card.tsx` with standardized padding, elevation levels, and headline/body text tokens. Apply subtle hover states and status accents (e.g., success for mastered topics).
- **Impact:** Harmonizing card styles reduces cognitive load, strengthens brand perception, and lays groundwork for theming or marketing site parity.
