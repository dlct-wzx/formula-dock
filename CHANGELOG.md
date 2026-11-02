# Changelog

All notable changes to this project are documented here.

The format follows Keep a Changelog, and the project uses semantic versioning.

## [Unreleased]

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
