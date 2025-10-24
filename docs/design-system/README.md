# Design system overview

The design system codifies reusable foundations and primitives that power our product UI. It provides color and typography tokens, reusable layout guidance, and documented React components for navigation and page surfaces.

## Foundations

### Color tokens

Color palettes live in [`src/design-system/tokens.ts`](../../chd-qbank/src/design-system/tokens.ts). Tokens are grouped by semantic role (`brand`, `accent`, `surface`, `success`, `warning`, `danger`, `info`) and expose tonal steps for light/dark ramping. Use these tokens when introducing new Tailwind utilities or inline styles so we maintain parity with Tailwind’s extended theme.

### Typography and spacing

The typography scale captures display, title, body, and label sizes that map to the Tailwind configuration. Spacing, radii, elevations, and layout breakpoints are also defined in [`tokens.ts`](../../chd-qbank/src/design-system/tokens.ts) and should be referenced when building new primitives.

## Components

### NavigationBar

`NavigationBar` standardizes global navigation, including responsive collapse behaviour and link styling. Key props:

- `brand`: React node for product branding (typically a `Link`).
- `primaryLinks`: array of primary routes, shown on desktop and mobile.
- `secondaryLinks`: utility/account links displayed on the right side.
- `actions`: optional desktop-only CTA region.
- `mobileActions`: optional footer region inside the mobile drawer.

See [`Navbar.tsx`](../../chd-qbank/src/components/Navbar.tsx) for an example combining primary navigation, account links, and sign-out actions.

### SectionHeader

`SectionHeader` captures recurring section headings with optional eyebrow tags and action slots. It supports compact or comfortable spacing and start/center alignment. [`Review.tsx`](../../chd-qbank/src/pages/Review.tsx) demonstrates using `SectionHeader` to pair a section intro with actions.

### StatTile

`StatTile` turns metric cards into a reusable primitive with tone-aware color ramps, interactive elevation, and flexible layouts. Variants include `neutral`, `brand`, `accent`, `success`, `warning`, `danger`, and `info`. Pass `interactive` to enable hover/focus elevation and optional `description`, `trend`, or `icon` content. The dashboard’s “Your progress” panel uses four stat tiles (`Dashboard.tsx`).

### Tag

`Tag` replaces ad-hoc pill styles for inline metadata. Adjust the tone (`neutral`, `brand`, `accent`, `success`, `warning`, `danger`, `info`), size (`sm`, `md`), optional leading icon, and uppercase behaviour. The dashboard hero chip shows a `Tag` with custom tone overrides.

## Adding new primitives

1. Define new tokens or variations in [`tokens.ts`](../../chd-qbank/src/design-system/tokens.ts) when needed.
2. Build React components inside `src/design-system/components` and export them via [`index.ts`](../../chd-qbank/src/design-system/index.ts).
3. Update this document with usage guidance, including where the component appears in product surfaces.
4. Prefer composing existing primitives (Button, Card, StatTile, Tag) before introducing bespoke Tailwind class strings.

This structure keeps our visuals consistent, simplifies theming, and makes future dark-mode work easier.
