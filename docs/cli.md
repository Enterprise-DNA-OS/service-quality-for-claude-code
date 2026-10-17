# CLI reference

Every read accepts --json. Human output is aligned text. References accept source IDs, UUID prefixes and case-insensitive name fragments. Ambiguity prints matches and exits 1. Unknown commands, flags, extra arguments and invalid input exit 1.

- `people`: Who works on the service and review teams?
- `conversations`: Show the conversation register.
- `scorecards`: Show the assessment standards and versions.
- `review-queue`: Which conversations still need a review?
- `reviews`: Show assessments, scores and disputes.
- `calibration`: Where do reviewers disagree?
- `coaching-due`: Which coaching commitments need attention?
- `appeals`: Show contested assessments and decisions.
- `compliance`: Check purpose, retention and evidence records.
- `performance`: Show production results with disputes excluded.
- `history`: Show imported Zendesk review history.
- `attention`: What is overdue across reviews, coaching and appeals?
- `weekly-review`: Prepare the Monday quality meeting.
- `insights`: Answer ten cross-record business questions.
- `conversation <source-id-or-name>`: Read one conversation and all its review evidence.
- `add <entity> --file=<record.json> --actor=<operator>`: Add an operator-approved business record.
- `review --file=<review.json> --actor=<operator>`: Start an independent assessment.
- `rate --file=<rating.json> --actor=<operator>`: Record a criterion score with the observed evidence.
- `finalise-review <review> --actor=<operator>`: Complete an assessment after every criterion is rated.
- `close-coaching <coaching> --resolution=<observed-outcome> --actor=<operator>`: Record the outcome of a coaching commitment.
- `resolve-appeal <appeal> --status=upheld|rejected --decision=<reason> --decider=<person> --actor=<operator>`: Record an independent appeal decision.
- `log <conversation> --text=<note> --actor=<operator>`: Add a source-linked note.
- `draft-coaching <coaching>`: Draft a coaching brief from the assessment evidence.
- `draft-weekly-review`: Write the weekly meeting draft to disk.
- `import zendesk <saved-export.json> --workspace=<source-label> --dry-run`: Bring the saved Zendesk QA export into the history archive.
- `export`: Export all business records and audit history.

Prefix each with npm run quality --. Write options use --key=value. Quote values containing spaces. Writes require --actor=Name.

- `criteria`: inspect criterion weights, maxima, critical flags and N/A rules.

## Add record fields

- people: source_id, name, email, team, active.
- conversations: source_id, name, agent_id, channel (email, chat, phone, other), occurred_on, review_due, evidence, purpose, retention_review_on.
- scorecards: source_id, name, version, active.
- criteria: source_id, scorecard_id, name, weight, max_score, critical, allow_na.
- reviews: source_id, conversation_id, reviewer_id, scorecard_id, kind (production or calibration), reviewed_on, evidence.
- ratings: source_id, review_id, criterion_id, score, not_applicable, reason.
- coaching: source_id, name, review_id, owner_id, due_on.
- appeals: source_id, review_id, reason, due_on.
- notes: source_id, conversation_id, body.

Unspecified source_id is a generated UUID. Relationship fields accept the reference forms above. Dates are YYYY-MM-DD, booleans true or false. Explicit null scores require not_applicable=true and a criterion allowing N/A. Use the examples for record files. Do not leave sample evidence text in real assessments.

Finalisation requires all criteria, an active scorecard, an active independent reviewer and a valid review date. Used criteria cannot be changed. Create a fresh version to change weights or standards. The conversation's source identity, agent and evidence lock once reviewed.

An appeal is an add record, then resolve-appeal records a decision by a third person. An upheld result is withdrawn from averages. This does not alter the original assessment or score. Do not base an employment decision on an unresolved dispute.

export writes all records as JSON under exports/. It is a portable snapshot, not a tested disaster recovery restore. Use database backups for recovery. drafts, exports, imports and generated HTML are excluded from Git.
