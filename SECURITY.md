# Security Policy

## Supported versions

Security fixes are supported for the latest `0.4.x` release and the current default branch.

## Reporting a vulnerability

Please report security issues privately through GitHub Security Advisories for this repository when available. If private reporting is unavailable, contact the maintainers through a non-public channel listed on the repository profile.

Do not open a public issue containing:

- a MinerU or other API token,
- a signed upload URL,
- a private image,
- personal or account data,
- a reproducible exploit against a real deployment.

## Sensitive data handling

- Web-mode MinerU tokens belong in server environment variables, never `VITE_*` variables.
- Extension tokens belong only in `chrome.storage.local`.
- Tokens must not be logged, included in screenshots, committed, or packaged.
- `npm run verify` includes package checks intended to catch accidental token inclusion.
- If a token was committed, rotate it first, then remove it from Git history. Deleting only the latest file is not sufficient.

## Extension security model

- The extension does not request access to websites, active tabs, or content scripts.
- Host permissions are limited to MinerU API, upload, and result-download infrastructure.
- The side panel is a privileged extension page.
- MinerU API calls, signed uploads, and ZIP downloads are proxied through the extension service worker.
- Declarative Net Request rules remove `Origin` and `Referer` only for MinerU API, Aliyun upload, and OpenXLab result infrastructure.
- DNR rules must not be broadened to unrelated websites without security review.

## Out of scope

- MinerU service accuracy, availability, quotas, and provider-side data handling.
- Browser vulnerabilities or compromised browser profiles.
- Users deliberately exposing their own tokens through local tooling or screenshots.
- Third-party websites where the extension is used.

## Disclosure

Maintainers will make a best-effort assessment, coordinate a fix, and credit reporters when appropriate and desired.
