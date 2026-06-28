> soralia-village@1.0.0 typecheck /home/ubuntupunk/Projects/soralia-village
> tsc --noEmit

src/app/api/disputes/**tests**/csos-export.test.ts:318:5 - error TS2740: Type 'never[]' is missing the following properties from type '{ (arrayLength: number): { id: string; eventType: string; fromStatus: string | null; toStatus: string | null; actorId: string; note: string | null; metadata: Record<string, unknown> | null; createdAt: Date; }[]; (...items: { ...; }[]): { ...; }[]; new (arrayLength: number): { ...; }[]; new (...items: { ...; }[]): { ...': isArray, prototype, from, of, and 2 more.

318 mocks.eventsInDb = [];

```

src/app/api/disputes/**tests**/csos-export.test.ts:319:5 - error TS2740: Type 'never[]' is missing the following properties from type '{ (arrayLength: number): { id: string; fileName: string; fileType: string; fileUrl: string; uploadedBy: string; createdAt: Date; }[]; (...items: { id: string; fileName: string; fileType: string; fileUrl: string; uploadedBy: string; createdAt: Date; }[]): { ...; }[]; new (arrayLength: number): { ...; }[]; new (...ite...': isArray, prototype, from, of, and 2 more.

319 mocks.evidenceInDb = [];
```

src/app/api/disputes/**tests**/csos-export.test.ts:320:5 - error TS2740: Type 'never[]' is missing the following properties from type '{ (arrayLength: number): { id: string; senderId: string; content: string; createdAt: Date; editedAt: Date | null; }[]; (...items: { id: string; senderId: string; content: string; createdAt: Date; editedAt: Date | null; }[]): { ...; }[]; new (arrayLength: number): { ...; }[]; new (...items: { ...; }[]): { ...; }[]; ....': isArray, prototype, from, of, and 2 more.

320 mocks.messagesInDb = [];

```

src/app/api/disputes/**tests**/csos-export.test.ts:321:5 - error TS2740: Type 'never[]' is missing the following properties from type '{ (arrayLength: number): { messageId: string; originalContent: string; editedAt: Date; }[]; (...items: { messageId: string; originalContent: string; editedAt: Date; }[]): { messageId: string; originalContent: string; editedAt: Date; }[]; new (arrayLength: number): { ...; }[]; new (...items: { ...; }[]): { ...; }[]; ...': isArray, prototype, from, of, and 2 more.

321 mocks.messageVersionsInDb = [];
```

src/app/api/disputes/**tests**/csos-export.test.ts:322:5 - error TS2740: Type 'never[]' is missing the following properties from type '{ (arrayLength: number): { tenantId: string; key: string; value: string; }[]; (...items: { tenantId: string; key: string; value: string; }[]): { tenantId: string; key: string; value: string; }[]; new (arrayLength: number): { ...; }[]; new (...items: { ...; }[]): { ...; }[]; ... 5 more ...; readonly [Symbol.species]:...': isArray, prototype, from, of, and 2 more.

322 mocks.settingsInDb = [];

```

src/app/api/disputes/**tests**/csos-export.test.ts:392:5 - error TS2740: Type '{ id: string; eventType: string; fromStatus: null; toStatus: string; actorId: string; note: null; metadata: null; createdAt: Date; }[]' is missing the following properties from type '{ (arrayLength: number): { id: string; eventType: string; fromStatus: string | null; toStatus: string | null; actorId: string; note: string | null; metadata: Record<string, unknown> | null; createdAt: Date; }[]; (...items: { ...; }[]): { ...; }[]; new (arrayLength: number): { ...; }[]; new (...items: { ...; }[]): { ...': isArray, prototype, from, of, and 2 more.

392 mocks.eventsInDb = [
~~~~~~~~~~~~~~~~

src/app/api/disputes/**tests**/csos-export.test.ts:404:5 - error TS2740: Type '{ id: string; fileName: string; fileType: string; fileUrl: string; uploadedBy: string; createdAt: Date; }[]' is missing the following properties from type '{ (arrayLength: number): { id: string; fileName: string; fileType: string; fileUrl: string; uploadedBy: string; createdAt: Date; }[]; (...items: { id: string; fileName: string; fileType: string; fileUrl: string; uploadedBy: string; createdAt: Date; }[]): { ...; }[]; new (arrayLength: number): { ...; }[]; new (...ite...': isArray, prototype, from, of, and 2 more.

404 mocks.evidenceInDb = [
```

src/app/api/disputes/**tests**/csos-export.test.ts:433:5 - error TS2740: Type 'never[]' is missing the following properties from type '{ (arrayLength: number): { id: string; eventType: string; fromStatus: string | null; toStatus: string | null; actorId: string; note: string | null; metadata: Record<string, unknown> | null; createdAt: Date; }[]; (...items: { ...; }[]): { ...; }[]; new (arrayLength: number): { ...; }[]; new (...items: { ...; }[]): { ...': isArray, prototype, from, of, and 2 more.

433 mocks.eventsInDb = [];

```

src/app/api/disputes/**tests**/csos-export.test.ts:434:5 - error TS2740: Type 'never[]' is missing the following properties from type '{ (arrayLength: number): { id: string; fileName: string; fileType: string; fileUrl: string; uploadedBy: string; createdAt: Date; }[]; (...items: { id: string; fileName: string; fileType: string; fileUrl: string; uploadedBy: string; createdAt: Date; }[]): { ...; }[]; new (arrayLength: number): { ...; }[]; new (...ite...': isArray, prototype, from, of, and 2 more.

434 mocks.evidenceInDb = [];
```

src/app/api/disputes/**tests**/csos-export.test.ts:455:5 - error TS2740: Type 'never[]' is missing the following properties from type '{ (arrayLength: number): { id: string; eventType: string; fromStatus: string | null; toStatus: string | null; actorId: string; note: string | null; metadata: Record<string, unknown> | null; createdAt: Date; }[]; (...items: { ...; }[]): { ...; }[]; new (arrayLength: number): { ...; }[]; new (...items: { ...; }[]): { ...': isArray, prototype, from, of, and 2 more.

455 mocks.eventsInDb = [];

```

src/app/api/disputes/**tests**/csos-export.test.ts:456:5 - error TS2740: Type 'never[]' is missing the following properties from type '{ (arrayLength: number): { id: string; fileName: string; fileType: string; fileUrl: string; uploadedBy: string; createdAt: Date; }[]; (...items: { id: string; fileName: string; fileType: string; fileUrl: string; uploadedBy: string; createdAt: Date; }[]): { ...; }[]; new (arrayLength: number): { ...; }[]; new (...ite...': isArray, prototype, from, of, and 2 more.

456 mocks.evidenceInDb = [];
```

src/app/api/disputes/**tests**/csos-export.test.ts:482:5 - error TS2740: Type 'never[]' is missing the following properties from type '{ (arrayLength: number): { id: string; eventType: string; fromStatus: string | null; toStatus: string | null; actorId: string; note: string | null; metadata: Record<string, unknown> | null; createdAt: Date; }[]; (...items: { ...; }[]): { ...; }[]; new (arrayLength: number): { ...; }[]; new (...items: { ...; }[]): { ...': isArray, prototype, from, of, and 2 more.

482 mocks.eventsInDb = [];

```

src/app/api/disputes/**tests**/csos-export.test.ts:483:5 - error TS2740: Type 'never[]' is missing the following properties from type '{ (arrayLength: number): { id: string; fileName: string; fileType: string; fileUrl: string; uploadedBy: string; createdAt: Date; }[]; (...items: { id: string; fileName: string; fileType: string; fileUrl: string; uploadedBy: string; createdAt: Date; }[]): { ...; }[]; new (arrayLength: number): { ...; }[]; new (...ite...': isArray, prototype, from, of, and 2 more.

483 mocks.evidenceInDb = [];
```

src/app/api/disputes/**tests**/csos-export.test.ts:507:5 - error TS2740: Type 'never[]' is missing the following properties from type '{ (arrayLength: number): { id: string; eventType: string; fromStatus: string | null; toStatus: string | null; actorId: string; note: string | null; metadata: Record<string, unknown> | null; createdAt: Date; }[]; (...items: { ...; }[]): { ...; }[]; new (arrayLength: number): { ...; }[]; new (...items: { ...; }[]): { ...': isArray, prototype, from, of, and 2 more.

507 mocks.eventsInDb = [];

```

src/app/api/disputes/**tests**/csos-export.test.ts:508:5 - error TS2740: Type 'never[]' is missing the following properties from type '{ (arrayLength: number): { id: string; fileName: string; fileType: string; fileUrl: string; uploadedBy: string; createdAt: Date; }[]; (...items: { id: string; fileName: string; fileType: string; fileUrl: string; uploadedBy: string; createdAt: Date; }[]): { ...; }[]; new (arrayLength: number): { ...; }[]; new (...ite...': isArray, prototype, from, of, and 2 more.

508 mocks.evidenceInDb = [];
```

src/app/api/marketplace/webhook/route.ts:98:11 - error TS2322: Type '"FAILED"' is not assignable to type 'SQL<unknown> | "PENDING" | "COMPLETED" | "REFUNDED" | PgColumn<ColumnBaseConfig<ColumnDataType, string>, {}, {}> | undefined'.

98 paymentStatus: 'FAILED',

```

node*modules/.pnpm/drizzle-orm@0.45.2*@neondatabase+serverless@1.0.2_@opentelemetry+api@1.9.1_@prisma+clie*8f46f862f34d420848163480b670bdf2/node_modules/drizzle-orm/pg-core/query-builders/update.d.ts:28:57
28 export type PgUpdateSetSource<TTable extends PgTable> = {
~
29 [Key in keyof TTable['$inferInsert']]?: GetColumnData<TTable['*']['columns'][Key]> | SQL | PgColumn | undefined;
```

30 } & {};
~
The expected type comes from property 'paymentStatus' which is declared here on type '{ date?: SQL<unknown> | Date | PgColumn<ColumnBaseConfig<ColumnDataType, string>, {}, {}> | undefined; id?: string | SQL<unknown> | PgColumn<...> | undefined; ... 12 more ...; paymentStatus?: SQL<...> | ... 4 more ... | undefined; }'

src/app/api/v1/tenant/dwallet/**tests**/consent.test.ts:191:19 - error TS2353: Object literal may only specify known properties, and 'streamKey' does not exist in type 'Promise<{ streamKey: string; }>'.

191 { params: { streamKey: 'survey_participation' } }

```

src/app/api/v1/tenant/dwallet/consents/[streamKey]/route.ts:24:42
24 async (request: Request, { params }: { params: Promise<{ streamKey: string }> }) => {
~~~~~~
The expected type comes from property 'params' which is declared here on type '{ params: Promise<{ streamKey: string; }>; }'

src/app/api/v1/tenant/dwallet/**tests**/consent.test.ts:210:19 - error TS2353: Object literal may only specify known properties, and 'streamKey' does not exist in type 'Promise<{ streamKey: string; }>'.

210 { params: { streamKey: 'survey_participation' } }
```

src/app/api/v1/tenant/dwallet/consents/[streamKey]/route.ts:24:42
24 async (request: Request, { params }: { params: Promise<{ streamKey: string }> }) => {

```
The expected type comes from property 'params' which is declared here on type '{ params: Promise<{ streamKey: string; }>; }'

src/app/api/v1/tenant/dwallet/**tests**/consent.test.ts:219:19 - error TS2353: Object literal may only specify known properties, and 'streamKey' does not exist in type 'Promise<{ streamKey: string; }>'.

219 { params: { streamKey: 'survey_participation' } }
```

src/app/api/v1/tenant/dwallet/consents/[streamKey]/route.ts:24:42
24 async (request: Request, { params }: { params: Promise<{ streamKey: string }> }) => {

```
The expected type comes from property 'params' which is declared here on type '{ params: Promise<{ streamKey: string; }>; }'

src/app/api/v1/tenant/dwallet/**tests**/consent.test.ts:233:19 - error TS2353: Object literal may only specify known properties, and 'streamKey' does not exist in type 'Promise<{ streamKey: string; }>'.

233 { params: { streamKey: 'survey_participation' } }
```

src/app/api/v1/tenant/dwallet/consents/[streamKey]/route.ts:24:42
24 async (request: Request, { params }: { params: Promise<{ streamKey: string }> }) => {

```
The expected type comes from property 'params' which is declared here on type '{ params: Promise<{ streamKey: string; }>; }'

src/app/api/v1/tenant/dwallet/**tests**/v1-dwallet-deletion.test.ts:147:13 - error TS2339: Property 'getOrCreateWallet' does not exist on type 'typeof import("/home/ubuntupunk/Projects/soralia-village/src/entities/dwallet/index")'.

147 const { getOrCreateWallet } = await import('@entities/dwallet');
```

src/app/api/v1/tenant/dwallet/**tests**/v1-dwallet-deletion.test.ts:160:13 - error TS2339: Property 'getOrCreateWallet' does not exist on type 'typeof import("/home/ubuntupunk/Projects/soralia-village/src/entities/dwallet/index")'.

160 const { getOrCreateWallet } = await import('@entities/dwallet');

```

src/app/api/v1/tenant/dwallet/**tests**/v1-dwallet-payout.test.ts:168:13 - error TS2339: Property 'getOrCreateWallet' does not exist on type 'typeof import("/home/ubuntupunk/Projects/soralia-village/src/entities/dwallet/index")'.

168 const { getOrCreateWallet } = await import('@entities/dwallet');
```

src/entities/dispute/ui/**tests**/CSOSExportButton.test.tsx:34:5 - error TS2322: Type 'Mock<[Blob | MediaSource]>' is not assignable to type 'Mock<Procedure | Constructable>'.
Type 'Mock<[Blob | MediaSource]>' is not assignable to type 'MockInstance<Procedure | Constructable> & { (...args: any[]): any; new (...args: any[]): any; } & {}'.
Type 'Mock<[Blob | MediaSource]>' is not assignable to type 'MockInstance<Procedure | Constructable>'.
Types of property 'mock' are incompatible.
Type 'MockContext<[Blob | MediaSource]>' is not assignable to type 'MockContext<Procedure | Constructable>'.
Type '[Blob | MediaSource]' is not assignable to type 'Procedure | Constructable'.

34 mockCreateObjectURL = vi.fn<[Blob | MediaSource], string>(() => 'blob:mock-url-test');

```

src/entities/dispute/ui/**tests**/CSOSExportButton.test.tsx:34:33 - error TS2558: Expected 0-1 type arguments, but got 2.

34 mockCreateObjectURL = vi.fn<[Blob | MediaSource], string>(() => 'blob:mock-url-test');
```

src/entities/dispute/ui/**tests**/CSOSExportButton.test.tsx:35:5 - error TS2322: Type 'Mock<[string]>' is not assignable to type 'Mock<Procedure | Constructable>'.
Type 'Mock<[string]>' is not assignable to type 'MockInstance<Procedure | Constructable> & { (...args: any[]): any; new (...args: any[]): any; } & {}'.
Type 'Mock<[string]>' is not assignable to type 'MockInstance<Procedure | Constructable>'.
Types of property 'mock' are incompatible.
Type 'MockContext<[string]>' is not assignable to type 'MockContext<Procedure | Constructable>'.
Type '[string]' is not assignable to type 'Procedure | Constructable'.

35 mockRevokeObjectURL = vi.fn<[string], void>();

```

src/entities/dispute/ui/**tests**/CSOSExportButton.test.tsx:35:33 - error TS2558: Expected 0-1 type arguments, but got 2.

35 mockRevokeObjectURL = vi.fn<[string], void>();
~~~~~~~~~~~~~~

src/entities/tenant/**tests**/navigation-config.test.ts:11:7 - error TS2741: Property 'disputes' is missing in type '{ campaign: true; conservation: "default"; conservationExternalUrl: string; chat: true; news: true; events: true; directory: true; groups: true; services: true; resources: true; maintenance: true; ... 8 more ...; headerLinks: ("groups" | ... 2 more ... | "services")[]; }' but required in type 'PlatformPageFlags'.

11 const defaultFlags: PlatformPageFlags = {
~~~~~~~~~~~~

src/shared/lib/types/platform-page-flags.ts:32:3
32 disputes: boolean;
~~~~~~~~
'disputes' is declared here.

src/entities/tenant/api/gate/gate.test.ts:178:13 - error TS2741: Property 'disputes' is missing in type '{ campaign: true; conservation: "default"; conservationExternalUrl: string; chat: true; news: true; events: true; directory: true; groups: true; services: true; resources: true; maintenance: true; ... 8 more ...; headerLinks: ("groups" | ... 2 more ... | "services")[]; }' but required in type 'PlatformPageFlags'.

178 const sampleFlags: PlatformPageFlags = {
~~~~~~~~~~~

src/shared/lib/types/platform-page-flags.ts:32:3
32 disputes: boolean;
~~~~~~~~
'disputes' is declared here.

src/entities/tenant/api/gate/gate.test.ts:249:7 - error TS2741: Property 'disputes' is missing in type '{ campaign: true; conservation: "default"; conservationExternalUrl: string; chat: true; news: true; events: true; directory: true; groups: true; services: true; resources: true; maintenance: true; ... 8 more ...; headerLinks: ("groups" | ... 2 more ... | "services")[]; }' but required in type 'PlatformPageFlags'.

249 const ALL_FLAGS_ENABLED: PlatformPageFlags = {
~~~~~~~~~~~~~~~~~

src/shared/lib/types/platform-page-flags.ts:32:3
32 disputes: boolean;
~~~~~~~~
'disputes' is declared here.

src/features/gate/**tests**/feature-gate-client.test.tsx:23:3 - error TS2322: Type '{ campaign: boolean; conservation: "default" | "managed" | "external"; conservationExternalUrl: string; chat: boolean; news: boolean; events: boolean; directory: boolean; groups: boolean; ... 12 more ...; headerLinks: HeaderLinkId[]; }' is not assignable to type 'PlatformPageFlags'.
Types of property 'disputes' are incompatible.
Type 'boolean | undefined' is not assignable to type 'boolean'.
Type 'undefined' is not assignable to type 'boolean'.

23 return {
~~~~~~

src/server/routers/maintenance/maintenance-requests.ts:10:3 - error TS2459: Module '"./shared"' declares 'internalMaintenanceNotes' locally, but it is not exported.

10 internalMaintenanceNotes,
```

src/server/routers/maintenance/shared.ts:13:3
13 internalMaintenanceNotes,

```
'internalMaintenanceNotes' is declared here.

src/server/routers/maintenance/maintenance-requests.ts:239:23 - error TS2304: Cannot find name 'sql'.

239 isInternal: sql<boolean>`false`,
~~~

src/server/routers/maintenance/maintenance-requests.ts:259:25 - error TS2304: Cannot find name 'sql'.

259 isInternal: sql<boolean>`true`,
~~~

src/shared/lib/hooks/usePageAccess.test.ts:79:36 - error TS2345: Argument of type '{ data: { user: { id: string; role: string; email: string; }; }; }' is not assignable to parameter of type '{ data: { user: StripEmptyObjects<{ id: string; createdAt: Date; updatedAt: Date; email: string; emailVerified: boolean; name: string; image?: string | null | undefined; } & { banned: boolean | null | undefined; } & { ...; } & { ...; } & {}>; session: StripEmptyObjects<...>; } | null; isPending: boolean; isRefetchin...'.
Type '{ data: { user: { id: string; role: string; email: string; }; }; }' is missing the following properties from type '{ data: { user: StripEmptyObjects<{ id: string; createdAt: Date; updatedAt: Date; email: string; emailVerified: boolean; name: string; image?: string | null | undefined; } & { banned: boolean | null | undefined; } & { ...; } & { ...; } & {}>; session: StripEmptyObjects<...>; } | null; isPending: boolean; isRefetchin...': isPending, isRefetching, error, refetch

79 mockUseSession.mockReturnValue(makeSession());
~~~~~~~~~~~~~

src/shared/lib/hooks/usePageAccess.test.ts:255:36 - error TS2345: Argument of type '{ data: null; }' is not assignable to parameter of type '{ data: { user: StripEmptyObjects<{ id: string; createdAt: Date; updatedAt: Date; email: string; emailVerified: boolean; name: string; image?: string | null | undefined; } & { banned: boolean | null | undefined; } & { ...; } & { ...; } & {}>; session: StripEmptyObjects<...>; } | null; isPending: boolean; isRefetchin...'.
Type '{ data: null; }' is missing the following properties from type '{ data: { user: StripEmptyObjects<{ id: string; createdAt: Date; updatedAt: Date; email: string; emailVerified: boolean; name: string; image?: string | null | undefined; } & { banned: boolean | null | undefined; } & { ...; } & { ...; } & {}>; session: StripEmptyObjects<...>; } | null; isPending: boolean; isRefetchin...': isPending, isRefetching, error, refetch

255 mockUseSession.mockReturnValue({
~
256 data: null,
~~~~~~~~~~~~~~~~~
257 });
~~~~~

src/shared/lib/hooks/usePageAccess.test.ts:285:36 - error TS2345: Argument of type '{ data: { user: { id: string; role: string; email: string; }; }; }' is not assignable to parameter of type '{ data: { user: StripEmptyObjects<{ id: string; createdAt: Date; updatedAt: Date; email: string; emailVerified: boolean; name: string; image?: string | null | undefined; } & { banned: boolean | null | undefined; } & { ...; } & { ...; } & {}>; session: StripEmptyObjects<...>; } | null; isPending: boolean; isRefetchin...'.
Type '{ data: { user: { id: string; role: string; email: string; }; }; }' is missing the following properties from type '{ data: { user: StripEmptyObjects<{ id: string; createdAt: Date; updatedAt: Date; email: string; emailVerified: boolean; name: string; image?: string | null | undefined; } & { banned: boolean | null | undefined; } & { ...; } & { ...; } & {}>; session: StripEmptyObjects<...>; } | null; isPending: boolean; isRefetchin...': isPending, isRefetching, error, refetch

285 mockUseSession.mockReturnValue(makeSession());
~~~~~~~~~~~~~

src/shared/lib/hooks/usePageAccess.test.ts:303:24 - error TS2345: Argument of type '{ services: true; events: false; groups: false; surveys: false; competitions: false; news: false; }' is not assignable to parameter of type 'PlatformPageFlags'.
Type '{ services: true; events: false; groups: false; surveys: false; competitions: false; news: false; }' is missing the following properties from type 'PlatformPageFlags': campaign, conservation, conservationExternalUrl, chat, and 11 more.

303 useVisibleSpaces({
~
304 services: true,
~~~~~~~~~~~~~~~~~~~~~~~
...
309 news: false,
~~~~~~~~~~~~~~~~~~~~
310 })
~~~~~~~

src/shared/lib/hooks/usePageAccess.test.ts:333:24 - error TS2345: Argument of type '{ events: false; groups: false; surveys: false; competitions: false; news: false; }' is not assignable to parameter of type 'PlatformPageFlags'.
Type '{ events: false; groups: false; surveys: false; competitions: false; news: false; }' is missing the following properties from type 'PlatformPageFlags': campaign, conservation, conservationExternalUrl, chat, and 12 more.

333 useVisibleSpaces({
~
334 events: false,
~~~~~~~~~~~~~~~~~~~~~~
...
338 news: false,
~~~~~~~~~~~~~~~~~~~~
339 })
~~~~~~~

src/widgets/dashboard/ui/**tests**/AdminDisputesWidget.test.tsx:75:3 - error TS2593: Cannot find name 'beforeEach'. Do you need to install type definitions for a test runner? Try `npm i --save-dev @types/jest` or `npm i --save-dev @types/mocha` and then add 'jest' or 'mocha' to the types field in your tsconfig.

75 beforeEach(() => {
~~~~~~~~~~

src/widgets/dashboard/ui/**tests**/MyDisputesWidget.test.tsx:57:3 - error TS2593: Cannot find name 'beforeEach'. Do you need to install type definitions for a test runner? Try `npm i --save-dev @types/jest` or `npm i --save-dev @types/mocha` and then add 'jest' or 'mocha' to the types field in your tsconfig.

57 beforeEach(() => {
~~~~~~~~~~

Found 41 errors in 13 files.

Errors Files
15 src/app/api/disputes/**tests**/csos-export.test.ts:318
1 src/app/api/marketplace/webhook/route.ts:98
4 src/app/api/v1/tenant/dwallet/**tests**/consent.test.ts:191
2 src/app/api/v1/tenant/dwallet/**tests**/v1-dwallet-deletion.test.ts:147
1 src/app/api/v1/tenant/dwallet/**tests**/v1-dwallet-payout.test.ts:168
4 src/entities/dispute/ui/**tests**/CSOSExportButton.test.tsx:34
1 src/entities/tenant/**tests**/navigation-config.test.ts:11
2 src/entities/tenant/api/gate/gate.test.ts:178
1 src/features/gate/**tests**/feature-gate-client.test.tsx:23
3 src/server/routers/maintenance/maintenance-requests.ts:10
5 src/shared/lib/hooks/usePageAccess.test.ts:79
1 src/widgets/dashboard/ui/**tests**/AdminDisputesWidget.test.tsx:75
1 src/widgets/dashboard/ui/**tests**/MyDisputesWidget.test.tsx:
```
