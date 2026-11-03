# AGENTS.md

## Mission

FormulaDock is an **agent-led open-source project**. The default operator is an AI coding agent working with a human reviewer. Optimise for reversible changes, explicit state, reproducible verification, and clean handoffs.

The product combines:

1. A standalone web workspace with quick tools, formula templates, a LaTeX editor, and preview.
2. A Manifest V3 browser extension side panel that reuses the workspace, adds MinerU image recognition, and does not request access to webpages.

The application intentionally excludes accounts, payment, document recognition, favorites, AI formula chat, and Office export unless a new decision record is added.

The repository is licensed under Apache-2.0. Public contributions must remain compatible with that license. Do not publish the third-party reference build, generated release artifacts, browser profiles, or any real credentials.

## Read before changing code

In this order:

1. `.agents/project.yaml` — current scope, commands, features, and open work.
2. `.agents/architecture.md` — runtime boundaries and request flows.
3. `.agents/tasks/backlog.yaml` — active tasks and acceptance criteria.
4. Relevant files under `.agents/decisions/`.
5. README.md — human-facing setup instructions.

If these documents conflict, prefer the newest decision record and update the stale document in the same change.

## Commands

```powershell
npm run dev               # Vite at :5173 + API at :8787
npm run check             # TypeScript
npm test                  # server/parser tests
npm run build             # production web frontend
npm run build:extension   # web build + MV3 package
npm run verify            # check + tests + extension build + static checks
npm run verify:extension  # manifest/package/security validation
npm run smoke             # isolated server + web browser regression
npm run smoke:extension   # load extension-dist in headless Edge
npm run smoke:extension:live # real MinerU OCR using local token (generated test image)
npm start                 # serve ./dist and API together
```

Run `npm run verify` before declaring implementation work complete. Run `npm run smoke:extension` when extension UI, manifest, or messaging changes.

## Architecture rules

- Web frontend: React + TypeScript under `src/`.
- Web API: dependency-light Node HTTP server under `server/`.
- Browser extension source: `extension/`; tested build output: `extension-dist/`.
- Extension artifact: `release/formuladock-extension-v<version>.zip`.
- Static formula content belongs in `src/data/`, not inside components.
- Shared Node/browser MinerU extraction logic belongs in `shared/formula-parser.mjs`.
- Quick tool/template insertion must target the current editor caret.
- Formula rendering must stay client-side. KaTeX uses `throwOnError: false` and remains the default renderer.
- MathJax 4 is opt-in, uses SVG output, loads lazily, and must use only packaged local components, NewCM fonts, and dynamic glyph scripts.
- Do not add a MathJax CDN dependency, remote script host, or extra extension host permission.
- The public web UI must not expose image upload or call OCR endpoints. The Image recognition tab renders extension installation guidance in web mode.
- Extension direct OCR mode stores the user token in `chrome.storage.local`; never bundle it, log it, expose it to page scripts, or include it in the ZIP.
- Retained internal server OCR tests may read `MINERU_API_TOKEN` from the server environment only; never expose it through Vite variables, browser responses, or logs.
- Direct MinerU JSON, signed upload, and ZIP download requests run through the extension service worker. Do not move them back into page-origin fetch paths.
- The DNR rules may remove `Origin`/`Referer` only for the MinerU API, Aliyun upload infrastructure, and OpenXLab result CDN. Adding broader URL filters requires a decision record.
- Public consumer extension distribution should move OCR behind a controlled backend instead of asking each user for a MinerU token.
- Do not persist uploaded images by default.
- Retained server OCR endpoints are development infrastructure and must not be wired back into the public web UI without a new decision record.
- Provider-specific response handling belongs in provider modules, not UI components.
- The browser extension does not inject content scripts, read the active page, or insert LaTeX into websites.
- Do not add `activeTab`, `scripting`, `tabs`, `<all_urls>`, or optional webpage host permissions.
- The web workspace must keep Input and Output in a single vertical column at every viewport width.
- The tool panel and output preview must keep content-driven height; do not reintroduce fixed-height internal vertical scrolling.
- Wide formulas may scroll horizontally inside the output preview. Do not solve width overflow by clipping the formula or forcing page-level horizontal scrolling.
- The output-card primary action is an Output image menu for SVG, PNG, and JPG. Keep LaTeX copy available in the editor toolbar.
- Formula image exports must preserve the active KaTeX or MathJax rendering and produce non-empty image content.
- SVG and PNG formula exports must keep transparent backgrounds; JPG uses a white background.
- The LaTeX Source toolbar must keep an Environment menu with none, eqnarray, align, aligned, gathered, cases, split, and array.
- Environment selection must wrap selected editor content; `none` must remove an existing wrapper when present.
- Quick-tool and formula-template categories must use the same responsive block-card layout.
- Category content opens only on hover and uses a blue hover state. Do not restore click-to-expand or click-to-select category state.
- Interface text-size presets are 90, 100, 110, 140, and 160 percent, independent from the LaTeX editor font size.
- The web and extension settings surfaces must both expose the KaTeX/MathJax 4 renderer choice and persist it without changing the default KaTeX behaviour.

## Engineering rules

- Use TypeScript for frontend code; do not introduce `any` without a narrow reason.
- Add accessible names to icon-only controls.
- Preserve keyboard focus, reduced-motion support, and responsive behaviour.
- New dependencies require a short rationale in the active task or a decision record.
- Do not commit `.env.local`, API tokens, uploaded images, generated extension profiles, or release ZIPs.
- Keep `LICENSE`, `NOTICE`, `THIRD_PARTY_NOTICES.md`, `PRIVACY.md`, `SECURITY.md`, and `CONTRIBUTING.md` current when distribution or permissions change.
- Validate image signatures in both server and direct-extension paths.
- Add tests whenever extraction, provider state mapping, category interaction, layout, or output formatting changes.
- Keep the product UI free of fake success states: only show “done” after a real response or mock provider response.
- Keep web and extension surfaces working from the same source tree.

## Agent workflow

1. Inspect Git status and the task board.
2. Make the smallest coherent change that completes one task.
3. Update `.agents/tasks/backlog.yaml` as work advances.
4. Add or update tests and run `npm run verify`.
5. For extension changes, also run `npm run smoke:extension`.
6. Update `.agents/architecture.md` if boundaries change.
7. Add a decision record for architecture or provider changes.
8. Use `.agents/templates/handoff.md` for multi-turn or multi-agent handoffs.

## Definition of done

A task is done only when:

- Acceptance criteria are met.
- TypeScript and tests pass.
- Web and extension production builds succeed.
- Desktop, mobile, and 480px extension side-panel layouts were checked when UI changed.
- Error and loading states are handled.
- Secrets and uploaded content remain protected.
- Agent state files reflect the actual implementation.

## Current known boundary

The web app provides quick tools, templates, editing, and preview without image upload. MinerU OCR is available only in the Manifest V3 extension, where the user configures their own API key in extension storage. A generated test formula has passed real extension-side OCR, signed upload, polling, ZIP download, extraction, and rendering. Chrome Web Store registration and public listing are still not completed.
