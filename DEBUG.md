GET /api/maintenance?overdue=true 200 in 35226ms
Error: Failed query: select "id", "tenantId", "title", "content", "author", "priority", "targetFilter", "targetRoles", "resourceId", "createdAt", "updatedAt", "expiresAt", "deletedAt" from "Announcement" where ("Announcement"."tenantId" = $1 and "Announcement"."deletedAt" is null and "Announcement"."priority" = $2) order by CASE "Announcement"."priority"
WHEN 'urgent' THEN 0
WHEN 'high' THEN 1
WHEN 'normal' THEN 2
WHEN 'low' THEN 3
ELSE 4 END, "Announcement"."createdAt" desc limit $3
params: 1b5470e2-d57b-40f6-b4ae-ad1535b08a60,urgent,50
at async eval (src/app/api/announcements/route.ts:114:29)
112 | const limit = limitParam ? Math.min(parseInt(limitParam, 10) || 50, 200) : undefined;
113 |

> 114 | const announcementItems = await db

      |                             ^

115 | .select()
116 | .from(announcements)
117 | .where(and(...conditions)) {
query: 'select "id", "tenantId", "title", "content", "author", "priority", "targetFilter", "targetRoles", "resourceId", "createdAt", "updatedAt", "expiresAt", "deletedAt" from "Announcement" where ("Announcement"."tenantId" = $1 and "Announcement"."deletedAt" is null and "Announcement"."priority" = $2) order by CASE "Announcement"."priority"\n' +
" WHEN 'urgent' THEN 0\n" +
" WHEN 'high' THEN 1\n" +
" WHEN 'normal' THEN 2\n" +
" WHEN 'low' THEN 3\n" +
' ELSE 4 END, "Announcement"."createdAt" desc limit $3',
params: [Array],
[cause]: error: (EMAXCONNSESSION) max clients reached in session mode - max clients are limited to pool_size: 15
at async eval (src/app/api/announcements/route.ts:114:29)
112 | const limit = limitParam ? Math.min(parseInt(limitParam, 10) || 50, 200) : undefined;
113 |

> 114 | const announcementItems = await db

        |                             ^
    115 |     .select()
    116 |     .from(announcements)
    117 |     .where(and(...conditions)) {
    length: 117,
    severity: 'FATAL',
    code: 'XX000',
    detail: undefined,
    hint: undefined,
    position: undefined,
    internalPosition: undefined,
    internalQuery: undefined,
    where: undefined,
    schema: undefined,
    table: undefined,
    column: undefined,
    dataType: undefined,
    constraint: undefined,
    file: undefined,
    line: undefined,
    routine: undefined

}
}
GET /api/announcements?priority=urgent 500 in 35733ms
GET /api/announcements?limit=5 200 in 35776ms
GET /api/announcements?limit=5&priority=normal 200 in 29983ms
GET /api/events?upcoming=true&limit=5 200 in 36025ms
○ Compiling /api/users/[id] ...
GET /api/bookings?date=today 200 in 36971ms
✓ Compiled /api/users/[id] in 4s (5857 modules)
✓ Compiled (5859 modules)
GET /api/maintenance?limit=5&scope=mine 200 in 13314ms
