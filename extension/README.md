# FormulaDock Browser Extension

Manifest V3 extension for Chrome / Edge 116+.

## Develop

```powershell
npm install
npm run build:extension
```

Outputs:

- `extension-dist/` — load unpacked for local testing.
- `release/formuladock-extension-v0.3.0.zip` — upload/package artifact.

## Install locally

1. Open `chrome://extensions` or `edge://extensions`.
2. Enable Developer mode.
3. Choose **Load unpacked**.
4. Select `extension-dist/`.
5. Open the extension settings and enter a MinerU API token.
6. On a normal web page, place the caret inside an input or editable region.
7. Open the extension side panel and choose **插入网页**.

## Architecture

- `manifest.json`: MV3 declaration, permissions, side panel and options entry points.
- `background.js`: toolbar/command handling and page-insertion messaging.
- `content/page-agent.js`: remembers the page caret and inserts LaTeX into text controls or contenteditable elements.
- `options.html/js/css`: local MinerU token and insertion-format settings.
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

`smoke:extension` loads the built extension into Playwright-controlled Edge, validates the side panel and options page, and checks 480px layout.



## License

The extension source and packaged build are distributed under the Apache License 2.0. See `LICENSE`, `NOTICE`, and `THIRD_PARTY_NOTICES.md`.


## Interface preferences

The settings page supports Chinese and English interfaces plus a 10–24 px LaTeX editor font size. These values are stored with the extension settings and applied to the side panel immediately after saving.

## Category hover previews

Both quick-tool and formula-template categories open a shared preview flyout on hover. The flyout remains open while the pointer moves into it, and click actions still pin or expand content for touch and keyboard use.
