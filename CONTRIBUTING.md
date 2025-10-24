# Contributing to CHD

Thanks for your interest in contributing! We want to make the process as smooth as possible, so please review the guidelines below before opening an issue or pull request. Our goal is to maintain a respectful, well-documented workflow that enables clinicians, designers, and engineers to collaborate effectively.

## Getting Started
- Familiarize yourself with the project by reading the [`README.md`](README.md) and browsing the existing code. The [`docs/ENV.md`](docs/ENV.md) reference outlines required environment variables for local development and deployment.
- Search the issue tracker to avoid duplicating work. If you do not find an existing issue, open a new one describing the change you would like to make.
- For significant changes, please discuss your proposal with the maintainers before starting work. Early feedback helps ensure your efforts align with roadmap priorities.
- For documentation-only fixes, label your pull request accordingly so reviewers can tailor feedback.
- Use the Node.js version specified in [`.nvmrc`](.nvmrc). If you prefer a different version manager, ensure it matches the pinned version or run `corepack enable` so the bundled package manager shims pick up the correct runtime.

## Development Workflow
1. Create a new branch for your contribution (e.g., `feature/analytics-refresh`, `docs/security-policy`).
2. Make your changes with clear, incremental commits and descriptive messages. Favor small, reviewable diffs over monolithic updates.
3. Update documentation, tests, and examples to reflect your changes. Documentation updates should include context for why the change was necessary. Cross-check the root [`Makefile`](Makefile) for helpful shortcuts when running project tasks.
4. Run the relevant tests and linters locally before submitting your pull request. Please include the commands you ran in the PR description using the [template](.github/PULL_REQUEST_TEMPLATE.md). In addition to unit tests and linting, run the following when your changes affect the corresponding areas:
   - `make typecheck` (or `npm run --prefix chd-qbank typecheck`) for TypeScript changes.
   - `npm run sbom` to regenerate the CycloneDX software bill of materials before releases or dependency updates.
   - `npm run --prefix chd-qbank test -- analytics-rls` (or an equivalent targeted Vitest command) when touching Supabase Row Level Security (RLS) logic.
   - `npm run --prefix chd-qbank verify:policies` to confirm policy definitions after schema migrations or Supabase policy updates.
5. Push your branch and open a draft PR if you want early feedback before the work is complete.

## Pull Requests
- Keep pull requests focused on a single topic. Large or unrelated changes should be split into multiple PRs.
- Ensure that CI passes before requesting a review.
- Fill out every section of the pull request template, including notes on linting, tests, and any UI screenshots when applicable. Documentation-only changes should check the "Not applicable" box in the testing section.
- Be responsive to reviewer feedback. Discussions are a normal part of the process—please be respectful and collaborative.
- When updating Supabase policies or functions, mention whether a key rotation or manual migration is required.

## Coding Standards
- Follow any existing style conventions in the surrounding code.
- Add or update tests when fixing bugs or adding features.
- Include docstrings and comments where they improve clarity.
- Keep Markdown line lengths reasonable (~120 characters) and prefer fenced code blocks with language hints for syntax highlighting.

## Community Expectations
- Be kind and inclusive. We welcome contributors of all backgrounds and experience levels.
- When in doubt, ask questions! Opening a draft pull request early can help surface potential issues quickly.
- Respect patient privacy. Do not upload real patient data, and scrub any identifying information from screenshots.

We appreciate your contributions and look forward to collaborating with you.
