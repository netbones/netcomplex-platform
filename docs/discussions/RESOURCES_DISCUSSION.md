---
title: DISCUSSION PART ONE
status: current
reviewed: 2026-07-28
tags: [discussion, proposal]
audience: developer
---

# DISCUSSION PART ONE

Yes. Looking at the implementation, every category section is essentially:

```tsx
<div className="bg-white rounded-lg shadow-lg p-8">
```

with only the icon colour changing. The result is that all categories visually blend together.

For a Resources page, I'd aim for something closer to a "knowledge library" than a stack of identical white cards.

## 1. Give Each Category Its Own Identity

Instead of only changing icon colours, give each category a subtle theme:

| Category      | Accent  |
| ------------- | ------- |
| Architectural | Blue    |
| Engineering   | Indigo  |
| Governance    | Purple  |
| Board Reports | Rose    |
| DIY           | Green   |
| Financial     | Emerald |
| Legal         | Amber   |
| Other         | Slate   |

Example:

```tsx
ARCHITECTURAL: {
  accent: 'border-blue-500',
  bg: 'bg-blue-50',
}

FINANCIAL: {
  accent: 'border-emerald-500',
  bg: 'bg-emerald-50',
}
```

Then:

```tsx
<div
  className={`
    rounded-2xl
    border-l-4
    ${config.accent}
    ${config.bg}
    p-8
    mb-8
  `}
>
```

This immediately creates visual separation.

---

## 2. Convert Category Sections Into Hero Panels

Current:

```
Category Heading
Grid
```

Proposed:

```
━━━━━━━━━━━━━━━━━━━━━━
🏛 Governance
Policies, rules and HOA documents
17 resources
━━━━━━━━━━━━━━━━━━━━━━

[cards]
```

Example:

```tsx
<div className="mb-6 flex items-center justify-between">
  <div>
    <h2 className="text-3xl font-bold">...</h2>

    <p className="text-sm text-gray-600 mt-1">Governance documents and community policies</p>
  </div>

  <div className="text-right">
    <div className="text-3xl font-bold">{items.length}</div>
    <div className="text-xs uppercase">Resources</div>
  </div>
</div>
```

This makes categories feel important.

---

## 3. Alternate Section Backgrounds

Instead of every section being white:

```text
Blue tinted section
White section
Purple tinted section
White section
Green tinted section
```

Like modern SaaS documentation portals.

Example:

```tsx
const backgrounds = ['bg-blue-50', 'bg-white', 'bg-purple-50', 'bg-white'];
```

---

## 4. Add a Featured Resources Hero

Currently the page starts immediately with filters.

I would add:

```text
━━━━━━━━━━━━━━━━━━━━━━
📚 Resource Library

312 documents
8 categories
Latest update: 12 June

[Search resources...]
━━━━━━━━━━━━━━━━━━━━━━
```

This gives the page purpose.

You already have enough data to display:

- total resources
- categories
- newest document

---

## 5. Turn Filters Into Category Tiles

Current pills:

```text
All
Governance
Financial
DIY
```

feel dated.

Instead:

```text
┌──────────┐
🏛
Governance
17 docs
└──────────┘

┌──────────┐
💰
Financial
9 docs
└──────────┘
```

Like dashboard shortcuts.

```tsx
grid-cols-2 md:grid-cols-4 lg:grid-cols-6
```

This alone would dramatically improve the page.

---

## 6. Improve Resource Cards

Current cards are fairly generic.

Add a coloured top accent:

```tsx
<div className="h-1 bg-blue-500 rounded-t-lg" />
```

Or:

```tsx
<div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-indigo-500" />
```

The cards then visually inherit the category colour.

---

## 7. Use Icons/Illustrations Per Category

Right now only Font Awesome icons appear.

Consider adding a small illustration banner above each category.

Example:

```text
🏛 Governance
📐 Architectural
⚖️ Legal
💰 Financial
🔧 DIY
```

or even SVG illustrations from `/platform/*`.

This breaks the monotony substantially.

---

## 8. Add Category Statistics

Each category header could show:

```text
Governance

17 Resources
4 PDFs
2 Updated this month
```

This makes the page feel alive rather than a document dump.

---

## 9. Add Search

Resources pages become difficult once there are many documents.

Add:

```tsx
<Input placeholder="Search resources..." />
```

above the filters.

Searching title + description would significantly improve usability.

---

## 10. Most Impactful Change

If I were only allowed to make three changes, I'd do:

1. **Category hero sections with coloured backgrounds**
2. **Dashboard-style category tiles instead of filter pills**
3. **Resource cards with category-coloured accents**

Those three changes would make the page feel like a modern resource library rather than a list of white containers, while still fitting the NetComplex design language.

# DISCUSSION PART TWO

I would not replace the current file wholesale.

The existing page already has:

- API integration
- loading/error states
- i18n support
- resource grouping
- visibility badges
- file metadata
- page loading framework integration

The better approach is to **upgrade the presentation layer only**.

### Changes I would make

## 1. Expand CATEGORY_CONFIG

Replace:

```ts
const CATEGORY_CONFIG: Record<string, { icon: string; color: string; labelKey: string }>;
```

with:

```ts
const CATEGORY_CONFIG = {
  ARCHITECTURAL: {
    icon: 'fa-building',
    color: 'text-blue-700',
    bg: 'bg-blue-50',
    border: 'border-blue-500',
    cardAccent: 'bg-blue-500',
    labelKey: 'categories.architectural',
    description: 'Plans, layouts, design standards and building guidelines.',
  },

  ENGINEERING: {
    icon: 'fa-cogs',
    color: 'text-indigo-700',
    bg: 'bg-indigo-50',
    border: 'border-indigo-500',
    cardAccent: 'bg-indigo-500',
    labelKey: 'categories.engineering',
    description: 'Infrastructure, utilities and technical specifications.',
  },

  GOVERNANCE: {
    icon: 'fa-landmark',
    color: 'text-purple-700',
    bg: 'bg-purple-50',
    border: 'border-purple-500',
    cardAccent: 'bg-purple-500',
    labelKey: 'categories.governance',
    description: 'Rules, policies, constitutions and governance documents.',
  },

  BOARD_REPORT: {
    icon: 'fa-file-signature',
    color: 'text-rose-700',
    bg: 'bg-rose-50',
    border: 'border-rose-500',
    cardAccent: 'bg-rose-500',
    labelKey: 'categories.boardReport',
    description: 'Board reports and community management updates.',
  },

  DIY: {
    icon: 'fa-tools',
    color: 'text-green-700',
    bg: 'bg-green-50',
    border: 'border-green-500',
    cardAccent: 'bg-green-500',
    labelKey: 'categories.diy',
    description: 'Maintenance tips and homeowner guides.',
  },

  FINANCIAL: {
    icon: 'fa-chart-line',
    color: 'text-emerald-700',
    bg: 'bg-emerald-50',
    border: 'border-emerald-500',
    cardAccent: 'bg-emerald-500',
    labelKey: 'categories.financial',
    description: 'Budgets, statements and financial information.',
  },

  LEGAL: {
    icon: 'fa-gavel',
    color: 'text-amber-700',
    bg: 'bg-amber-50',
    border: 'border-amber-500',
    cardAccent: 'bg-amber-500',
    labelKey: 'categories.legal',
    description: 'Legal notices, contracts and compliance documents.',
  },

  OTHER: {
    icon: 'fa-folder',
    color: 'text-slate-700',
    bg: 'bg-slate-50',
    border: 'border-slate-500',
    cardAccent: 'bg-slate-500',
    labelKey: 'categories.other',
    description: 'Additional resources and reference material.',
  },
};
```

---

## 2. Add Search

New state:

```ts
const [searchTerm, setSearchTerm] = useState('');
```

Update filtering:

```ts
const filteredResources = useMemo(() => {
  let filtered = resources;

  if (selectedCategory !== 'ALL') {
    filtered = filtered.filter(r => r.category === selectedCategory);
  }

  if (searchTerm.trim()) {
    const query = searchTerm.toLowerCase();

    filtered = filtered.filter(
      r => r.title.toLowerCase().includes(query) || r.description?.toLowerCase().includes(query)
    );
  }

  return filtered;
}, [resources, selectedCategory, searchTerm]);
```

---

## 3. Replace Page Header

Replace the current header block with:

```tsx
<div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-600 to-purple-700 text-white p-10 mb-10">
  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
    <div>
      <div className="flex items-center gap-3 mb-4">
        <img src="/platform/resources.svg" alt="" className="w-12 h-12" />

        <h1 className="text-4xl font-bold">{t('resources:title')}</h1>
      </div>

      <p className="text-indigo-100 text-lg max-w-2xl">{t('resources:subtitle')}</p>
    </div>

    <div className="grid grid-cols-3 gap-6 text-center">
      <div>
        <div className="text-3xl font-bold">{resources.length}</div>
        <div className="text-xs uppercase tracking-wider">Resources</div>
      </div>

      <div>
        <div className="text-3xl font-bold">
          {ALL_CATEGORIES.filter(c => resources.some(r => r.category === c)).length}
        </div>

        <div className="text-xs uppercase tracking-wider">Categories</div>
      </div>

      <div>
        <div className="text-3xl font-bold">{filteredResources.length}</div>

        <div className="text-xs uppercase tracking-wider">Showing</div>
      </div>
    </div>
  </div>
</div>
```

---

## 4. Replace Filter Pills With Tiles

Instead of the current pills.

Use:

```tsx
<div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 mb-8">
```

Each category becomes:

```tsx
<button
  key={cat}
  onClick={() => setSelectedCategory(cat)}
  className={`
    rounded-xl
    border
    p-4
    text-left
    transition-all
    hover:shadow-lg
    ${
      selectedCategory === cat
        ? 'border-indigo-500 bg-indigo-50'
        : 'border-gray-200 bg-white'
    }
  `}
>
```

with:

```tsx
<i className={`fas ${config.icon} ${config.color} text-xl mb-2`} />

<div className="font-semibold">
  {label}
</div>

<div className="text-xs text-gray-500">
  {count} resources
</div>
```

---

## 5. Add Search Bar Below Filters

```tsx
<div className="mb-10">
  <input
    type="text"
    value={searchTerm}
    onChange={e => setSearchTerm(e.target.value)}
    placeholder="Search resources..."
    className="
      w-full
      rounded-xl
      border
      border-gray-300
      px-4
      py-3
      shadow-sm
      focus:ring-2
      focus:ring-indigo-500
    "
  />
</div>
```

---

## 6. Replace Category Sections

Current sections are plain white cards.

Replace with:

```tsx
<div
  className={`
    rounded-3xl
    border-l-4
    ${config.border}
    ${config.bg}
    p-8
    mb-10
  `}
>
```

Header:

```tsx
<div className="flex justify-between items-start mb-8">
  <div>
    <h2 className="text-3xl font-bold">
      <i className={`fas ${config.icon} ${config.color} mr-3`} />

      {label}
    </h2>

    <p className="text-gray-600 mt-2">{config.description}</p>
  </div>

  <div className="text-right">
    <div className="text-4xl font-bold">{items.length}</div>

    <div className="text-xs uppercase tracking-wide">Resources</div>
  </div>
</div>
```

---

## 7. Upgrade Resource Cards

Update `ResourceCard`.

Pass category:

```tsx
<ResourceCard key={resource.id} resource={resource} t={t} categoryConfig={config} />
```

Then add a coloured top accent:

```tsx
<div
  className={`
  h-1
  w-full
  ${categoryConfig.cardAccent}
`}
/>
```

and make the card:

```tsx
<div
  className="
    bg-white
    rounded-2xl
    overflow-hidden
    border
    border-gray-200
    hover:shadow-xl
    hover:-translate-y-1
    transition-all
    flex
    flex-col
  "
>
```

instead of the existing flat bordered card.

---

### Expected Result

The page changes from:

```text
White section
White section
White section
White cards
White cards
White cards
```

to:

```text
Gradient library hero

Category tiles
Search

Blue Architectural section
Purple Governance section
Green DIY section
Emerald Financial section

Cards inherit category colour
Resource counts
Descriptions
```

which feels much closer to a modern knowledge library while remaining consistent with the existing NetComplex Tailwind design system.
