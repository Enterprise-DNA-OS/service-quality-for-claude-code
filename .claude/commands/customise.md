---
description: "Make the quality desk fit the business"
---

# Make the quality desk fit the business

Read CLAUDE.md, docs/cli.md and the current migrations. Identify the field, scorecard rule or wording the operator wants changed. Explain its effect on existing evidence. Write a new numbered migration and update the CLI allowlist, docs and relevant tests. Apply with npm run migrate and run npm test, npm run view and npm run docs.

Never edit an applied migration or silently rewrite final reviews. Used scorecards are locked: create a fresh scorecard version with its criteria, then use it for future assessments. Do not change historical scores to make a new rule look like the old rule. Back up the real database before applying approved changes. Keep all sends as drafts.
