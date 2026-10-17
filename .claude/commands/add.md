---
description: "Add an operator-approved business record."
---

# Add an operator-approved business record.

Run `npm run quality -- add <entity> --file=<record.json> --actor=<operator>`. Add `--json` when consuming the result programmatically.


Present the actual records with dates and names. If a reference is ambiguous, show the candidates and ask the operator to choose. Never send, invent evidence or silently change a record. Drafts stay in drafts/.
