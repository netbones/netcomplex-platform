# CMS Implementation Summary

## 1. TipTap Editor Configuration and Extensions

Package Dependencies (package.json, lines 115-126, 169)
@tiptap/core ^3.21.0
@tiptap/extension-code-block-lowlight ^3.21.0
@tiptap/extension-color ^3.21.0
@tiptap/extension-highlight ^3.21.0
@tiptap/extension-image ^3.21.0
@tiptap/extension-placeholder ^3.21.0
@tiptap/extension-text-align ^3.21.0
@tiptap/extension-text-style ^3.21.0
@tiptap/extension-underline ^3.21.0
@tiptap/pm ^3.21.0
@tiptap/react ^3.21.0
@tiptap/starter-kit ^3.21.0
tiptap-extension-resizable-image ^2.1.0 (community extension)

Primary Editor: RichTextEditor (/home/ubuntupunk/Projects/soralia-village/src/shared/ui/RichTextEditor.tsx)
A full-featured TipTap editor with a rich toolbar. Extensions configured:

- StarterKit -- with headings levels 1-3, bullet/ordered lists with Tailwind classes, blockquotes with border styling; codeBlock: false (uses separate CodeBlockLowlight instead)
- CodeBlockLowlight -- syntax highlighting via lowlight with common languages
- TiptapImage -- inline images, allowBase64: false (must be uploaded URLs)
- ResizableImage -- community extension for drag-resizable images
- Placeholder -- configurable placeholder text (default: "Start writing...")
- TextStyle -- base text style mark for font customization
- Color -- text color mark
- TextAlign -- alignment on headings and paragraphs (left/center/right)
- Highlight -- multicolor text highlighting
- Underline -- underline text
- FontSize -- custom extension (see below)
- FontFamily -- custom extension (see below)
  Toolbar features:
- Bold, Italic, Underline, Strikethrough, Highlight (all toggle)
- Font Family dropdown (sans-serif, serif, mono, Arial, Georgia, Times New Roman, Courier)
- Font Size dropdown (12px to 32px, 8 sizes)
- Text Color palette (18 colors including Indigo, Blue, Green, Red, etc.)
- Text alignment (left/center/right)
- Heading dropdown (Paragraph, H1, H2, H3)
- Bullet list, Ordered list
- Blockquote, Code Block
- Image upload (via file input -> /api/upload)
- Media Library (modal with existing images from /api/media)
- Undo/Redo
- Optional "Save Draft" button (when onDraftSave prop is provided)
- Draft save timestamp display

## Image upload flow:

1. User clicks "Upload Image" toolbar button, selects file (max 2MB, JPEG/PNG/GIF/WebP)
2. Client-side validation for size and type
3. POST to /api/upload with FormData
4. On success: inserts image into editor via editor.chain().focus().setImage({ src: data.url })
5. Error handling with toast notifications
   Media Library flow:
6. User clicks "Media Library" toolbar button
7. GET /api/media to fetch user's uploaded images
8. Modal displays a grid of images
9. Clicking an image inserts it into the editor
10. Loading and empty states handled

## Custom TipTap Extensions

    FontSize (/home/ubuntupunk/Projects/soralia-village/src/shared/ui/FontSize.ts):

- Custom TipTap Extension with name fontSize
- Adds global fontSize attribute to textStyle types
- Renders as inline style="font-size: ..."
- Commands: setFontSize(size), unsetFontSize()
  FontFamily (/home/ubuntupunk/Projects/soralia-village/src/shared/ui/FontFamily.ts):
- Custom TipTap Extension with name fontFamily
- Adds global fontFamily attribute to textStyle types
- Renders as inline style="font-family: ..."
- Commands: setFontFamily(font), unsetFontFamily()
  Lazy-Loaded Editor Wrapper: RichTextEditorDynamic (/home/ubuntupunk/Projects/soralia-village/src/shared/ui/RichTextEditorDynamic.tsx)
- Uses next/dynamic with ssr: false to prevent SSR hydration issues
- Provides a skeleton loading state ("Loading editor...")
- This is what export \* from './RichTextEditorDynamic' in the shared UI barrel exports
  Slim Survey Builder Editor: BuilderRichText (/home/ubuntupunk/Projects/soralia-village/src/features/survey-builder/ui/BuilderRichText.tsx)
- A minimal TipTap editor tailored for survey section descriptions
- Extensions: StarterKit (headings/codeBlock/horizontalRule/blockquote disabled), Image (URL-based, no file upload), Placeholder
- Toolbar: Bold, Italic, Underline, Bullet List, Ordered List, Image by URL
- Image insertion: a prompt for URL input (no file upload)
- Compact mode for tight UI contexts
- Has data-no-dnd="true" to prevent drag-and-drop conflicts with the survey builder DnD
  Rich Text Renderer (Read-only): RichTextRenderer (/home/ubuntupunk/Projects/soralia-village/src/shared/ui/RichTextRenderer.tsx)
- Renders TipTap JSON document structure for display (no editing)
- Handles heading (H1-H3), paragraph, bulletList, orderedList, blockquote, codeBlock, horizontalRule
- Handles text marks: bold, italic, underline, strike
- Falls back to plain string rendering if input isn't a TipTap doc
- Accepts both string and Record<string, unknown> (TipTap JSON doc) content

## 2. Database Schema for Content Management

Drizzle ORM Schema (/home/ubuntupunk/Projects/soralia-village/src/db/schema/contents.ts)
// Content table (maps to PostgreSQL "Content" table)
contents = pgTable('Content', {
id: text (primary key)
tenantId: text (not null)
title: jsonb (not null) // { "en": "...", "af": "...", "xh": "...", "zu": "..." }
content: jsonb (not null) // { "en": "<html>", "af": "{tipTapDoc}", ... }
excerpt: jsonb (optional) // { "en": "short summary", ... }
image: text (optional) // URL to featured image
category: ContentCategory enum // see below
tags: text[] (not null)
authorId: text (optional) // FK to User
groupId: text (optional) // FK to Group
published: boolean (default false)
featured: boolean (default false)
priority: text (default "normal")
defaultLocale: text (default "en")
contentType: text (default "article") // "article", "campaign", "document"
license: ContentLicense enum (default ALL_RIGHTS_RESERVED)
copyrightHolder: text (optional)
moderationStatus: ModerationStatus enum (default DRAFT)
viewCount: integer (default 0)
commentsEnabled: boolean (default false)
createdAt: timestamp
updatedAt: timestamp
publishedAt: timestamp (optional) // for scheduled publishing
expiresAt: timestamp (optional) // for auto-expiry
deletedAt: timestamp (optional) // soft delete
})

Prisma Schema (/home/ubuntupunk/Projects/soralia-village/prisma/schema/schema.prisma, line 732)

The Prisma Content model mirrors the Drizzle schema exactly. Relations:

- user (author) -- optional FK to user
- Group (interest group) -- optional FK to Group
- Tenant -- required FK for multi-tenant isolation
- likes -- one-to-many to ContentLike
  ContentLike Table
  contentLikes = pgTable('ContentLike', {
  id: text (primary key)
  tenantId: text (not null)
  contentId: text (not null) // FK to Content
  userId: text (not null) // FK to User
  createdAt: timestamp
  deletedAt: timestamp (optional) // soft-delete for unlike
  })
  Prisma: @@unique([contentId, userId]) -- one like per user per content.
  Announcements Table (/home/ubuntupunk/Projects/soralia-village/src/db/schema/announcements.ts)
  A separate table from Content, not using the rich text editor:
  announcements = pgTable('Announcement', {
  id: text (primary key)
  tenantId: text (not null)
  title: jsonb (not null) // multi-locale
  content: text (not null) // PLAIN TEXT, max 5000 chars
  author: text (not null) // author display name string
  priority: text (default "normal")
  targetFilter: ResidentFilter enum // ALL, OWNERS_ONLY, RENTERS_ONLY
  targetRoles: roleEnum[] // targeted role array
  resourceId: text (optional) // FK to Resource
  createdAt: timestamp
  updatedAt: timestamp
  expiresAt: timestamp (optional)
  deletedAt: timestamp (optional)
  })
  Notable: Announcements use plain text (text column, not jsonb). Validation enforces 1-5000 characters. No TipTap editor involved.
  Enums
  ContentCategory (8 values): ANNOUNCEMENT, NEWS, EVENT, BLOG, CONSERVATION, SERVICES, CAMPAIGN, LEGAL
  ContentLicense (5 values): CC0, CC_BY, CC_BY_SA, CC_BY_NC, ALL_RIGHTS_RESERVED
  ModerationStatus (4 values): DRAFT, PUBLISHED, UNPUBLISHED, FLAGGED
  Relations
  contents-relations.ts: Content belongs to User (author), Group, Tenant; has many Likes
  content-likes-relations.ts: ContentLike belongs to Content, Tenant, User
  announcements-relations.ts: Announcement belongs to Resource, Tenant

## 3. Components Using TipTap

Component Editor Used Location
ContentForm RichTextEditor (via LocaleAwareEditor) /src/widgets/admin/ui/ContentForm.tsx
LocaleAwareEditor RichTextEditor /src/features/i18n/ui/LocaleAwareEditor.tsx
ResourceForm RichTextEditor (for bodyContent) /src/widgets/admin/ui/ResourceForm.tsx
SurveyEditor / SectionBlock / SurveyEditorHeader BuilderRichText /src/features/survey-builder/ui/
NewsPostPage (read-only) RichTextRenderer /src/app/news/[id]/page.tsx
Resident Profile Page (read-only) RichTextRenderer /src/app/resident/[id]/page.tsx

## 4. Content-Related API Routes

REST API Routes (src/app/api/)
Route Methods Purpose
/api/content GET, POST List all content (GET, public); Create content (POST, authenticated + tenant scoped)
/api/content/[id] GET, PATCH, DELETE Get single content item (GET, public); Update (PATCH); Soft-delete (DELETE)
/api/content/[id]/like GET, POST, DELETE Get like count/status; Like (POST); Unlike (DELETE, soft-delete)
/api/content/[id]/moderate PATCH Set moderation status (DRAFT/PUBLISHED/UNPUBLISHED/FLAGGED); requires content permission
/api/upload POST Upload image file (FormData) -> S3-compatible storage; returns { url, key }
/api/media GET, DELETE List user's uploaded images; Delete image by key
/api/announcements CRUD Separate announcement endpoints (GET, POST, PATCH, DELETE)
/api/v1/tenant/conservation GET Conservation page data (uses content entity for locale transforms)
tRPC Router (/src/server/routers/content.ts)
Full tRPC router with OpenAPI annotations:

- listContent (public) -- filtered by category, published, featured, groupId, authorId, locale
- getContent (public) -- single item with locale resolution, publish/expiry date filtering for non-admins
- createContent (privileged) -- rate-limited (5/min), requires content or contentOwn permission, validates group membership
- updateContent (privileged) -- partial updates, handles string or multi-locale Record for title/content/excerpt
- softDeleteContent (privileged) -- sets deletedAt timestamp
- moderateContent (privileged) -- requires full content permission; sets moderationStatus and auto-syncs published flag
- getLikes (public) -- like count + user's like status
- toggleLike (tenant-authenticated) -- soft-delete unlike or insert new like
- listAnnouncements (tenant) -- sorted by priority then date, with active/expired filtering
- getAnnouncement (tenant)
- createAnnouncement (privileged) -- supports priority validation with role-based downgrade; fan-out notifications (batched, max 2000 users)
- updateAnnouncement (privileged)
- deleteAnnouncement (privileged) -- soft-delete
- getCampaignPage (tenant) -- hybrid: reads tenant settings for config + Content table for campaign content
- getConservationPage (tenant) -- module-gated (checks conservation module enabled)

## Content Pages (Frontend Routes)

| Page                | Purpose                                                                                               |
| ------------------- | ----------------------------------------------------------------------------------------------------- |
| /admin/content      | Content List Management -- table with moderation actions (publish/unpublish/flag), delete, edit links |
| /admin/content/new  | Create New Content -- renders ContentForm widget                                                      |
| /admin/content/[id] | Edit Content -- fetches via /api/content/[id], passes \_raw multi-locale data to ContentForm          |
| /news/[id]          | Public Content Display -- fetches via /api/content/[id], uses RichTextRenderer + ContentEngagementBar |

ContentForm Widget (/src/widgets/admin/ui/ContentForm.tsx)
Multi-locale content creation/editing form:

- Uses react-hook-form + Zod (contentSchema from @entities/content)
- Locale-aware inputs via LocaleAwareEditor (title + content) and LocaleAwareInput (excerpt)
- Locale tabs to switch between languages (en, af, xh, zu)
- Unsaved changes warning when switching locales
- AI translation via /api/translate (triggered from LocaleAwareEditor)
- Fields: Title, Content (rich text), Category, Content Type (article/campaign/document), Group, Featured/Publish toggles, Publish Date, Expiry Date, Excerpt, Tags (max 10), Default Locale
- Translation status grid showing completeness per locale
- CSRF protection via Honeypot

## 5. How Rich Text Content is Stored and Retrieved

Storage Model
Content is stored as multi-locale JSONB objects in the content column:
{
"en": "<p>Hello <strong>World</strong></p>",
"af": "<p>Hallo <strong>Wêreld</strong></p>",
"xh": "<p>Molo <strong>Hlabathi</strong></p>",
"zu": "<p>Sawubona <strong>Mhlaba</strong></p>"
}
The TipTap editor outputs HTML strings via editor.getHTML(). These HTML strings are stored as locale-keyed values in the JSONB content column. The title and excerpt columns follow the same pattern.
Seed data (scripts/seed-data/soralia-village/content.ts) also stores content in TipTap JSON format directly (the { type: 'doc', content: [...] } structure), showing both HTML and JSON doc formats are supported in the column.

## Retrieval and Localization

getLocalizedValue (basic) -- for title and excerpt: finds the first matching locale string in the JSONB object, falling back through user locale -> default locale -> first available locale -> null.
getLocalizedContent (content-specific) -- for the content column, which may contain:

1. A direct TipTap JSON doc (if type === 'doc' at root)
1. A multi-locale record of HTML strings
1. A multi-locale record of TipTap JSON docs
   The function tries: user locale -> fallback locale -> first available key, returning either a string or an object.
   transformContentForLocale (entity service) -- returns both localized fields AND \_raw (the full JSONB columns) which is essential for admin editing. The edit page uses \_raw to pre-populate the ContentForm with all locale data.

## Display Pipeline

1. API endpoint/localization function extracts content for the user's locale
1. If it returns a TipTap JSON doc object, RichTextRenderer walks the node tree
1. If it returns an HTML string, RichTextRenderer renders it as-is (wrapped in <p>)
1. The client sanitizeHtml (DOMPurify) is used in UserContentWidget for sanitization of excerpts; the server sanitizeHtml (DOMPurify + JSDOM) is used in chat/dispute endpoints
1. Image/Media Handling

## Storage Infrastructure (/src/shared/api/storage.ts)

- S3-compatible storage (Supabase Storage via AWS S3 SDK)
- Environment variables: STORAGE_ENDPOINT, ACCESS_KEY_ID, SECRET_ACCESS_KEY, STORAGE_BUCKET, NEXT_PUBLIC_SUPABASE_URL
- Bucket: content-image (default)
- File limits: 2MB max, allowed types: JPEG, PNG, GIF, WebP
- ACL: public-read

## Functions:

| Function                          | Purpose                                                               |
| --------------------------------- | --------------------------------------------------------------------- |
| uploadImage(file, userId)         | Upload to users/{userId}/{uuid}.{ext} path                            |
| listUserImages(userId)            | List all user images via S3 ListObjectsV2 with prefix users/{userId}/ |
| deleteImage(key, userId)          | Delete user image (validates key belongs to user)                     |
| uploadTenantImage(file, tenantId) | Upload to tenants/{tenantId}/system/{uuid}.{ext}                      |
| listTenantImages(tenantId)        | List tenant system images                                             |
| deleteTenantImage(key, tenantId)  | Delete tenant image (validates ownership)                             |
| validateImage(file)               | Client-side validation utility                                        |

## Media Library Component (/src/shared/ui/MediaLibrary.tsx)

## Standalone media management UI:

- Grid and Carousel view modes
- Drag-and-drop upload area
- Copy URL, View, Delete actions per image
- Displays file sizes
- Loading skeleton and empty states
  ImageUpload Component (/src/shared/ui/ImageUpload.tsx)
  Simple single-image upload with preview:
- Upload to /api/upload, preview the result
- Change/Remove buttons
- Loading spinner overlay during upload

## In-Editor Image Flow

Path Where Used
File upload via toolbar button -> /api/upload RichTextEditor
Media library modal -> /api/media GET RichTextEditor
URL-based image insertion via prompt BuilderRichText (survey builder)

## 7. Content Versioning

No content versioning exists. The Content table has updatedAt timestamp tracking, and uses soft-delete (deletedAt), but there is:

- No revision/version history table
- No draft/published separate storage
- No content diffing
- No rollback capability
  The moderationStatus field (DRAFT/PUBLISHED/UNPUBLISHED/FLAGGED) provides a lightweight workflow, but updates overwrite the current state.

## 8. Publishing Workflow

Publishing Model

1. Content is created (POST /api/content or tRPC createContent) with published: false by default
1. Moderation via PATCH /api/content/[id]/moderate with status: DRAFT, PUBLISHED, UNPUBLISHED, FLAGGED
1. Setting PUBLISHED also sets published: true
1. The admin content list page provides Publish/Unpublish/Flag buttons inline

## Scheduled Publishing

- publishedAt timestamp field enables future-dated publishing
- Non-admin users cannot see content where publishedAt > now() or expiresAt <= now()
- The ContentForm exposes publish date and expiry date as date pickers
- When published is toggled on without a publishedAt, it defaults to now()

## Access Control

- Public users: only published content within date range visible
- Content permission (hasPermission(role, 'content')): can view all content regardless of publish status (admin override)
- ContentOwn permission (hasPermission(role, 'contentOwn')): can create/edit own content
- Full content permission: required for moderation actions

## Content Deletion

- Soft delete only -- sets deletedAt timestamp
- All queries use notDeleted() condition (checks deletedAt IS NULL)
- Deleted content returns 410 Gone from the API
  Cache Revalidation
  After content mutations, revalidateContent() is called:
- Invalidates ISR cache for paths: /resources, /conservation, /api/content
- Part of a broader revalidation system (revalidateDashboard(), revalidateDirectory(), revalidateAdminChanges())

## 9. WYSIWYG Features Summary

Feature Supported
Bold/Italic/Underline/Strikethrough Yes (toolbar toggles)
Text color Yes (18-color palette)
Text highlight (multicolor) Yes
Font size (custom) Yes (8 sizes, 12px-32px)
Font family (custom) Yes (7 font stacks)
Headings (H1-H3) Yes (dropdown)
Text alignment Yes (left/center/right)
Bullet/Ordered lists Yes
Blockquote Yes
Code blocks with syntax highlighting Yes (lowlight + common languages)
Image upload Yes (toolbar button -> /api/upload)
Resizable images Yes (drag-handle resize via tiptap-extension-resizable-image)
Media library Yes (modal grid, select existing images)
Undo/Redo Yes (toolbar buttons)
Draft save Yes (optional onDraftSave callback)
Drag-and-drop (file upload) In MediaLibrary component (not inline in editor)
Drag-and-drop (content blocks) No
Tables No (not configured in any editor)
Horizontal rules No (StarterKit hr not enabled)
Link insertion No (no toolbar button for links)
Video/Embeds No
AI translation (content) Yes (via /api/translate, available in LocaleAwareEditor)
Multi-locale editing Yes (locale tabs, per-locale rich text)
DOMPurify sanitization Yes (client: /src/shared/lib/sanitize/index.ts, server: /src/shared/lib/sanitize/server.ts)

## Complete File Map

## Core Editor Files

- /home/ubuntupunk/Projects/soralia-village/src/shared/ui/RichTextEditor.tsx -- Full TipTap editor (678 lines)
- /home/ubuntupunk/Projects/soralia-village/src/shared/ui/RichTextEditorDynamic.tsx -- Lazy-loaded wrapper
- /home/ubuntupunk/Projects/soralia-village/src/shared/ui/RichTextRenderer.tsx -- Read-only renderer
- /home/ubuntupunk/Projects/soralia-village/src/shared/ui/FontSize.ts -- Custom font size extension
- /home/ubuntupunk/Projects/soralia-village/src/shared/ui/FontFamily.ts -- Custom font family extension
- /home/ubuntupunk/Projects/soralia-village/src/features/survey-builder/ui/BuilderRichText.tsx -- Slim survey editor

  ## Database Schema

- /home/ubuntupunk/Projects/soralia-village/src/db/schema/contents.ts -- Content table
- /home/ubuntupunk/Projects/soralia-village/src/db/schema/contents-relations.ts
- /home/ubuntupunk/Projects/soralia-village/src/db/schema/content-category-enum.ts
- /home/ubuntupunk/Projects/soralia-village/src/db/schema/content-license-enum.ts
- /home/ubuntupunk/Projects/soralia-village/src/db/schema/content-likes.ts
- /home/ubuntupunk/Projects/soralia-village/src/db/schema/content-likes-relations.ts
- /home/ubuntupunk/Projects/soralia-village/src/db/schema/moderation-status-enum.ts
- /home/ubuntupunk/Projects/soralia-village/src/db/schema/announcements.ts
- /home/ubuntupunk/Projects/soralia-village/src/db/schema/announcements-relations.ts
- /home/ubuntupunk/Projects/soralia-village/prisma/schema/schema.prisma (Content model at line 732, ContentLike at 768, Announcement at 937)

## Server/API

- /home/ubuntupunk/Projects/soralia-village/src/server/routers/content.ts -- tRPC router (1086 lines)
- /home/ubuntupunk/Projects/soralia-village/src/server/dto/content.ts -- DTO shim
- /home/ubuntupunk/Projects/soralia-village/src/shared/api/dto/content.ts -- Shared DTO
- /home/ubuntupunk/Projects/soralia-village/src/shared/api/dto/content-author.ts -- Author DTO
- /home/ubuntupunk/Projects/soralia-village/src/app/api/content/route.ts -- REST content list/create
- /home/ubuntupunk/Projects/soralia-village/src/app/api/content/[id]/route.ts -- REST content CRUD
- /home/ubuntupunk/Projects/soralia-village/src/app/api/content/[id]/like/route.ts -- REST likes
- /home/ubuntupunk/Projects/soralia-village/src/app/api/content/[id]/moderate/route.ts -- REST moderation
- /home/ubuntupunk/Projects/soralia-village/src/app/api/upload/route.ts -- REST file upload
- /home/ubuntupunk/Projects/soralia-village/src/app/api/media/route.ts -- REST media library
- /home/ubuntupunk/Projects/soralia-village/src/shared/api/storage.ts -- S3 storage operations
- /home/ubuntupunk/Projects/soralia-village/src/shared/api/revalidation.ts -- ISR cache revalidation

## Entity Layer (FSD)

- /home/ubuntupunk/Projects/soralia-village/src/entities/content/index.ts -- Public barrel
- /home/ubuntupunk/Projects/soralia-village/src/entities/content/index.server.ts -- Server barrel
- /home/ubuntupunk/Projects/soralia-village/src/entities/content/schema.ts -- Zod validation schemas
- /home/ubuntupunk/Projects/soralia-village/src/entities/content/services/index.ts -- Query builders, locale transforms, create
- /home/ubuntupunk/Projects/soralia-village/src/entities/content/api/route.ts -- Entity API facade
- /home/ubuntupunk/Projects/soralia-village/src/entities/content/dto/index.ts -- DTO re-exports
- /home/ubuntupunk/Projects/soralia-village/src/entities/content/permissions/index.ts -- Permission checks

## Feature Layer

- /home/ubuntupunk/Projects/soralia-village/src/features/content/index.ts -- Feature barrel
- /home/ubuntupunk/Projects/soralia-village/src/features/content/ui/ContentEngagementBar.tsx -- Like/Comment/Share bar
- /home/ubuntupunk/Projects/soralia-village/src/features/content/model/useContentLike.ts -- Optimistic like hook
- /home/ubuntupunk/Projects/soralia-village/src/features/i18n/ui/LocaleAwareEditor.tsx -- Multi-locale editor wrapper

  ## Widgets and Pages

- /home/ubuntupunk/Projects/soralia-village/src/widgets/admin/ui/ContentForm.tsx -- Content create/edit form
- /home/ubuntupunk/Projects/soralia-village/src/widgets/admin/ui/GroupForm.tsx -- Group form (uses content schemas)
- /home/ubuntupunk/Projects/soralia-village/src/widgets/admin/ui/ResourceForm.tsx -- Resource form (uses RichTextEditor for bodyContent)
- /home/ubuntupunk/Projects/soralia-village/src/widgets/dashboard/ui/UserContentWidget.tsx -- User's content list widget
- /home/ubuntupunk/Projects/soralia-village/src/app/(tenant)/admin/content/page.tsx -- Content list (moderation)
- /home/ubuntupunk/Projects/soralia-village/src/app/(tenant)/admin/content/new/page.tsx -- New content
- /home/ubuntupunk/Projects/soralia-village/src/app/(tenant)/admin/content/[id]/page.tsx -- Edit content
- /home/ubuntupunk/Projects/soralia-village/src/app/news/[id]/page.tsx -- Public content display

## Supporting

- /home/ubuntupunk/Projects/soralia-village/src/shared/ui/MediaLibrary.tsx -- Standalone media management
- /home/ubuntupunk/Projects/soralia-village/src/shared/ui/ImageUpload.tsx -- Single image upload component
- /home/ubuntupunk/Projects/soralia-village/src/shared/lib/sanitize/index.ts -- Client DOMPurify
- /home/ubuntupunk/Projects/soralia-village/src/shared/lib/sanitize/server.ts -- Server DOMPurify + JSDOM
- /home/ubuntupunk/Projects/soralia-village/src/shared/lib/i18n/config.ts -- getLocalizedValue, getLocalizedContent
- /home/ubuntupunk/Projects/soralia-village/src/shared/ui/index.ts -- UI barrel
- /home/ubuntupunk/Projects/soralia-village/scripts/seed-data/soralia-village/content.ts -- Seed data
