# Contributing to CHD

Thanks for your interest in contributing! We want to make the process as smooth as possible, so please review the guidelines below before opening an issue or pull request. Our goal is to maintain a respectful, well-documented workflow that enables clinicians, designers, and engineers to collaborate effectively.

## Getting Started
- Familiarize yourself with the project by reading the [`README.md`](README.md) and browsing the existing code.
- Search the issue tracker to avoid duplicating work. If you do not find an existing issue, open a new one describing the change you would like to make.
- For significant changes, please discuss your proposal with the maintainers before starting work. Early feedback helps ensure your efforts align with roadmap priorities.
- For documentation-only fixes, label your pull request accordingly so reviewers can tailor feedback.

## Local Development Environment
- Install [Node.js](https://nodejs.org/) version `20.19.0` or newer (the app is also tested against the latest 22.x releases).
- Clone the repository and install dependencies from the workspace root:
  ```bash
  npm install
  ```
- Most application code lives in the [`chd-qbank/`](chd-qbank) workspace. Scripts and shared configuration are hoisted to the monorepo root.
- Review [`ENV.md`](ENV.md) for information on environment variables and external services such as Supabase.

### Useful commands
All commands should be run from the repository root. Prefix commands with `npm run --workspace chd-qbank` when the script lives inside the workspace.

| Task | Command |
| ---- | ------- |
| Start the development server | `npm run dev --workspace chd-qbank` |
| Type-check the project | `npm run typecheck --workspace chd-qbank` |
| Lint the codebase | `npm run lint --workspace chd-qbank` |
| Run unit tests | `npm run test --workspace chd-qbank` |
| Execute Playwright end-to-end tests | `npm run test:e2e --workspace chd-qbank` |
| Build production assets | `npm run build --workspace chd-qbank` |

## Development Workflow
1. Create a new branch for your contribution (e.g., `feature/analytics-refresh`, `docs/security-policy`).
2. Make your changes with clear, incremental commits and descriptive messages. Favor small, reviewable diffs over monolithic updates.
3. Update documentation, tests, and examples to reflect your changes. Documentation updates should include context for why the change was necessary.
4. Run the relevant tests and linters locally before submitting your pull request. Please include the commands you ran in the PR description using the [template](.github/PULL_REQUEST_TEMPLATE.md).
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
