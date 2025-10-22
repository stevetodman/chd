# Maintenance Audit — 2025-02-21

## Dependency Pass (Focused)
- **Unused dependencies**: `@radix-ui/react-dialog`, `@radix-ui/react-dropdown-menu`, `@radix-ui/react-hover-card`, `@radix-ui/react-toast`, `classnames`, `rehype-raw`, and `zod` are declared but not referenced anywhere in the source tree. They can be removed to reduce install size and bundle surface area.【F:chd-qbank/package.json†L18-L36】【f9b177†L1-L8】【5c7c6a†L1-L7】【ba5dba†L1-L7】【f7d752†L1-L7】【98149f†L1-L1】【d2fffb†L1-L8】【0c5c22†L1-L1】
- **Near duplicates / overlaps**: The four Radix UI packages overlap with native dialog/menu/tooltip patterns already implemented with Tailwind CSS components. Keeping just one headless component library (or replacing ad-hoc usages with [`<dialog>`](https://developer.mozilla.org/docs/Web/HTML/Element/dialog)) avoids maintaining parallel UI stacks. Similarly, `classnames` duplicates simple `Array.filter(Boolean).join(" ")` helpers already present in several components.
- **Heaviest transitive trees**:
  - `chart.js` (~6.3 MB installed) is the dominant production dependency because it brings in parsing, animation, and locale data. Investigate replacing dashboard charts with lighter viz libraries (`uplot`, `chartist`) or server-side pre-aggregation to reduce client weight.【15e192†L1-L2】【F:chd-qbank/src/components/Charts/ItemStatsChart.tsx†L1-L36】
  - `tailwindcss` (~7.2 MB) lives in `devDependencies`; keep it but ensure it is excluded from production bundles.【26b730†L1-L2】【F:chd-qbank/tailwind.config.ts†L1-L22】
  - `rehype-highlight` (540 KB) pulls Highlight.js themes; consider replacing with the lighter `shiki`/`prismjs` loaders if bundle size becomes an issue.【d0d1df†L1-L2】【F:chd-qbank/src/lib/markdown.ts†L1-L12】
- **Suggested stdlib / lighter alternatives**: Replace `classnames` with built-in template literals; rely on browser-native `<dialog>` and `<details>`/`<summary>` to eliminate Radix UI packages; use `URLSearchParams`/`structuredClone` from the stdlib instead of adding helper packages in the future; evaluate `marked` + manual syntax highlighting as an alternative to `rehype-highlight` if you move more rendering server-side.
- **Verification commands**:
  - npm: `npm install && npx depcheck && npm ls --production`
  - pnpm: `pnpm install && pnpm dlx depcheck && pnpm ls --prod`
  - yarn: `yarn install && yarn dlx depcheck && yarn list --prod`
  - pip: `python -m pip install pipdeptree && pipdeptree`
  - go: `go mod tidy && go list -deps`
  - maven: `mvn dependency:analyze dependency:tree`

## Build / Bundle Pass
- The current Vite config always enables source maps, which increases production bundle size and can leak source code.【F:chd-qbank/vite.config.ts†L1-L18】 Disable them for release builds or gate them behind `process.env.VITE_SOURCEMAPS`. Also ensure `cssCodeSplit` stays enabled (default) and tighten `build.target` to modern browsers.
- Recommended minimal production config:
  ```ts
  // vite.config.ts
  export default defineConfig(({ mode }) => ({
    plugins: [react()],
    build: {
      target: "es2020",
      sourcemap: mode !== "production",
      cssCodeSplit: true,
      minify: "esbuild",
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ["react", "react-dom", "react-router-dom"],
            charts: ["chart.js", "react-chartjs-2"],
          },
        },
      },
      commonjsOptions: { include: [] },
    },
    define: { __DEV__: mode !== "production" },
  }));
  ```
  This config enables deterministic code-splitting (vendor vs. chart chunks) and keeps tree-shaking effective because only ESM dependencies remain in the default include list.
- Production build flags to enable: `vite build --mode production --minify=esbuild --treeshake true --sourcemap=false`. Avoid `--watch` and dev-only plugins in CI builds.
- Docker (multi-stage) suggestion with estimated layers:
  ```Dockerfile
  # Stage 1 — deps (≈450 MB node base + 150 MB deps)
  FROM node:20-slim AS deps
  WORKDIR /app
  COPY package.json package-lock.json ./
  RUN npm ci --omit=dev
  
  # Stage 2 — builder (adds ≈80 MB build cache)
  FROM node:20-slim AS build
  WORKDIR /app
  COPY --from=deps /app/node_modules ./node_modules
  COPY . .
  RUN npm run build
  
  # Stage 3 — runtime (≈80 MB)
  FROM node:20-slim AS runner
  WORKDIR /app
  ENV NODE_ENV=production
  COPY --from=build /app/dist ./dist
  COPY package.json ./
  CMD ["npx", "serve", "dist", "--single"]
  ```
  Swap `serve` with Nginx for static hosting to shrink the runtime layer further.

## Asset / LFS Pass
- No tracked repository files exceed 1 MB, so Git LFS is currently unnecessary.【c31956†L1-L13】 Continue to keep generated assets out of version control.
- If large binaries arrive later, add `.gitattributes` entries such as:
  ```gitattributes
  public/**/*.{png,jpg,jpeg,webp} filter=lfs diff=lfs merge=lfs -text
  supabase/backups/**/*.tar.gz filter=lfs diff=lfs merge=lfs -text
  ```
- Image optimization tips: Prefer SVG for icons, run screenshots through lossless `oxipng`/`jpegoptim`, and store large study assets in object storage (Supabase storage bucket) rather than Git.
- Compression helper script (`scripts/compress-assets.sh`):
  ```bash
  #!/usr/bin/env bash
  set -euo pipefail
  for file in "$@"; do
    case "$file" in
      *.png) oxipng -o6 --strip safe "$file" ;;
      *.jpg|*.jpeg) jpegoptim --max=85 "$file" ;;
      *.webp) cwebp -q 80 "$file" -o "${file%.webp}.webp" ;;
    esac
  done
  ```
  Install `oxipng`, `jpegoptim`, and `cwebp` locally before running.

## CI Slimming Pass
- There are currently no GitHub Actions workflows in the repository (`.github/workflows` is empty), so there is nothing to slim down at present.【4ddacd†L1-L3】
- When introducing CI, use a single workflow with matrixed Node versions, cache `~/.npm` via `actions/cache`, gate runs with `concurrency`, and avoid duplicate triggers. Example diff for an initial workflow:
  ```diff
  +# .github/workflows/ci.yml
  +name: CI
  +on:
  +  push:
  +    branches: [main]
  +  pull_request:
  +    branches: [main]
  +concurrency:
  +  group: ${{ github.workflow }}-${{ github.ref }}
  +  cancel-in-progress: true
  +jobs:
  +  test:
  +    runs-on: ubuntu-latest
  +    strategy:
  +      matrix:
  +        node-version: [18.x, 20.x]
  +    steps:
  +      - uses: actions/checkout@v4
  +      - uses: actions/setup-node@v4
  +        with:
  +          node-version: ${{ matrix.node-version }}
  +          cache: npm
  +      - run: npm ci
  +      - run: npm run lint
  +      - run: npm test -- --run
  ```
  Expect runtime ≈6–7 min with caching (down from ~11 min cold installs).

