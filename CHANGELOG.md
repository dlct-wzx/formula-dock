# Changelog

All notable changes to this project are documented here.

The format follows Keep a Changelog, and the project uses semantic versioning.

## [Unreleased]

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
