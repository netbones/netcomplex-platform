# Headless/Content CMS Platform Comparison

## Feature Comparison Matrix

|Category| Payload| CMS Strapi Contentful Sanity Directus Ghost

1. Content Modeling & Schema Code-defined collections/globals with 20+ field types (text, richText, blocks, array, relationship, upload, JSON, code, point, group, tabs, join/virtual). Virtual fields compute data at query time. GUI Content-Type Builder with drag-and-drop. Supports components & dynamic zones (modular layouts). Custom fields via plugins. Web UI content types with 10+ field types. Content model templates for reuse. Visual Modeler tool. Field groups & cross-space references. JS/TS schema definitions. Document types with Portable Text blocks. Schema source-of-truth for typegen, content mapping, AI agents, Media Library aspects. Schema deployment across ecosystem. Wraps any existing SQL database — no proprietary schema. Introspects DB tables as collections. No separate content modeling; mirrors DB structure directly. Flows (automations) for business logic. Fixed content model: posts, pages, tags, authors, tiers, members. Not extensible — publication-first. Custom routes, but no custom content types. Rich media "Cards" in Lexical editor.

2. Editing Experience Lexical-based rich text editor — Meta's editor framework. Fully extensible with custom Features (nodes, marks, slash menu, toolbars). Can embed Payload Blocks directly in-text. Views system for shared admin/frontend rendering. Auto-generated Admin Panel from config. Enterprise Visual Editor (pages). Standard WYSIWYG. Custom fields possible via plugins. Content manager with list/edit views, bulk actions. Preview button. Rich text editor with tables, inline entries, cross-space references. Entry editor with sidebar (tasks, versions, comments). Google Docs formatting integration. Contentful Studio for visual page building. Portable Text editor — open-source block-based editor. Custom blocks (images, code, videos) inline. Plugin system for toolbar customization. Canvas app for AI-powered distraction-free writing. Real-time multiplayer editing in Studio. Data Studio web app for non-devs. Standard form-based editing (no rich block editor by default). Insights dashboards for data visualization. Lexical-based rich text editor with extensible Cards (rich media objects like embeddable widgets). JSON-based storage. Focused on writers — minimal, fast.

3. Media Management Built-in upload collections with Sharp-based image resizing (imageSizes), focal-point cropping, crop tool, format options (formatOptions), mimeType restrictions, pasteURL for remote fetching. DisableLocalStorage for cloud storage plugins. Restricted file type blocking. Media Library plugin with upload, crop, details, replace, download, copy link. RBAC-gated. Asset management with image editing, multiple resolutions, DAM integration (Bynder, Cloudinary), embargoed assets (timed release), asset bandwidth monitoring. Media Library app for org-level asset management. Aspects (schema-defined metadata fields) for categorization. Image and file types in schema with hotspot/crop. CDN delivery via Content Lake. Built-in file management. Upload, transform, access control. Connect external storage services. Minimal: image upload, no DAM. Ghost(Pro) uses CDN.

4. Content Versioning & History Full versioning system: enable versions → separate \_slug_versions collection. Supports drafts (separate from published), autosave, version diffs in Admin UI, restore to any prior version. maxPerDoc config. Access control on readVersions. Content History (Growth/Enterprise): browse previous versions with date/user/status, restore to prior version. Diffs via side-by-side view. Versions — entry version history with restore. Environments for isolated content changes (sandbox/master). Launch for coordinated releases. Document revision history built-in (\_rev). Draft/published states. Content Releases for grouping and scheduling. Real-time = editing conflicts visible instantly. Versioning via database-level audit/change tracking. Not a first-class CMS-level feature — depends on DB capabilities. Minimal versioning. Focus on draft/published state.

5. Publishing Workflow Drafts + autosave built into core. Enterprise Publishing Workflows for multi-stage review. Version restore/publish operations. Access control gates who sees drafts vs. published. Draft & Publish (free). Review Workflows (Enterprise): custom multi-stage pipelines with stage colors, role-gated transitions, assignees. Releases (Growth): group entries/publish simultaneously + scheduling. Workflows (app): custom step-based workflows with roles, automations, localized workflows. Scheduled publishing per entry. Tasks for assignments. Launch for coordinated release management. Timeline for preview. Content Releases — group documents and schedule publish. Tasks for assignments. Studio comments for collaboration. Flows (event-driven automations) for custom workflow logic. No built-in review workflow. Contributor → Author → Editor → Admin → Owner fixed roles. Contributors write but can't publish. Simple publish/unpublish.

6. Multi-locale/i18n Localization — locale support at field and collection level. Locale-specific access control. Fallback locales. Translation function t() in admin. Internationalization (free): 500+ pre-defined locales, enable per content-type/field. Fill-in from another locale. AI-powered i18n (Growth): auto-translate from default locale using Strapi AI. Locale-specific RBAC. Localization: manage locales per space, enable per field. Locale-based publishing (publish per locale independently). Localized workflows. 500+ locales. Locale support at document level. Field-level localization. GROQ queries can filter/select by locale. Database-native — if DB supports locale columns, Directus mirrors. No built-in i18n framework. Multi-language routing via /en/, /de/ base URL patterns. No built-in content translation management.

7. API & Integration REST + GraphQL + Local API auto-generated from config. Webhooks. TypeScript SDK. Straight-to-DB Node.js access. REST + GraphQL (free). OpenAPI spec generation. Strapi Client SDK. Webhooks. MCP server for AI agent integration. Document Service API (lower-level). REST (CDA + CMA + CPA) — Content Delivery, Content Management, Content Preview APIs. GraphQL (CDA). JavaScript SDK, PHP, Ruby. Webhooks with filters. App Framework for custom integrations. Cross-space references. Functions (serverless). GROQ (powerful query language) + GraphQL. HTTP API. JS/TS SDKs. Webhooks. MCP server for AI agent integration. Sanity Context (schema-aware AI queries). App SDK for custom apps. Realtime subscriptions via Content Lake. REST + GraphQL auto-generated from DB. JS SDK. Realtime subscriptions (WebSockets). Flows (event-driven automations). Auth, file management APIs. RESTful Content API (JSON). Admin API. Webhooks. Theme helpers (Handlebars). Self-consuming — decoupled admin client. No GraphQL.

8. RBAC & Permissions Granular access control: collection-level (create/read/update/delete), global-level, field-level. Function-based — can evaluate user, role, doc data, locale. Admin Panel auto-hides restricted areas. Full RBAC system (free): 3 default roles + custom roles. Permissions per content-type (CRUD + publish) + per field + per plugin/setting. Custom conditions (must be creator, same role). Locale-specific permissions. API tokens with permissions. Organization roles + Space roles: custom roles with content permissions. Teams for group assignment. Allow/Deny rules. Tag-based content permissions. Environment permissions. Multiple roles per user. Role system in Studio. Customizable access control via document/field level. Organizations for team management. Granular RBAC: roles with permissions on collections, fields, flows, dashboards. Policy-based access. Can restrict to specific field values. 5 fixed roles: Contributor, Author, Editor, Administrator, Owner. No custom roles or field-level permissions.

9. Security & Hardening Restricted file type blocking (executables, HTML, scripts). skipSafeFetch for URL fetching. Access control at all levels. Auth system (email/password, OAuth). Enterprise SSO. Audit Logs (Enterprise): track admin actions. API tokens + admin tokens + transfer tokens. SSO (Enterprise). Middleware configuration. 2FA, SSO (SAML/SCIM). Embargoed assets (timed-release media with protection modes). SCIM provisioning (Okta, Azure, OneLogin, Ping). Bug bounty program. GDPR/CCPA compliance. SOC 2. Content Lake with token-based auth. SSO available. GDPR compliance. Auth system (tokens, cookies, SSO). Policy-based access. Database-level security (inherits DB auth). MIT license — security is deployment responsibility. Built-in role system. Session-based auth.

10. Performance & Scaling Next.js native — ISR, edge, server components. Database indexing. Payload Cloud for managed hosting. Sharp for optimized images. Middleware layers, database optimization guides. Strapi Cloud for managed hosting. Global CDN for asset delivery. Asset bandwidth monitoring. Usage limits per plan. Functions (serverless edge). Managed SaaS — scaling handled by platform. Content Lake — real-time distributed datastore. Global CDN. GROQ queries optimized for speed. Managed SaaS. Directus Cloud auto-scales. Self-hosted can scale horizontally. Realtime via WebSockets optimized. Built for extreme performance — Node.js, static HTML delivery, handles HackerNews front-page traffic spikes. Ghost(Pro) CDN. Minimal overhead.

## Key Distinctions

- Payload and this project are both Next.js/TypeScript native — Payload drops directly into a Next.js app. It has the richest field system (virtual fields, join fields, blocks within rich text) and Lexical editor (same underlying tech as Ghost's editor).
- Strapi has the most complete free-tier workflow features (Draft & Publish, RBAC, i18n) but gates Content History and Review Workflows behind paid plans.
- Contentful is the most enterprise-grade SaaS — environments, SCIM, embargoed assets, cross-space references, content model templates, Studio/Experiences. Most expensive, most locked-in.
- Sanity is the developer-first real-time platform — Portable Text, GROQ, Content Lake, real-time collaboration, schema-based ecosystem (typegen, Canvas mapping, AI agents).
- Directus is unique in wrapping existing databases — no migration, no schema ownership. Best if you already have a DB and want an admin panel + API on top.
- Ghost is publication-only — fixed schema, no extensible content types. Best-in-class for newsletters, memberships, subscriptions, and SEO.

## What We Could Adopt from Each

From Payload CMS

- Lexical-based block editor pattern: Payload embeds its own Blocks directly inside the Lexical rich text editor via BlocksFeature. This project has TipTap installed (also ProseMirror-based) and could adopt the same pattern — embed custom content blocks (announcements, surveys, event cards) directly in rich text.
- Virtual fields: Computed fields that resolve at query time (e.g., authorName from author.name) without storing redundant data. Useful for community directory, member profiles.
- Field-level access control: Hide/show fields based on user role. Residents see simplified forms; admins see all fields.
- Draft + autosave + version diff: Payload's versioning is comprehensive. The project has no visible versioning system.
- Image focal point cropping + size presets: Payload's Sharp integration generates multiple sizes with focal-point-aware cropping. Useful for responsive community content.

From Strapi

- Review Workflows pattern: Multi-stage pipeline (To Do → In Progress → Ready for Review → Reviewed) with role-gated transitions and assignees. Maps directly to community board review of announcements, events, policy changes.
- Releases: Group multiple content items (announcement + event + survey) and publish them simultaneously on a schedule. Perfect for community newsletters or coordinated updates.
- Content History with side-by-side diff: Browse/restore prior versions. Strapi's UI pattern for showing version metadata (who, when, status) is clean.
- AI-powered i18n: Auto-translate content from default locale. Useful if Soralia Village needs multi-language community content (English/Spanish/French).

From Contentful

- Environments pattern: Sandbox environments for content changes without affecting production. A community platform could use this for "staging" content changes that need board approval before going live.
- Embargoed assets: Time-locked media that becomes available at a scheduled date. Useful for timed community announcements, event materials.
- Cross-space references: If Netcomplex grows to multiple tenants, linking content across tenant spaces.
- Taxonomy system: Hierarchical tagging with validations and AI-assisted assignment. Could organize community resources, knowledge base articles.

From Sanity

- Portable Text: The block content specification that separates content from presentation. This project's TipTap could serialize to Portable Text for cleaner API output and framework-agnostic rendering.
- Real-time collaborative editing: Sanity Studio's multiplayer editing. TipTap (already installed) has a Collaboration extension (Pro extension) that enables this — Google Docs-style real-time co-editing. Not currently used.
- Content Releases: Grouping and scheduling content for coordinated publication.
- GROQ query language approach: A query language that deeply filters and transforms content at read time, rather than building fixed API endpoints.
- Schema-as-source-of-truth: Deployed schemas powering AI agents, content mapping, type generation.

From Directus

- Database-first approach: Directus introspects existing DB tables. If Netcomplex wants to rapidly expose its existing Prisma/Drizzle tables as a management interface without rebuilding, this pattern is relevant.
- Flows (automations): Event-driven automations for business logic. Could trigger notifications when new maintenance requests are filed, auto-assign board members to review tasks.

From Ghost

- Lexical editor with Cards: Ghost uses the same Lexical editor as Payload (and as TipTap's underlying ProseMirror). The "Cards" concept — extensible rich media blocks inserted inline — is a pattern this project's TipTap setup could replicate.
- Memberships + subscriptions built-in: Ghost's native member tiers, paid subscriptions, and newsletter integration are relevant if Soralia Village ever needs paid community tiers or premium content.
- SEO fundamentals: Automatic JSON-LD structured data, canonical tags, XML sitemaps. The project could adopt similar automatic SEO metadata generation for community content pages.

TipTap: What's Installed vs. What's Not Being Used
The project has 13 TipTap packages installed:
Installed Used? Capability Missed
@tiptap/core + @tiptap/react + @tiptap/pm + @tiptap/starter-kit Not wired (no component found) The foundational rich text editor isn't yet integrated — no editor component exists in src/
@tiptap/extension-image Not used Inline image insertion
@tiptap/extension-placeholder Not used Placeholder text for empty editor
@tiptap/extension-text-align Not used Text alignment controls
@tiptap/extension-text-style + @tiptap/extension-color Not used Text color/styling
@tiptap/extension-highlight Not used Text highlighting
@tiptap/extension-underline Not used Underline formatting
@tiptap/extension-code-block-lowlight Not used Syntax-highlighted code blocks
tiptap-extension-resizable-image Not used Resizable images
TipTap Features Available but Not Adopted:

- Collaboration (Pro): Real-time multiplayer editing with conflict resolution (Y.js CRDT). Could enable board members to co-edit announcements, meeting minutes, or policy docs simultaneously.
- Comments (Pro): Inline commenting on document text. Could replace a separate "review comments" system for content approval.
- Version History (Pro): Track and restore document versions within the editor. Could be a lightweight alternative to full CMS versioning.
- AI commands (Pro): AI-powered text generation/transformation directly in the editor. Could auto-generate community announcement drafts, summaries, translations.
- Custom Nodes/Extensions: Build domain-specific blocks — "EventCard", "SurveyBlock", "MaintenanceRequestBlock", "PollBlock" — that editors can drop inline into rich text via slash commands.
- Tables extension: Structured data tables in rich text.
- CharacterCount: Live character/word counters.
  Bottom line: The project has a powerful editor framework installed but completely unwired. The TipTap setup could become the core content editing experience, with custom blocks for community-specific content types, potentially paired with a lightweight versioning/approval workflow rather than adopting a full external CMS.
