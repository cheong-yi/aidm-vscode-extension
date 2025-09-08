# Repository Guidelines

## Project Structure & Module Organization
- Entry point: `src/extension.ts` (activates the VS Code extension).
- Core modules: `src/services/`, `src/server/`, `src/providers/`, `src/ui/`, `src/tasks/`, `src/utils/`, `src/types/`, `src/models/`, `src/client/`.
- Testing: `src/__tests__/` with `unit/`, `integration/`, `e2e/`, `server/`, `mock/`, and `validation/` suites.
- Assets: `resources/images/`.
- Docs and guides: top-level `README.md`, `CONFIGURATION.md`, `DEPLOYMENT.md`, `PACKAGING_SUMMARY.md`, `docs/`.

## Build, Test, and Development Commands
- `npm run compile`: Build the extension bundle via Webpack into `dist/`.
- `npm run watch`: Rebuild on file changes during development.
- `npm test`: Run Jest (TypeScript via ts-jest) with coverage.
- `npm run lint`: Lint TypeScript sources using ESLint.
- `npm run validate-manifest`: Validate VS Code manifest and packaging basics.
- `npm run test:packaging`: Sanity checks for packaging.
- `npm run package`: Auto-bump minor version and create a `.vsix` using `vsce`.
- Run in VS Code: open folder and press `F5` (Extension Development Host).

## Coding Style & Naming Conventions
- Language: TypeScript (Node >= 20). Indentation: 2 spaces; use double quotes and semicolons.
- Structure: classes/providers/models in PascalCase (e.g., `TaskStatusManager.ts`); utilities in lowerCamelCase (e.g., `manifestValidator.ts`). Keep exports named and explicit.
- Linting: ESLint with `@typescript-eslint` rules; keep imports ordered and dead code removed.

## Testing Guidelines
- Framework: Jest with `ts-jest`; environment: `node`.
- Location: place tests under `src/__tests__/` by suite (`unit/`, `integration/`, `e2e/`).
- Naming: end files with `.test.ts` (e.g., `TimeFormattingUtility.test.ts`).
- Coverage: project enforces 80% global thresholds; run `npm test` locally and ensure green.

## Commit & Pull Request Guidelines
- Commits: follow Conventional Commits where practical (`feat:`, `fix:`, `refactor:`) with optional scopes (e.g., `feat(webview): …`) and ticket tags (e.g., `WV-017`). Keep subjects imperative and < 72 chars.
- PRs: include a clear description, linked issue or ticket, screenshots/GIFs for UI changes, and a short test plan. Require: `npm test` and `npm run lint` passing; note any follow-ups.

## Security & Configuration Tips
- Do not commit secrets. Configure `aidmVscodeExtension.remote.apiKey` via VS Code Settings or environment, not source.
- Default mock mode is enabled; verify remote connections and ports (default MCP port `3001`) before demos.

## Architecture Overview
- Activation: `src/extension.ts` wires VS Code commands, configuration, and UI. Main output is `dist/extension.js`.
- Providers/UI: `src/providers/hoverProvider.ts` adds business-context hovers; `src/ui/` renders status bar and webviews; `src/tasks/providers/` powers the Tasks panel.
- Services: `src/services/` handles task parsing (`JSONTaskParser`, `MarkdownTaskParser`), status (`TaskStatusManager`), files (`TaskFileWatcher`), and caching.
- Server/MCP: `src/server/` includes `SimpleMCPServer`, `ProcessManager`, and `ContextManager` used by `src/client/mcpClient.ts` and `hybridMCPClient.ts`.
- Utilities/Types: shared helpers in `src/utils/` and contracts in `src/types/` and `src/tasks/types/`.
- More: see `docs/roocode-hybrid-architecture.md` and `docs/roocode-hybrid-integration.md` for integration flows.
