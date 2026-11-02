# Privacy Policy

Last updated: 2026-11-02

This policy describes the privacy behaviour of the open-source FormulaDock web application and browser extension. A deployer that hosts a public version must adapt this policy with their own identity, contact details, and infrastructure information.

## Data processed by the extension

### Formula images

When the user explicitly starts MinerU recognition, the selected image is sent to the MinerU precise parsing API through the extension service worker. The extension does not write the image to disk or a database.

### MinerU API token

The extension stores the MinerU API token in `chrome.storage.local`. The token is read by extension pages and the extension service worker and is sent only to MinerU as an authorization header. It is never sent to page scripts, written to project source, or included in the packaged extension.

### Page insertion

The content script tracks the currently focused editable element and caret in page memory so that the user can insert LaTeX into that page. It does not persist page content or transmit it to the extension developer.

### Local preferences

The extension stores the MinerU model, OCR language, insertion format, interface language, and editor font size in `chrome.storage.local`. The web application stores theme, interface language, editor font size, and recent-tool preferences in browser local storage.

## Data processed by the self-hosted web application

When the web application is run in live mode, the Node API service receives the uploaded image in memory and sends it to MinerU. The service does not persist uploaded images or recognition results. The MinerU token is read from the server environment and is not returned to the browser.

## Third parties

MinerU processes images and returns recognition results. Use of MinerU is subject to MinerU's own terms and privacy policy. The open-source project does not operate a public MinerU proxy or analytics service.

## Analytics and accounts

The open-source project does not include analytics, advertising, telemetry, user accounts, or remote logging.

## Data retention and deletion

- Images are processed transiently and are not retained by the project code.
- Remove the MinerU token from the extension options at any time.
- Uninstalling the extension removes its `chrome.storage.local` data according to the browser's behaviour.
- For a self-hosted deployment, remove `.env.local` and provider logs according to the operator's policy.

## Browser permissions

The extension requests permissions only for:

- activating page insertion after an explicit toolbar or keyboard action,
- reading the active tab URL to identify the exact site for which optional access is requested,
- requesting optional site access when the current tab was not already authorized,
- opening and rendering the side panel,
- storing local settings,
- contacting the three MinerU infrastructure URL patterns used for API access, signed uploads, and result downloads,
- narrowly modifying browser-generated `Origin`/`Referer` headers for those MinerU endpoints, which reject page-origin requests.

## Contact

Use the repository's security reporting mechanism for sensitive matters. Do not post API tokens, private images, or other credentials in public issues.
