# Move the manual quality desk from Zendesk QA

Checked 17 October 2026 against [Zendesk's export guide](https://developer.zendesk.com/documentation/qa/exporting-data/) and [support documentation](https://support.zendesk.com/hc/en-us/articles/7043724806810-Exporting-data-from-Zendesk-QA).

## Export first

A Zendesk QA administrator sets up the vendor's export API connection and saves the JSON response for the chosen workspace and date range. Follow the vendor guide. This application does not request, store or use the token. Ask your administrator for the saved export, not their credentials.

Collect every page identified by the export's pagination total. When metadata is supplied, incomplete or duplicate page sets are rejected. For several responses, put them in a JSON array, preserving each complete response. Use one consistent workspace label per source snapshot. Compare date range, workspace and review counts before importing. Export restrictions and retention at the vendor can limit the history available.

## One-command import of the saved export

```bash
npm run quality -- import zendesk ./imports/reviews.json --workspace=service-team --dry-run
npm run quality -- import zendesk ./imports/reviews.json --workspace=service-team --actor=Operator
```

The first command validates and rolls back all writes, including audit entries. The second imports atomically. Repeat imports of identical records do nothing. Changed historical records and duplicate review IDs are rejected. If the vendor corrects a review, reconcile the new snapshot under a clearly named new workspace label so the original is retained.

## Mapping

Each exported review becomes an imported_reviews record. The source ID is the supplied workspace label, vendor workspace ID when present, and vendor review ID. externalId stays the conversation key. Reviewer and reviewee names or email addresses, created date and vendor score have searchable columns. The raw record retains category ratings, source scorecard, review comments, tags, threads and the containing conversation's metadata and comments.

Imported scores are not recalculated and do not affect local production averages. Zendesk categories, scales and automation rules are not assumed to equal this base's scorecard rules. Create and check your local scorecard before using it for new reviews. Source conversations without reviews are counted in the import report but do not create archive rows.

No CSV review layout is claimed. The vendor's documented review export is JSON. Do not use a ticket CSV as if it were quality assessment history. Coaching sessions, appeals, complete scorecard definitions, voice transcripts and dashboard metrics need separate reconciliation. Zendesk explicitly excludes voice transcripts and dashboard metrics from this export.

## Reconcile and start

Run history and export. Compare review IDs, source scores, dates and counts with the source file. Review one complete example with its criterion ratings and comments. Set up your people and conversation register using add, then add a scorecard and criteria. Existing history remains readable while new reviews use your own standards.

Run both quality processes for a trial period. Compare scores manually where scales differ. Test calibration, appeals and coaching with your team. Keep the existing helpdesk and any needed recording system. Enterprise DNA scopes archive mapping, access controls, live connections and team screens as part of your version.

Switch-in-a-day means a saved supported export can be loaded with one command. Export permissions, pagination, reconciliation and business sign-off still take real work.
