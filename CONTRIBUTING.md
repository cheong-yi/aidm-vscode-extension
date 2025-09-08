# Contributing

Thank you for improving the AiDM VS Code extension. This guide covers setup, workflow, and expectations. For technical details and conventions, see AGENTS.md.

## Getting Started
- Prereqs: Node >= 20, npm >= 9, VS Code (latest), Git.
- Clone: `git clone <your-fork-url>` then `cd aidm-vscode-extension`.
- Install deps: `npm ci` (preferred) or `npm install`.

## Develop & Run
- Build once: `npm run compile` (outputs to `dist/`).
- Watch: `npm run watch` for incremental builds.
- Launch: open in VS Code and press `F5` to start the Extension Development Host.
- Lint: `npm run lint` (ESLint + @typescript-eslint).
- Test: `npm test` (Jest + ts-jest, 80% coverage threshold).
- Validate manifest/packaging: `npm run validate-manifest` and `npm run test:packaging`.
- Optional: `npm run package` to produce a `.vsix` for manual install.

## Branch, Commits, PRs
- Branch names: `feat/<short-desc>`, `fix/<issue-id>-<short-desc>`, `chore/<topic>`.
- Commits: Conventional Commits style (e.g., `feat(webview): add branding container`, `fix(tasks): correct subtask mapping`). Keep subjects imperative, <= 72 chars.
- Pull Requests: use the template. Include description, linked issues, screenshots/GIFs for UI, and a test plan. Ensure tests and lint pass.

## Tests & Structure
- Place tests under `src/__tests__/` by suite (`unit/`, `integration/`, `e2e/`).
- File naming: `*.test.ts` (e.g., `TimeFormattingUtility.test.ts`).
- Aim for clear, isolated tests; prefer fast unit tests first. Add integration tests when behavior spans modules (e.g., MCP server + client).

## Code Style
- TypeScript, 2-space indentation, double quotes, semicolons. Prefer named exports.
- Keep utilities in lowerCamelCase files (e.g., `manifestValidator.ts`); classes/providers/models in PascalCase.
- Remove dead code; keep imports ordered; run lint before pushing.

## Security & Config
- Do not commit secrets. Configure `aidmVscodeExtension.remote.apiKey` via VS Code Settings or environment.
- Default mock mode is enabled; verify remote MCP settings and port `3001` for demos.

## References
- AGENTS.md (Repository Guidelines)
- README.md (overview), CONFIGURATION.md, DEPLOYMENT.md, docs/roocode-hybrid-architecture.md
