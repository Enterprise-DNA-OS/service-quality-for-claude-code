# Service Quality for Claude Code

Your service quality reviews, calibration, appeals and coaching in a database you own. A free operator workspace for teams replacing the manual quality desk within Zendesk QA.

## Three ways to use it

**Do it yourself.** MIT licensed. Install it, try fictional records, bring a saved Zendesk QA export and adapt the scorecards. Runs with Claude Code, Codex, OpenCode or Cursor.

**We customise it.** Enterprise DNA brings your history across and builds your scorecards, coaching rules and reports. A web front end, another stack and helpdesk connections are scoped to your business. One setup fee, then a retainer.

**We run it for you.** Omni by Enterprise DNA installs, connects and operates your version with the rest of your business. One setup fee, then a monthly retainer. [Book a call](https://enterprisedna.co/omni/book?offer=replace-software&utm_campaign=zendesk-qa&utm_medium=github).

## Try it

Node 22.15 or newer. Windows, Linux or macOS. The local trial needs no database server.

```bash
npm install
npm test
npm run demo
```

Demo reports and paperwork are written under .data/demo. The database used by demo is disposable. Tests and demo never use DATABASE_URL.

For a local working copy with fictional records:

```bash
npm run migrate
npm run seed
npm run quality -- weekly-review
npm run quality -- insights --json
npm run view
npm run docs
```

Start a real empty database with migrate only. DATA_DIR selects the embedded PGlite data folder. DATABASE_URL selects PostgreSQL 15 or newer, with certificate verification for remote connections. Keep private records out of Git.

## What ships

29 slash commands cover the weekly review queue, scorecards, evidence-based ratings, calibration, coaching, appeals, native history imports, drafts and customisation. Three branded HTML reports show the week, calibration and evidence. Assessment records and coaching plans render through npm run docs. Change business name, logo and colours in brand.json.

The local score is the weighted mean of criterion scores, each divided by its own maximum, expressed out of 100. A zero on a critical criterion makes the entire review zero. N/A is permitted only on configured criteria and removes that criterion's weight. Finalisation requires every criterion and at least one applicable rating. A scorecard's criteria lock as soon as a review uses it.

Calibration is separate from production. Open appeals and upheld appeals are excluded from performance averages. An upheld appeal withdraws the original result without rewriting its evidence and returns the conversation to the review queue. A fresh reviewer or scorecard version records a replacement assessment. Coaching closure records evidence; it does not erase a critical failure.

This is a trusted operator tool, not a self-service staff portal. The actor label records who the operator says performed a write. It is not authenticated identity. Row security denies generic database roles, but the database owner can administer the records and controls. Audit entries are append-only through ordinary writes, not tamper-proof against that owner.

## Bring your Zendesk QA history

```bash
npm run quality -- import zendesk ./imports/reviews.json --workspace=service-team --dry-run
npm run quality -- import zendesk ./imports/reviews.json --workspace=service-team --actor=Operator
npm run quality -- history
npm run quality -- export
```

[The switch guide](docs/replace-zendesk-qa.md) explains how an administrator saves the native JSON export, collects all pages and compares counts. One command imports the saved export. The native source score, ratings, review comments, conversation comments and identifiers are retained. They remain historical records, separate from the local scoring system. No universal CSV review export is assumed. Voice transcripts and dashboard metrics are not included by Zendesk's export.

## Ten questions to ask today

These run in npm run quality -- insights. They join local business records beyond a single summary chart. They are not a claim that Zendesk cannot produce an equivalent custom report.

1. Which overdue conversations have no production review?
2. Which critical failures still have overdue coaching?
3. Where do reviewers disagree on the same conversation?
4. Which disputed scores are excluded from performance averages?
5. Which teams have the largest overdue review backlog?
6. Which conversation records need a retention decision?
7. Which source conversations lack purpose or evidence?
8. Which agents have both coaching due and an open appeal?
9. Which scorecard versions are driving critical failures?
10. Which coaching commitments fall due in the next week?

## Your first hour: ten things to ask for

1. Show overdue reviews with the responsible agent.
2. Compare the reviewers who scored the same conversation.
3. Read the source and assessment before drafting coaching.
4. Show the scorecards and the weight of each criterion.
5. Explain why a disputed score is absent from the performance report.
6. Draft this week's quality meeting without sending it.
7. Preview a saved Zendesk export and check its record count.
8. Put our name and logo on assessment records.
9. Add a report for team leads with /new-view.
10. Add our escalation rule through /customise and a fresh scorecard version.

## Scope and evidence

[CLI reference](docs/cli.md), [compliance checks](docs/compliance.md), [research](docs/research.md) and [why no front end](docs/why-no-front-end.md) describe the boundaries.

The base handles human-reviewed service quality operations. It does not replace ticket handling, voice recording, automatic assessment of every conversation or employee login. Enterprise DNA scopes those connections and screens in a custom version. Do not switch off a helpdesk when you replace its quality desk.

The GitHub workflow runs the test and demo on Windows and Linux and the same domain checks against PostgreSQL. npm run test:postgres requires TEST_DATABASE_URL pointing to a disposable local database.
