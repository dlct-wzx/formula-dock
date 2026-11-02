# Pull Request

## Summary

Describe the problem and the implemented change.

## Verification

- [ ] `npm run verify`
- [ ] `npm run smoke` when web UI changed
- [ ] `npm run smoke:extension` when extension UI, manifest, messaging, or permissions changed
- [ ] `npm run smoke:extension:live` when the MinerU network path changed

## Checklist

- [ ] No tokens, signed URLs, private images, browser profiles, or generated artifacts are committed.
- [ ] Browser permission changes are documented and limited in scope.
- [ ] Tests cover the changed behaviour.
- [ ] UI changes include screenshots or a short recording.
- [ ] `.agents/tasks/backlog.yaml` and verification notes are updated when project state changed.
- [ ] The extension version was bumped when the packaged extension changed.

## Screenshots

Add screenshots for visible changes when applicable.
