# Record checks for the quality desk

Checked 17 October 2026. These are operational prompts for a human reviewer, not legal certification. Service reviews contain personal information about staff and often customers. Do not import more content than needed.

| Rule | Check | Basis |
|---|---|---|
| PRIVACY-PURPOSE | A conversation has a stated purpose | [NZ privacy principle 1](https://www.privacy.org.nz/privacy-principles/1/). A nonblank field is a record check, not proof the purpose is lawful. |
| PRIVACY-RETENTION | Missing or reached retention review date | [NZ privacy principle 9](https://www.privacy.org.nz/privacy-principles/9/). The operator chooses a date appropriate to the purpose. No universal legal retention duration is encoded. |
| ACCURACY-APPEAL | An assessment remains disputed | [NZ privacy principle 8](https://www.privacy.org.nz/privacy-principles/8/) requires reasonable accuracy checks before use or disclosure. Excluding unresolved disputes is this project's implementation choice. |
| REVIEW-EVIDENCE | Source evidence reference is absent | Internal quality rule supporting review traceability. No law prescribes this field. |
| CRITICAL-COACHING | A critical production failure has no open coaching action | Internal quality rule. A resolved action does not erase the failure; the operator reviews whether another action is necessary. |

Independent review, weighted criteria, N/A handling, calibration separation and independent appeal decisions are internal controls, not claims of legal requirements. They prevent avoidable record errors but do not judge fairness, employment law, surveillance permissions or adequacy of consent.

Purpose and retention checks currently cover the local conversation register. Imported archives and audit logs also contain personal information and need an operator-managed retention schedule, access rules and backup lifecycle. Retention prompts do not delete anything automatically. Apply lawful disposal through an approved, tested maintenance process, including copies and backups.

For Australia, assess applicability of the [Australian Privacy Principles](https://www.oaic.gov.au/privacy/australian-privacy-principles), especially APP 10 accuracy and APP 11 security and disposal. Coverage and exceptions depend on the organisation and records. No jurisdiction-specific legal certification is provided by these checks.

The local owner has full database access. Generic roles are blocked by row security. A shared deployment needs an agreed authenticated access model, least privilege, backups and controls for source evidence. An actor string is not proof of the person's identity. A human reviews source evidence before relying on any score.
