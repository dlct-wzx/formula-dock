# Contributing

## Requirements

- Node.js 24 or newer
- npm 11 or newer
- Chrome or Edge 116+ for extension testing

## Setup

```powershell
npm ci
npm run dev
```

Web development uses:

- Vite: http://localhost:5173
- Node API: http://localhost:8787

## Validation

```powershell
npm run check
npm test
npm run build
npm run verify
```

For extension changes:

```powershell
npm run build:extension
npm run verify:extension
npm run smoke:extension
```

The live MinerU test is optional and requires a token:

```powershell
npm run smoke:extension:live
```

Never place the token in source, test fixtures, terminal output, or screenshots.

## Project structure

- `src/`: shared React workspace
- `extension/`: Manifest V3 extension source
- `shared/`: Node/browser MinerU extraction logic
- `server/`: self-hosted web API
- `scripts/`: build and package tooling
- `tests/`: parser, content-script, and browser smoke tests
- `.agents/`: project state, decisions, tasks, and verification evidence

## Contribution guidelines

- Use TypeScript for frontend code and keep provider-specific logic out of UI components.
- Keep formula data in `src/data/` and validate KaTeX rendering when adding content.
- Preserve keyboard accessibility and responsive behaviour.
- Keep the extension permissions minimal. Permission changes require documentation and tests.
- Add tests for formula parsing, provider-state mapping, page insertion, or build packaging changes.
- Update `.agents/tasks/backlog.yaml` and relevant verification notes when changing project state.
- Do not commit generated ZIPs, browser profiles, uploaded images, or secrets.
- Use Conventional Commit-style messages when practical.

## Pull requests

A pull request should include:

- a concise problem statement,
- the implemented solution,
- tests run,
- screenshots for UI changes,
- privacy and permission impact,
- a version bump when the extension package changes.

## License

By contributing, you agree that your contribution is licensed under the repository's Apache License 2.0.
