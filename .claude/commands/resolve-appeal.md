---
description: "Record an independent appeal decision."
---

# Record an independent appeal decision.

Run `npm run quality -- resolve-appeal <appeal> --status=upheld|rejected --decision=<reason> --decider=<person> --actor=<operator>`. Add `--json` when consuming the result programmatically.

Read the original assessment, ratings and source evidence. The deciding person must be different from the reviewer and reviewed agent. An upheld appeal withdraws the score without rewriting it.

Present the actual records with dates and names. If a reference is ambiguous, show the candidates and ask the operator to choose. Never send, invent evidence or silently change a record. Drafts stay in drafts/.
