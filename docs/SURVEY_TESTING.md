1. Generally the SurveyEditor works, but there is primary issue.

Hot save/data loading between the editor and the db is wrong, we fighting to input data into some inputs, which are pushing data back and forth between the editor and the db. The correct action is to input to form state and have a save button, distinct from publish. Data is sent only upon save, preview is only available after save, survey is only published upon publish.

2. Add section: We can add a section, we can't remove it with bin icon. Renaming the section encounters the problem of live data saving, we should just input information, and save with button.

3. Questions: We can add a question but can't delete. Same behaviour occurs across most of the headings when attempting to edit, there is contention.

4. Preview

# Preview bugs out, we get a 404

In terminal: GET /admin/surveys/d00c210c-8caa-4336-9746-876d05150e2a/edit 200 in 3323ms
2026-06-03T16:48:37.692Z ERROR [Better Auth]: INTERNAL_SERVER_ERROR [Error: Failed query: select "id", "tenantId", "expiresAt", "token", "createdAt", "updatedAt", "ipAddress", "userAgent", "userId", "activeOrganizationId", "impersonatedBy" from "session" where "session"."token" = $1
params: 705sdufkFG7lczR532WaxxTRwCgxb4GF] {
query: 'select "id", "tenantId", "expiresAt", "token", "createdAt", "updatedAt", "ipAddress", "userAgent", "userId", "activeOrganizationId", "impersonatedBy" from "session" where "session"."token" = $1',
params: [Array],
[cause]: [Error: timeout exceeded when trying to connect]
}
GET /surveys/d00c210c-8caa-4336-9746-876d05150e2a 404 in 13444ms
GET /api/auth/get-session 200 in 2009ms
GET /api/flags 200 in 1965ms
GET /api/settings/contact 200 in 2117ms
GET /api/flags 200 in 454ms

In console:
[tiptap warn]: Duplicate extension names found: ['link', 'dropCursor', 'codeBlock', 'image']. This can lead to issues.

5. Returning to the /admin/surveys page:

We now see three "Untitled Survey" in DRAFT status, two with no questions (seem to have fired off to save prematurely), one with our six questions. http://localhost:3000/admin/surveys/d00c210c-8caa-4336-9746-876d05150e2a/edit (we can see it and edit)

and http://localhost:3000/admin/surveys/d00c210c-8caa-4336-9746-876d05150e2a is the responses page.

The first two are http://localhost:3000/admin/surveys/33dae24b-b087-4f2f-88e0-22de9aa7f910/edit

and
http://localhost:3000/admin/surveys/f56aa737-8548-41c5-ba75-fb561e9d0b99/edit

This suggestions another version of the problem of live loading of data, no check to avoid duplication of the survey.
