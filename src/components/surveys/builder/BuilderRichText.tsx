'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Underline from '@tiptap/extension-underline';
import Placeholder from '@tiptap/extension-placeholder';
import { useEffect, useState } from 'react';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Image as ImageIcon,
  List,
  ListOrdered,
} from 'lucide-react';
import { logError } from '@shared/lib';

interface BuilderRichTextProps {
  /** Initial HTML or plain-text content for the editor. */
  value: string;
  /** Fires on every edit with the new HTML. */
  onChange: (html: string) => void;
  /** Placeholder shown when the editor is empty. */
  placeholder?: string;
  /** Optional aria-label for the editor surface. */
  ariaLabel?: string;
  /** Compact mode: smaller padding / icons (used inside tight UI). */
  compact?: boolean;
}

/**
 * Slim TipTap editor tailored for the survey builder.
 *
 * Intentionally minimal compared to the global RichTextEditor:
 *   - Bold, Italic, Underline
 *   - Bullet list, ordered list
 *   - Image (URL-based; admin enters a URL via prompt)
 *   - Placeholder
 *
 * No font picker, color, code blocks, media library, etc. — those are
 * overkill for survey/section descriptions. The plan defers file
 * upload for image embedding; URL-based images are the launch contract.
 */
export function BuilderRichText({
  value,
  onChange,
  placeholder = 'Add a description...',
  ariaLabel,
  compact = false,
}: BuilderRichTextProps) {
  const [showImagePrompt, setShowImagePrompt] = useState(false);
  const [imageUrl, setImageUrl] = useState('');

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        codeBlock: false,
        horizontalRule: false,
        blockquote: false,
      }),
      Underline,
      Image.configure({
        inline: false,
        allowBase64: false,
        HTMLAttributes: {
          class: 'rounded-md max-w-full h-auto my-2',
        },
      }),
      Placeholder.configure({ placeholder }),
    ],
    content: value,
    immediatelyRender: false,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: {
        class: `focus:outline-none prose prose-sm max-w-none ${compact ? 'min-h-[60px] px-2 py-1' : 'min-h-[100px] px-3 py-2'}`,
        'aria-label': ariaLabel ?? 'Rich text editor',
      },
    },
  });

  // Sync external value → editor content (e.g., after a reload)
  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value || '');
    }
  }, [value, editor]);

  const handleInsertImage = () => {
    const url = imageUrl.trim();
    if (!url) {
      setShowImagePrompt(false);
      return;
    }
    try {
      // Basic URL validation
      new URL(url);
    } catch {
      logError({ component: 'BuilderRichText', operation: 'insertImage' }, 'Invalid image URL', {
        url,
      });
      setImageUrl('');
      setShowImagePrompt(false);
      return;
    }
    editor?.chain().focus().setImage({ src: url }).run();
    setImageUrl('');
    setShowImagePrompt(false);
  };

  if (!editor) {
    return (
      <div
        className={`border border-gray-200 rounded-md bg-gray-50 animate-pulse ${
          compact ? 'min-h-[80px]' : 'min-h-[120px]'
        }`}
      />
    );
  }

  return (
    <div
      className="border border-gray-200 rounded-md bg-white focus-within:border-indigo-400 focus-within:ring-1 focus-within:ring-indigo-200"
      data-no-dnd="true"
    >
      <div className="flex flex-wrap items-center gap-0.5 px-2 py-1 border-b border-gray-100 bg-gray-50/60">
        <ToolbarButton
          active={editor.isActive('bold')}
          onClick={() => editor.chain().focus().toggleBold().run()}
          title="Bold (Ctrl+B)"
          label="Bold"
        >
          <Bold size={14} />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive('italic')}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          title="Italic (Ctrl+I)"
          label="Italic"
        >
          <Italic size={14} />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive('underline')}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          title="Underline (Ctrl+U)"
          label="Underline"
        >
          <UnderlineIcon size={14} />
        </ToolbarButton>
        <ToolbarDivider />
        <ToolbarButton
          active={editor.isActive('bulletList')}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          title="Bullet list"
          label="Bullet list"
        >
          <List size={14} />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive('orderedList')}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          title="Numbered list"
          label="Numbered list"
        >
          <ListOrdered size={14} />
        </ToolbarButton>
        <ToolbarDivider />
        <ToolbarButton
          active={showImagePrompt}
          onClick={() => setShowImagePrompt(v => !v)}
          title="Insert image by URL"
          label="Insert image"
        >
          <ImageIcon size={14} />
        </ToolbarButton>
      </div>

      {showImagePrompt && (
        <div className="flex flex-wrap items-center gap-2 px-2 py-1.5 border-b border-gray-100 bg-indigo-50/40">
          <input
            type="url"
            value={imageUrl}
            onChange={e => setImageUrl(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleInsertImage();
              } else if (e.key === 'Escape') {
                setShowImagePrompt(false);
                setImageUrl('');
              }
            }}
            placeholder="https://example.com/image.png"
            className="flex-1 min-w-[200px] px-2 py-1 text-sm border border-gray-300 rounded focus:border-indigo-500 focus:outline-none"
            autoFocus
          />
          <button
            type="button"
            onClick={handleInsertImage}
            className="px-2 py-1 text-xs font-medium text-white bg-indigo-600 rounded hover:bg-indigo-700"
          >
            Insert
          </button>
          <button
            type="button"
            onClick={() => {
              setShowImagePrompt(false);
              setImageUrl('');
            }}
            className="px-2 py-1 text-xs text-gray-600 hover:text-gray-800"
          >
            Cancel
          </button>
        </div>
      )}

      <EditorContent editor={editor} />
    </div>
  );
}

function ToolbarButton({
  active,
  onClick,
  title,
  label,
  children,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={label}
      aria-pressed={active}
      className={`p-1.5 rounded text-gray-600 hover:bg-gray-200 transition-colors ${
        active ? 'bg-indigo-100 text-indigo-700' : ''
      }`}
    >
      {children}
    </button>
  );
}

function ToolbarDivider() {
  return <span className="w-px h-4 bg-gray-300 mx-0.5" aria-hidden="true" />;
}
