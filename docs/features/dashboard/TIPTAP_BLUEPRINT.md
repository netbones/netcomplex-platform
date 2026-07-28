---
title: Tiptap Editor Blueprint
status: current
reviewed: 2026-07-28
tags: [feature, spec]
audience: developer
---

# Tiptap Editor Blueprint

## Overview

This document captures the Soralia Village Tiptap editor configuration for reproducibility across the project.

## Dependencies

```json
{
  "@tiptap/core": "^3.21.0",
  "@tiptap/extension-code-block-lowlight": "^3.21.0",
  "@tiptap/extension-color": "^3.21.0",
  "@tiptap/extension-highlight": "^3.21.0",
  "@tiptap/extension-image": "^3.21.0",
  "@tiptap/extension-placeholder": "^3.21.0",
  "@tiptap/extension-text-align": "^3.21.0",
  "@tiptap/extension-text-style": "^3.21.0",
  "@tiptap/extension-underline": "^3.21.0",
  "@tiptap/pm": "^3.21.0",
  "@tiptap/react": "^3.21.0",
  "@tiptap/starter-kit": "^3.21.0",
  "lowlight": "^3.3.0",
  "tiptap-extension-resizable-image": "^2.1.0"
}
```

**Note**: `@tiptap/extension-font-size` is deprecated. Use custom `FontSize` extension with `@tiptap/extension-text-style` instead.

````

## Extensions Configuration

```typescript
const editor = useEditor({
  extensions: [
    StarterKit.configure({
      heading: { levels: [1, 2, 3] },
      bulletList: { HTMLAttributes: { class: 'list-disc pl-6' } },
      orderedList: { HTMLAttributes: { class: 'list-decimal pl-6' } },
      blockquote: {
        HTMLAttributes: {
          class: 'border-l-4 border-gray-400 pl-4 italic text-gray-600 my-4',
        },
      },
      codeBlock: false, // disabled in favor of CodeBlockLowlight
    }),
    CodeBlockLowlight.configure({ lowlight }),
    Image.configure({ inline: false, allowBase64: false }),
    ResizableImage,
    Placeholder.configure({ placeholder: 'Start writing...' }),
    TextStyle,
    Color,
    TextAlign.configure({ types: ['heading', 'paragraph'] }),
    Highlight.configure({ multicolor: true }),
    Underline,
    FontSize,
    FontFamily, // custom extension
  ],
});
````

## Custom Extension: FontFamily

Location: `src/components/ui/FontFamily.ts`

```typescript
import '@tiptap/extension-text-style';
import { Extension } from '@tiptap/core';

export const FontFamily = Extension.create({
  name: 'fontFamily',
  addOptions() {
    return { types: ['textStyle'] };
  },
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          fontFamily: {
            default: null,
            parseHTML: element => element.style.fontFamily,
            renderHTML: attributes => {
              if (!attributes.fontFamily) return {};
              return { style: `font-family: ${attributes.fontFamily}` };
            },
          },
        },
      },
    ];
  },
  addCommands() {
    return {
      setFontFamily:
        (fontFamily: string) =>
        ({ chain }) => {
          return chain().setMark('textStyle', { fontFamily }).run();
        },
      unsetFontFamily:
        () =>
        ({ chain }) => {
          return chain().setMark('textStyle', { fontFamily: null }).removeEmptyTextStyle().run();
        },
    };
  },
});
```

## Custom Extension: FontSize

Location: `src/components/ui/FontSize.ts`

```typescript
import '@tiptap/extension-text-style';
import { Extension } from '@tiptap/core';

export const FontSize = Extension.create({
  name: 'fontSize',
  addOptions() {
    return { types: ['textStyle'] };
  },
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          fontSize: {
            default: null,
            parseHTML: element => element.style.fontSize,
            renderHTML: attributes => {
              if (!attributes.fontSize) return {};
              return { style: `font-size: ${attributes.fontSize}` };
            },
          },
        },
      },
    ];
  },
  addCommands() {
    return {
      setFontSize:
        (fontSize: string) =>
        ({ chain }) => {
          return chain().setMark('textStyle', { fontSize }).run();
        },
      unsetFontSize:
        () =>
        ({ chain }) => {
          return chain().setMark('textStyle', { fontSize: null }).removeEmptyTextStyle().run();
        },
    };
  },
});
```

## Available Options

### Font Sizes

```typescript
['12px', '14px', '16px', '18px', '20px', '24px', '28px', '32px'];
```

### Font Families

```typescript
[
  { label: 'Sans Serif', value: 'sans-serif' },
  { label: 'Serif', value: 'serif' },
  { label: 'Mono', value: 'monospace' },
  { label: 'Arial', value: 'Arial, sans-serif' },
  { label: 'Georgia', value: 'Georgia, serif' },
  { label: 'Times New Roman', value: '"Times New Roman", serif' },
  { label: 'Courier', value: '"Courier New", monospace' },
];
```

### Headings

```typescript
[
  { label: 'Paragraph', level: 0 },
  { label: 'Heading 1', level: 1 },
  { label: 'Heading 2', level: 2 },
  { label: 'Heading 3', level: 3 },
];
```

### Colors

```typescript
[
  { label: 'Black', value: '#000000' },
  { label: 'Dark Gray', value: '#374151' },
  { label: 'Gray', value: '#6b7280' },
  { label: 'Light Gray', value: '#9ca3af' },
  { label: 'White', value: '#ffffff' },
  { label: 'Indigo', value: '#4f46e5' },
  { label: 'Blue', value: '#3b82f6' },
  { label: 'Cyan', value: '#06b6d4' },
  { label: 'Teal', value: '#14b8a6' },
  { label: 'Green', value: '#22c55e' },
  { label: 'Lime', value: '#84cc16' },
  { label: 'Yellow', value: '#eab308' },
  { label: 'Amber', value: '#f59e0b' },
  { label: 'Orange', value: '#f97316' },
  { label: 'Red', value: '#ef4444' },
  { label: 'Pink', value: '#ec4899' },
  { label: 'Purple', value: '#a855f7' },
  { label: 'Violet', value: '#8b5cf6' },
];
```

## Props Interface

```typescript
interface RichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
  onDraftSave?: (html: string) => void;
}
```

## Toolbar Features

| Feature       | Icon             | Action                     |
| ------------- | ---------------- | -------------------------- |
| Bold          | fa-bold          | toggleBold()               |
| Italic        | fa-italic        | toggleItalic()             |
| Underline     | fa-underline     | toggleUnderline()          |
| Strikethrough | fa-strikethrough | toggleStrike()             |
| Highlight     | fa-highlighter   | toggleHighlight()          |
| Font Family   | fa-font          | setFontFamily              |
| Font Size     | fa-text-height   | setFontSize                |
| Text Color    | fa-palette       | setColor                   |
| Align Left    | fa-align-left    | setTextAlign('left')       |
| Align Center  | fa-align-center  | setTextAlign('center')     |
| Align Right   | fa-align-right   | setTextAlign('right')      |
| Heading       | H1/H2/H3/P       | toggleHeading/setParagraph |
| Bullet List   | fa-list-ul       | toggleBulletList()         |
| Ordered List  | fa-list-ol       | toggleOrderedList()        |
| Quote         | fa-quote-right   | toggleBlockquote()         |
| Code Block    | fa-code          | toggleCodeBlock()          |
| Upload Image  | fa-image         | file input                 |
| Media Library | fa-images        | modal                      |
| Undo          | fa-undo          | undo()                     |
| Redo          | fa-redo          | redo()                     |

## Image Upload Requirements

- Max size: 2MB
- Allowed types: `image/jpeg`, `image/png`, `image/gif`, `image/webp`
- Upload endpoint: `/api/upload`

## CSS Classes

Editor container: `border border-gray-300 rounded-lg overflow-hidden`
Editor content: `focus:outline-none min-h-[200px] px-4 py-3`
Toolbar: `bg-gray-50 border-b border-gray-300 px-2 py-1 flex flex-wrap gap-1 items-center`
