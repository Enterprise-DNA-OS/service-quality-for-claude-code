---
description: "Record a criterion score with the observed evidence."
---

# Record a criterion score with the observed evidence.

Run `npm run quality -- rate --file=<rating.json> --actor=<operator>`. Add `--json` when consuming the result programmatically.

Read the conversation and exact scorecard version first. Record actual evidence, not an inferred assessment. A person judges the score. An actor label is not authenticated identity.

Present the actual records with dates and names. If a reference is ambiguous, show the candidates and ask the operator to choose. Never send, invent evidence or silently change a record. Drafts stay in drafts/.
