# FormulaDock Browser Extension

Manifest V3 extension for Chrome / Edge 116+.

## Develop

```powershell
npm install
npm run build:extension
```

Outputs:

- `extension-dist/` — load unpacked for local testing.
- `release/formuladock-extension-v0.8.0.zip` — upload/package artifact.

## Install locally

1. Open `chrome://extensions` or `edge://extensions`.
2. Enable Developer mode.
3. Choose **Load unpacked**.
4. Select `extension-dist/`.
5. Open the extension settings and enter a MinerU API token.
6. Open the side panel and use quick tools, formula templates, or image recognition.
7. Use `Ctrl+Shift+L` / `Command+Shift+L` to open the side panel at any time.

## Architecture

- `manifest.json`: MV3 declaration, side-panel permissions, and options entry points.
- `background.js`: toolbar/command handling and MinerU network proxying.
- `options.html/js/css`: local MinerU, interface, renderer, and editor settings.
- `sidepanel.html` in the built output: the React application.
- `icons/`: generated PNG icons for toolbar and store listing.

## Network path

- Side panel → background Service Worker → MinerU API.
- Signed image uploads and ZIP downloads are proxied through the background.
- Narrow DNR rules remove `Origin`/`Referer` only for:
  - `mineru.net/api/v4/*`
  - `*.aliyuncs.com/*`
  - `*.openxlab.org.cn/*`
- This avoids MinerU/OSS browser-origin 403 responses while keeping permissions limited to MinerU infrastructure.

## Security

- The extension stores the MinerU token in `chrome.storage.local`.
- The token is never bundled into the ZIP and never logged.
- Direct MinerU mode is intended for personal or internal installations.
- A public consumer release should proxy OCR through a controlled backend so end users do not provide their own API token.
- Images are not written to disk or persisted by the extension.
- The extension package validator scans built files for the configured local MinerU token.

## Verification

```powershell
npm run verify:extension
npm run smoke:extension
npm test
```

`smoke:extension` loads the built extension into Playwright-controlled Edge, validates the side panel and options page, checks responsive layout and large interface text, exercises both KaTeX and MathJax 4 setting paths, verifies MathJax multi-line rendering and PNG export under the extension CSP, and confirms that category click-expansion and page-insertion UI are absent.



## License

The extension source and packaged build are distributed under the Apache License 2.0. See `LICENSE`, `NOTICE`, and `THIRD_PARTY_NOTICES.md`.


## Interface preferences

The settings page supports Chinese and English interfaces, a KaTeX/MathJax 4 formula-renderer choice, 90/100/110/140/160% interface text-size presets, and an independent 10–24 px LaTeX editor font size. These values are stored with the extension settings and applied to the side panel immediately after saving. KaTeX remains the default. Output formulas grow vertically with their content and use horizontal scrolling only when wider than the preview.

## Category hover previews

Both quick-tool and formula-template categories open a shared blue-highlighted preview flyout on hover. Categories are not expandable or selectable by click; users insert items directly from the hover panel or search results.

## Formula image export

The Output card provides an Output image menu for `.svg`, `.png`, and `.jpg` downloads. Exports use the active KaTeX or MathJax renderer. SVG and PNG use transparent backgrounds; JPG uses a white background. Copy LaTeX remains available from the editor toolbar. The source toolbar includes an Environment menu for wrapping selected content in common LaTeX environments.

## Formula rendering

- KaTeX remains the default renderer and keeps the existing lightweight startup path.
- MathJax 4 is opt-in from the simple settings dialog or the full extension options page.
- MathJax uses SVG output, is loaded only when selected, and remains active for the session through the saved extension setting.
- The MathJax component, NewCM font data, and dynamic glyph scripts are packaged locally. The extension does not load MathJax from a CDN and does not request additional host permissions.
- MathJax's audio/SRE enrichment path is disabled because its separate worker/mathmap runtime is not bundled; formula markup keeps the raw LaTeX accessible name instead.
