# Changelog

All notable changes to this project are documented here.

The format follows Keep a Changelog, and the project uses semantic versioning.

## [Unreleased]

### Changed

- Replaced the developer-oriented root README with a user-facing English GitHub introduction and added a matching Chinese guide in `README_ZH.md`.

## [0.8.2] - 2026-11-03

### Fixed

- Separate quick-tool display previews from caret-insertion LaTeX so empty superscript, subscript, root, fraction, and bracket skeletons no longer appear as blank cards.
- Scale each quick-tool formula independently to fit its card under both KaTeX and MathJax 4.
- Make all quick-tool IDs unique so Recently Used cannot resolve to a different formula with the same ID.
- Make the per-mille tool portable across both renderers.
- Correct the nabla label, incomplete power-integral/Jensen/Hölder formulas, and the equilibrium-constant formula.
- Add explicit formula-data validation that infinity tools use `\infty` and that `\inf` is reserved for the infimum tool.
- Add a permanent dual-renderer audit for all 284 quick tools and 60 templates.
- Updated the extension manifest to version 0.8.2.

### Verified

- `npm run verify` passes.
- `npm run smoke` passes with visible, fitted root/subscript/integral/large-operator previews and unchanged insertion source.
- `npm run smoke:extension` passes with the shared fitted quick-tool previews.

## [0.8.1] - 2026-11-03

### Changed

- MathJax 4 is now the default renderer for new installations and missing/migrated renderer preferences.
- KaTeX remains available as the lighter synchronous option, and explicitly saved KaTeX preferences are preserved.
- Updated the web and extension settings labels, option order, tests, documentation, and screenshots for the new default.
- Updated the extension manifest to version 0.8.1.

### Verified

- `npm run verify` passes.
- Web regression verifies a fresh profile selects MathJax 4 by default, while an explicit KaTeX preference still renders through KaTeX.
- Extension regression verifies legacy settings without a renderer migrate to MathJax 4 and can still switch to and from KaTeX in the full options page.

## [0.8.0] - 2026-11-03

### Added

- Added MathJax 4 as an opt-in SVG formula renderer for multi-line LaTeX.
- Added a Formula renderer selector to the simple web settings dialog and the full extension settings page.
- Added KaTeX and MathJax regression coverage for multi-line `eqnarray` output, preference persistence, local asset loading, and image export.

### Changed

- KaTeX remains the default renderer, preserving existing saved preferences and startup cost.
- MathJax loads only after the user selects it.
- MathJax scripts, NewCM font data, and dynamic glyph modules are packaged locally; the renderer does not use a CDN or add extension host permissions.
- Formula image export continues to work with the active renderer, including transparent PNG/SVG and white-background JPG output.
- Updated the extension manifest to version 0.8.0.

### Verified

- `npm run verify` passes.
- Web regression confirms MathJax multi-line rows, one-time lazy loading, local-only requests, persisted renderer selection, and non-empty transparent PNG export.
- Extension regression confirms the detailed setting read/write path, side-panel MathJax rendering, local packaged fonts under extension CSP, and PNG export.

## [0.7.0] - 2026-11-03

### Added

- PNG and SVG formula exports now use transparent backgrounds; JPG remains white.
- Added an Environment menu to the LaTeX Source toolbar.
- Environment options include none, eqnarray, align, aligned, gathered, cases, split, and array.
- Selected source can be wrapped in an environment, empty environments place the caret inside, and none removes an existing wrapper.
- The environment menu uses a viewport-aware floating portal so it is not clipped by the workspace card.

### Changed

- Image rendering remains on demand through `html2canvas`.
- Updated the extension manifest to version 0.7.0.

### Verified

- `npm run verify` passes.
- Web regression confirms transparent PNG pixels, JPG white background, selected-content wrapping, none-unwrapping, array insertion, and all eight menu options.
- Extension regression confirms the Environment menu and PNG export remain available in the side panel.

## [0.6.0] - 2026-11-03

### Added

- Replaced the output-card Copy LaTeX action with an Output image menu.
- Added SVG, PNG, and JPG formula downloads in both the web workspace and browser extension.
- Added high-resolution DOM rendering with a consistent white background for SVG, PNG, and JPG exports.
- Added download success and failure feedback.

### Changed

- Kept LaTeX copy functionality in the editor toolbar.
- Added responsive export-menu behavior for desktop and mobile layouts.
- Updated the extension manifest to version 0.6.0.

### Verified

- `npm run verify` passes.
- Browser regression downloads all three formats.
- SVG contains an embedded rendered image; PNG and JPG signatures and visible formula pixels are validated.
- Extension regression confirms PNG download from the side panel.
## [0.5.0] - 2026-11-03

### Changed

- The public web Image recognition tab now explains that OCR is available only in the browser extension.
- The web page no longer renders an OCR upload tool, reads image files, checks OCR health, or calls OCR endpoints.
- The replacement panel explains extension installation, configuring a personal MinerU API key, and recognizing images from the side panel.
- Website hero, feature cards, metadata, privacy policy, documentation, and tests now reflect the extension-only OCR boundary.
- Updated the extension manifest to version 0.5.0.

### Verified

- `npm run verify` passes.
- Web regression confirms the OCR tab shows extension guidance with no file input or upload dropzone.
- Extension-side MinerU OCR implementation remains available.
- Existing quick-tool, template, editor, preview, responsive-layout, and extension regressions pass.

## [0.4.1] - 2026-11-03

### Changed

- The web workspace now stacks the input and output cards vertically at every viewport width.
- Wide formulas now use horizontal scrolling inside the output preview instead of overflowing or spreading beyond the card.
- Vertical output growth remains content-driven; the preview does not introduce a vertical scrollbar.
- Updated the extension manifest to version 0.4.1.

### Verified

- `npm run verify` passes.
- Web regression confirms a one-column workspace with the output below the input.
- Web regression renders a 64-term formula and confirms horizontal overflow plus successful scrolling.
- Existing mobile, hover, typography, OCR, dark-theme, and extension regressions pass.

## [0.4.0] - 2026-11-03

### Removed

- Removed the side-panel “insert LaTeX into the current page” feature and its settings UI.
- Removed active-page insertion runtime code, content script, insertion-format setting, website host permissions, and related browser permissions.
- Removed click-to-expand and click-to-select behavior from quick-tool and formula-template category cards.
- Removed the internal scrollbar from the output preview.

### Changed

- Category cards now turn blue on hover and open their content preview only while hovered.
- Category cards widen with the interface text scale and wrap into additional rows instead of clipping large labels.
- Added 140% large and 160% extra-large interface text presets.
- The output preview now grows with its content and the surrounding page flow.
- Updated the extension manifest to version 0.4.0.

### Verified

- `npm run verify` passes.
- Web and extension browser regressions pass with hover-only categories.
- Extension options and side panel render at 140% interface text with an independent 18 px editor font.
- Extension manifest, packaged files, and background worker contain no active-page insertion path or webpage host access.

## [0.3.1] - 2026-11-02

### Fixed

- The extension Settings button now always opens simple preferences; detailed settings are available only through the explicit full-settings link.
- Page insertion now detects missing site access, shows a clear permission prompt, requests access for the active origin, and retries insertion after approval.
- Formula-template categories now use the same responsive block-card grid and hover preview behavior as quick-tool categories.
- Tool content uses content-driven height, removing the nested vertical scrollbar from the tools panel.
- Interface text size is now configurable independently from the LaTeX editor font size.

### Changed

- Added an optional host-permission request flow without introducing static broad host access.
- Added interface scale presets at 90%, 100%, and 110% in simple preferences and detailed extension options.
- Bumped the extension manifest to version 0.3.1.

### Verified

- `npm run verify` passes.
- Web and 480 px extension browser regressions pass.
- The extension smoke test confirms repeated simple-settings entry, two-column quick/template category grids, 110% interface scale with an independent 18 px editor, and no internal tool-panel scrollbar.
- Site-access detection and the permission prompt are covered by the extension browser regression; the browser-owned grant dialog still requires a final headed-browser approval check.

## [0.3.0] - 2026-11-02

### Added

- Interface language selector with Chinese and English UI.
- English translations for formula categories, formula templates, quick-tool groups, OCR states, and core controls.
- Configurable LaTeX editor font size from 10 to 24 px.
- In-app interface settings dialog available in the web application and extension side panel.
- `uiLocale` and `editorFontSize` fields in extension-local settings.

### Changed

- Quick-tool categories now use responsive block cards with automatic multi-row wrapping.
- Hovering a quick-tool or formula-template category opens a shared interactive preview flyout.
- Clicking a category still provides pinned expansion or selection for touch and keyboard users.
- The extension complete-settings page is fully bilingual.
- The options page now separates interface language from MinerU OCR language.

### Verified

- Extension smoke test runs in English at 18 px and confirms at least two category columns at 480 px.
- Web smoke test switches from Chinese to English through the settings dialog and verifies the editor font size.

## [0.2.0] - 2026-11-02

### Changed

- Renamed the project and browser extension from LaTeX Studio to FormulaDock.
- Renamed the package to `formuladock` and the release artifact to `formuladock-extension-v<version>.zip`.
- Renamed extension message namespaces and page-agent globals to the FormulaDock namespace.
- Added automatic migration from legacy `latexlive-studio:*` browser storage keys.
- Updated screenshots, branding, notices, documentation, and tests for the new name.

### Verified

- Legacy extension settings migrate to `formuladock:extension-settings` without losing the MinerU token.
- Web and extension builds pass with FormulaDock branding.

## [0.1.1] - 2026-11-02

### Fixed

- Improved extension MinerU ZIP download reliability.
- Allowed MinerU result downloads from Aliyun and OpenXLab infrastructure subdomains.
- Added three attempts for transient download failures.
- Added a 60-second timeout per download attempt.
- Added sanitized hostname and failure-reason diagnostics for download errors.
- Preserved Token isolation in the extension service worker and `chrome.storage.local`.

### Verified

- Real MinerU OCR from the extension completed upload, polling, ZIP extraction, and rendering.
- Extension load smoke test passed at a 480px side-panel width.
- Web browser smoke test passed with an isolated Mock API server.

## [0.1.0] - 2026-11-02

### Added

- React, Vite, TypeScript formula workspace.
- Ten quick-tool categories with search and recent items.
- Ten formula-template categories with 60 searchable templates.
- KaTeX live rendering.
- MinerU image recognition for the web application and browser extension.
- Manifest V3 side panel extension for Chrome and Edge 116+.
- Active-page LaTeX insertion for textarea, text input, and contenteditable targets.
- Extension options for MinerU Token, model, language, and insertion format.
- Dark theme and responsive layouts.
- Unit, content-script, browser smoke, and live MinerU verification tooling.
