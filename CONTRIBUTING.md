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

## Contribution guidelines

- Use TypeScript for frontend code and keep provider-specific logic out of UI components.
- Keep formula data in `src/data/` and validate KaTeX rendering when adding content.
- Preserve keyboard accessibility and responsive behaviour.
- Keep the extension permissions minimal. Permission changes require documentation and tests.
- Add tests for formula parsing, provider-state mapping, category interaction, layout, or build packaging changes.
- Update user-facing documentation when behaviour, setup, or permissions change.
- Do not commit generated ZIPs, browser profiles, uploaded images, or secrets.
- Use Conventional Commit-style messages when practical.

## Releases

Before creating a release:

1. Update the matching version in `package.json` and `extension/manifest.json`.
2. Update `CHANGELOG.md`.
3. Run `npm run verify`.
4. Commit the version changes, then create and push a matching tag:

```powershell
git tag v0.8.3
git push origin v0.8.3
```

The tag starts the `Release extension` workflow. It repeats verification, builds
`release/formuladock-extension-v<version>.zip`, and publishes the ZIP in a GitHub
Release with generated notes. A tag must match both version files.
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
