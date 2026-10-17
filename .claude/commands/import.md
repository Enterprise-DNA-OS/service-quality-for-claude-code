---
description: "Bring the saved Zendesk QA export into the history archive."
---

# Bring the saved Zendesk QA export into the history archive.

Run `npm run quality -- import zendesk <saved-export.json> --workspace=<source-label> --dry-run`. Add `--json` when consuming the result programmatically.

Read docs/replace-zendesk-qa.md. Preview first. Compare every page and source count. Import for real with --actor after the operator accepts the preview. Preserve native history separately from local scores. Never read or request an API token; the operator supplies the saved export.

Present the actual records with dates and names. If a reference is ambiguous, show the candidates and ask the operator to choose. Never send, invent evidence or silently change a record. Drafts stay in drafts/.
