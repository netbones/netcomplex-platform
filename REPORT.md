# Route Pass criteria

1 /admin (desktop ≥ md) SpaceLauncher shows 5 spaces; "Admin" highlighted [x]
2 /admin/users Same launcher; active = admin [x]
3 /admin/requests Same launcher; active = admin; AdminLayer table fits [x]
4 /admin (mobile < md) MobileSpaceBar at bottom; "Admin" highlighted [x]
5 /admin/users (mobile) Same mobile bar [x]
6 /admin/requests (mobile) Same mobile bar [x]
7 /admin/surveys/[id]/edit (desktop) Launcher present; TipTap toolbar does not collide with collapsed sidebar [x]
8 /admin/surveys/[id]/preview (desktop) Launcher present OR full-screen takes over (decide if opt-out needed) [View link takes us to Results, not Preview. If we manually enter url eg, http://localhost:3000/admin/surveys/d00c210c-8caa-4336-9746-876d05150e2a/preview, we see spacelauncher, if we go to results, http://localhost:3000/admin/surveys/d00c210c-8caa-4336-9746-876d05150e2a, we see spacelauncher,

8.1 but we also getting intermittant network errors during this check:

```

2026-06-05T10:54:47.984Z ERROR [Better Auth]: INTERNAL_SERVER_ERROR Error: Failed query: select "id", "tenantId", "expiresAt", "token", "createdAt", "updatedAt", "ipAddress", "userAgent", "userId", "activeOrganizationId", "impersonatedBy" from "session" where "session"."token" = $1
params: IiFhm7EneMcKfP2Uh4pSjBUqMlgmdUao
at async getSessionAndRole (src/shared/api/auth-utils.ts:44:19)
at async requireAnyPermission (src/shared/api/auth-utils.ts:212:20)
at async GET (src/app/api/admin/urgency/route.ts:22:23)
42 | \*/
43 | export async function getSessionAndRole(request?: Request): Promise<SessionAndRole | null> {

> 44 | const session = await auth.api.getSession({

     |                   ^

45 | headers: request?.headers ?? (await headers()),
46 | });
47 | {
query: 'select "id", "tenantId", "expiresAt", "token", "createdAt", "updatedAt", "ipAddress", "userAgent", "userId", "activeOrganizationId", "impersonatedBy" from "session" where "session"."token" = $1',
params: [Array],
[cause]: Error: timeout exceeded when trying to connect
at async getSessionAndRole (src/shared/api/auth-utils.ts:44:19)
at async requireAnyPermission (src/shared/api/auth-utils.ts:212:20)
at async GET (src/app/api/admin/urgency/route.ts:22:23)
42 | \*/
43 | export async function getSessionAndRole(request?: Request): Promise<SessionAndRole | null> {

> 44 | const session = await auth.api.getSession({

       |                   ^
    45 |     headers: request?.headers ?? (await headers()),
    46 |   });
    47 |

}]
```

9 /admin/announcements Active = admin; layer fits [x] (No announcements yet, check if we do have in db)
10 /dashboard (desktop) Launcher present; no regression vs old layout; active = home [x]
11 /dashboard/services Active = services; no regression [x]
12 /dashboard/messages Active = messages; no regression [x]
13 /dashboard/community Active = community; no regression [x]
14 /dashboard (mobile) MobileSpaceBar present; no regression [x]

14.1 we noticed the following:

```

(## Error Type
Console Error

## Error Message

{} {} "Failed to fetch content stats: content.filter is not a function"

    at logError (src/shared/lib/logging.ts:42:7)
    at fetchContentStats (src/widgets/admin/ui/AdminContentWidget.tsx:41:17)
    at async*AdminContentWidget.useEffect (src/widgets/admin/ui/AdminContentWidget.tsx:51:5)

## Code Frame

40 | ? defaultLogger.child({ component: context.component })
41 | : defaultLogger;

> 42 | log.error(

     |       ^

43 | { ...context, error: error instanceof Error ? error.message : error },
44 | formatMessage(message, error)
45 | );

Next.js version: 15.5.18 (Webpack)
)
```

15 Non-ADMIN user (RESIDENT) at /admin No chrome (redirect or 403) — must NOT show admin chrome to non-admins [x]
