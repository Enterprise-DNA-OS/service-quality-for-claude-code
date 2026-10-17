# Service Quality for Claude Code

For a trusted service quality operator who reviews conversations, calibrates reviewers, follows coaching and resolves appeals. This is a database workbench. It does not send messages or decide employee performance on its own.

Read docs/cli.md before writing. Every answer starts with the CLI and current records. Read the source conversation and scorecard before assigning a score. The operator approves the assessment. Never invent transcript content, dates or evidence.

## One path for each recurring job

| Ask | Command |
|---|---|
| Show criterion weights, maxima and N/A rules | `/criteria` |
| Who works on the service and review teams? | `/people` |
| Show the conversation register. | `/conversations` |
| Show the assessment standards and versions. | `/scorecards` |
| Which conversations still need a review? | `/review-queue` |
| Show assessments, scores and disputes. | `/reviews` |
| Where do reviewers disagree? | `/calibration` |
| Which coaching commitments need attention? | `/coaching-due` |
| Show contested assessments and decisions. | `/appeals` |
| Check purpose, retention and evidence records. | `/compliance` |
| Show production results with disputes excluded. | `/performance` |
| Show imported Zendesk review history. | `/history` |
| What is overdue across reviews, coaching and appeals? | `/attention` |
| Prepare the Monday quality meeting. | `/weekly-review` |
| Answer ten cross-record business questions. | `/insights` |
| Read one conversation and all its review evidence. | `/conversation` |
| Add an operator-approved business record. | `/add` |
| Start an independent assessment. | `/review` |
| Record a criterion score with the observed evidence. | `/rate` |
| Complete an assessment after every criterion is rated. | `/finalise-review` |
| Record the outcome of a coaching commitment. | `/close-coaching` |
| Record an independent appeal decision. | `/resolve-appeal` |
| Add a source-linked note. | `/log` |
| Draft a coaching brief from the assessment evidence. | `/draft-coaching` |
| Write the weekly meeting draft to disk. | `/draft-weekly-review` |
| Bring the saved Zendesk QA export into the history archive. | `/import` |
| Export all business records and audit history. | `/export` |
| Add a read-only report | `/new-view` |
| Change a field or business rule | `/customise` |

## Rules

- Scripts in scripts/ own reads and writes. Do not use a second CLI.
- Writes require an actor label. This label is an audit note, not authentication.
- Ambiguous references list matches and exit with an error. Ask the operator to select.
- Final reviews and ratings are immutable. Corrections use an appeal and a fresh assessment.
- Calibration scores never contribute to performance averages. Open appeals and upheld appeals are excluded too.
- Source imports preserve native scores in a separate archive. Do not combine them with local scores without explicit scale and criteria mapping.
- Drafts stay in drafts/. Nothing sends. Deletions and outward actions require explicit operator approval.
- Never put exports, credentials or real conversation content in Git. Prefer redacted references to source evidence.
- Use migrations for structural changes. Run npm test after domain changes. Never weaken a guard to make a test pass.
- Shared operation needs authentication, role design, backups and access controls. This local operator workspace does not provide those services.

The database adapter uses DATA_DIR for PGlite or DATABASE_URL for PostgreSQL. Tests and demo explicitly disable DATABASE_URL and use disposable databases. A blank production install runs migrate only, never demo seed.

Built and supported through Omni by Enterprise DNA. https://enterprisedna.co/omni/instead-of/zendesk-qa
