---
description: "Add a read-only report"
---

# Add a read-only report

Read views.json and the existing v_* views. Clarify the business question and who will read it. Add a SELECT-only report to views.json, using existing views where possible. If a new view is needed, write a numbered migration with security_invoker=true. Keep brand.json and the shared renderer. Run npm run migrate, npm run view and npm test. Open the resulting HTML and check it. Do not add a server, write controls or a second CLI.
