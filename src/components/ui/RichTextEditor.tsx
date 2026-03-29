'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import Image from '@tiptap/extension-image';
import { common, createLowlight } from 'lowlight';
import { useEffect, useCallback, useState, useRef } from 'react';
import { toast } from 'sonner';

const lowlight = createLowlight(common);

interface RichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
  onDraftSave?: (html: string) => void;
}

export function RichTextEditor({
  content,
  onChange,
  placeholder,
  onDraftSave,
}: RichTextEditorProps) {
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
        bulletList: {
          HTMLAttributes: {
            class: 'list-disc pl-6',
          },
        },
        orderedList: {
          HTMLAttributes: {
            class: 'list-decimal pl-6',
          },
        },
        blockquote: {
          HTMLAttributes: {
            class: 'border-l-4 border-gray-400 pl-4 italic text-gray-600 my-4',
          },
        },
        codeBlock: false,
      }),
      CodeBlockLowlight.configure({
        lowlight,
      }),
      Image.configure({
        inline: false,
        allowBase64: false,
      }),
      Placeholder.configure({
        placeholder: placeholder || 'Start writing...',
      }),
    ],
    content,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class:
          'prose prose-sm sm:prose lg:prose-lg xl:prose-xl focus:outline-none min-h-[200px] px-4 py-3',
      },
    },
  });

  const handleImageUpload = async (file: File) => {
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image too large. Maximum size is 2MB.');
      return;
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Invalid file type. Allowed: JPEG, PNG, GIF, WebP');
      return;
    }

    setUploading(true);
    const loadingToast = toast.loading('Uploading image...');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        editor?.chain().focus().setImage({ src: data.url }).run();
        toast.success('Image uploaded!');
      } else {
        const error = await res.json();
        toast.error(error.error || 'Failed to upload image');
      }
    } catch (e) {
      toast.error('Failed to upload image');
    } finally {
      setUploading(false);
      toast.dismiss(loadingToast);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleImageUpload(file);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDraftSave = useCallback(() => {
    if (editor && onDraftSave) {
      onDraftSave(editor.getHTML());
      setLastSaved(new Date());
    }
  }, [editor, onDraftSave]);

  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  if (!editor) {
    return (
      <div className="border border-gray-300 rounded-lg min-h-[200px] bg-gray-50 animate-pulse"></div>
    );
  }

  return (
    <div className="border border-gray-300 rounded-lg overflow-hidden">
      <div className="bg-gray-50 border-b border-gray-300 px-2 py-1 flex flex-wrap gap-1 items-center">
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`p-2 rounded hover:bg-gray-200 ${editor.isActive('bold') ? 'bg-gray-200' : ''}`}
          title="Bold"
        >
          <i className="fas fa-bold"></i>
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`p-2 rounded hover:bg-gray-200 ${editor.isActive('italic') ? 'bg-gray-200' : ''}`}
          title="Italic"
        >
          <i className="fas fa-italic"></i>
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={`p-2 rounded hover:bg-gray-200 ${editor.isActive('heading', { level: 2 }) ? 'bg-gray-200' : ''}`}
          title="Heading"
        >
          <i className="fas fa-heading"></i>
        </button>
        <span className="w-px h-6 bg-gray-300 mx-1"></span>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`p-2 rounded hover:bg-gray-200 ${editor.isActive('bulletList') ? 'bg-gray-200' : ''}`}
          title="Bullet List"
        >
          <i className="fas fa-list-ul"></i>
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`p-2 rounded hover:bg-gray-200 ${editor.isActive('orderedList') ? 'bg-gray-200' : ''}`}
          title="Numbered List"
        >
          <i className="fas fa-list-ol"></i>
        </button>
        <span className="w-px h-6 bg-gray-300 mx-1"></span>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={`p-2 rounded hover:bg-gray-200 ${editor.isActive('blockquote') ? 'bg-gray-200' : ''}`}
          title="Quote"
        >
          <i className="fas fa-quote-right"></i>
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          className={`p-2 rounded hover:bg-gray-200 ${editor.isActive('codeBlock') ? 'bg-gray-200' : ''}`}
          title="Code Block"
        >
          <i className="fas fa-code"></i>
        </button>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className={`p-2 rounded hover:bg-gray-200 ${uploading ? 'opacity-50' : ''}`}
          title="Insert Image"
        >
          {uploading ? (
            <i className="fas fa-spinner fa-spin"></i>
          ) : (
            <i className="fas fa-image"></i>
          )}
        </button>
        <span className="w-px h-6 bg-gray-300 mx-1"></span>
        <button
          type="button"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          className="p-2 rounded hover:bg-gray-200 disabled:opacity-50"
          title="Undo"
        >
          <i className="fas fa-undo"></i>
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          className="p-2 rounded hover:bg-gray-200 disabled:opacity-50"
          title="Redo"
        >
          <i className="fas fa-redo"></i>
        </button>
        {onDraftSave && (
          <>
            <span className="w-px h-6 bg-gray-300 mx-1"></span>
            <button
              type="button"
              onClick={handleDraftSave}
              className="px-3 py-1 text-sm bg-indigo-100 text-indigo-700 rounded hover:bg-indigo-200"
              title="Save Draft"
            >
              Save Draft
            </button>
          </>
        )}
        {lastSaved && (
          <span className="ml-2 text-xs text-gray-500">Saved {lastSaved.toLocaleTimeString()}</span>
        )}
      </div>
      <EditorContent editor={editor} />
      <style jsx global>{`
        .ProseMirror ul {
          list-style-type: disc;
          padding-left: 1.5rem;
        }
        .ProseMirror ol {
          list-style-type: decimal;
          padding-left: 1.5rem;
        }
        .ProseMirror li {
          margin-bottom: 0.25rem;
        }
        .ProseMirror blockquote {
          border-left: 4px solid #9ca3af;
          padding-left: 1rem;
          font-style: italic;
          color: #4b5563;
          margin: 1rem 0;
        }
        .ProseMirror pre {
          background: #1f2937;
          color: #e5e7eb;
          padding: 1rem;
          border-radius: 0.5rem;
          font-family: 'Fira Code', 'Consolas', monospace;
          font-size: 0.875rem;
          overflow-x: auto;
          margin: 1rem 0;
        }
        .ProseMirror pre code {
          background: transparent;
          padding: 0;
          color: inherit;
        }
        .ProseMirror code {
          background: #e5e7eb;
          padding: 0.125rem 0.25rem;
          border-radius: 0.25rem;
          font-family: 'Fira Code', 'Consolas', monospace;
          font-size: 0.875rem;
          color: #dc2626;
        }
        .ProseMirror p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          color: #9ca3af;
          pointer-events: none;
          float: left;
          height: 0;
        }
        /* Syntax highlighting theme */
        .hljs-keyword,
        .hljs-selector-tag {
          color: #c084fc;
        }
        .hljs-string,
        .hljs-attr {
          color: #86efac;
        }
        .hljs-number,
        .hljs-literal {
          color: #fb923c;
        }
        .hljs-comment {
          color: #6b7280;
          font-style: italic;
        }
        .hljs-function,
        .hljs-title {
          color: #60a5fa;
        }
        .hljs-variable,
        .hljs-name {
          color: #f472b6;
        }
        .hljs-built_in {
          color: #34d399;
        }
        .hljs-type {
          color: #fbbf24;
        }
        .ProseMirror img {
          max-width: 100%;
          height: auto;
          border-radius: 0.5rem;
          margin: 1rem 0;
        }
      `}</style>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        className="hidden"
        onChange={handleFileSelect}
      />
    </div>
  );
}
