'use client';

import Image from 'next/image';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { Image as TiptapImage } from '@tiptap/extension-image';
import { ResizableImage } from 'tiptap-extension-resizable-image';
import 'tiptap-extension-resizable-image/styles.css';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import TextAlign from '@tiptap/extension-text-align';
import Highlight from '@tiptap/extension-highlight';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import { Table, TableRow, TableHeader, TableCell } from '@tiptap/extension-table';
import { FontSize } from './FontSize';
import { FontFamily } from './FontFamily';
import { common, createLowlight } from 'lowlight';
import { useEffect, useCallback, useState, useRef } from 'react';
import { toast } from 'sonner';
import { Tooltip, TooltipTrigger, TooltipContent } from './tooltip';

const lowlight = createLowlight(common);

interface RichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
  onDraftSave?: (html: string) => void;
}

const FONT_SIZES = ['12px', '14px', '16px', '18px', '20px', '24px', '28px', '32px'];
const FONT_FAMILIES = [
  { label: 'Sans Serif', value: 'sans-serif' },
  { label: 'Serif', value: 'serif' },
  { label: 'Mono', value: 'monospace' },
  { label: 'Arial', value: 'Arial, sans-serif' },
  { label: 'Georgia', value: 'Georgia, serif' },
  { label: 'Times New Roman', value: '"Times New Roman", serif' },
  { label: 'Courier', value: '"Courier New", monospace' },
];

const HEADINGS = [
  { label: 'Paragraph', level: 0 },
  { label: 'Heading 1', level: 1 },
  { label: 'Heading 2', level: 2 },
  { label: 'Heading 3', level: 3 },
];
const COLORS = [
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

function ToolbarButton({
  title,
  children,
  ...props
}: {
  title: string;
  children: React.ReactNode;
} & React.ComponentPropsWithoutRef<'button'>) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button title={title} {...props}>
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent>{title}</TooltipContent>
    </Tooltip>
  );
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
  const [showMediaLib, setShowMediaLib] = useState(false);
  const [mediaImages, setMediaImages] = useState<string[]>([]);
  const [loadingMedia, setLoadingMedia] = useState(false);
  const [showFontSize, setShowFontSize] = useState(false);
  const [showColor, setShowColor] = useState(false);
  const [showFontFamily, setShowFontFamily] = useState(false);
  const [showHeading, setShowHeading] = useState(false);
  const [showLink, setShowLink] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [showTable, setShowTable] = useState(false);
  const fontSizeRef = useRef<HTMLDivElement>(null);
  const colorRef = useRef<HTMLDivElement>(null);
  const fontFamilyRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLDivElement>(null);
  const linkRef = useRef<HTMLDivElement>(null);
  const tableRef = useRef<HTMLDivElement>(null);

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
      TiptapImage.configure({
        inline: false,
        allowBase64: false,
      }),
      ResizableImage,
      Placeholder.configure({
        placeholder: placeholder || 'Start writing...',
      }),
      TextStyle,
      Color,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Highlight.configure({
        multicolor: true,
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          rel: 'noopener noreferrer',
          target: '_blank',
          class: 'text-indigo-600 underline',
        },
      }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      FontSize,
      FontFamily,
    ],
    content,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'focus:outline-none min-h-[200px] px-4 py-3',
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
    } catch {
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

  const openMediaLibrary = () => {
    setLoadingMedia(true);
    setShowMediaLib(true);
    fetch('/api/media')
      .then(res => res.json())
      .then(data => {
        setMediaImages(data.images || []);
      })
      .catch(() => toast.error('Failed to load media'))
      .finally(() => setLoadingMedia(false));
  };

  const insertFromMediaLib = (url: string) => {
    editor?.chain().focus().setImage({ src: url }).run();
    setShowMediaLib(false);
    toast.success('Image inserted!');
  };

  const handleDraftSave = useCallback(() => {
    if (editor && onDraftSave) {
      onDraftSave(editor.getHTML());
      setLastSaved(new Date());
    }
  }, [editor, onDraftSave]);

  const setFontSize = (size: string) => {
    editor?.chain().focus().setFontSize(size).run();
    setShowFontSize(false);
  };

  const setColor = (color: string) => {
    editor?.chain().focus().setColor(color).run();
    setShowColor(false);
  };

  const setFontFamily = (font: string) => {
    editor?.chain().focus().setFontFamily(font).run();
    setShowFontFamily(false);
  };

  const setHeading = (level: number) => {
    if (!editor) return;
    const chain = editor.chain().focus();
    if (level === 0) {
      chain.setParagraph().run();
    } else {
      chain.toggleHeading({ level: level as 1 | 2 | 3 }).run();
    }
    setShowHeading(false);
  };

  const applyLink = () => {
    if (!editor) return;
    const url = linkUrl.trim();
    if (!url) {
      editor.chain().focus().unsetLink().run();
    } else {
      editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
    }
    setLinkUrl('');
    setShowLink(false);
  };

  const openLinkInput = () => {
    if (!editor) return;
    const existing = editor.getAttributes('link').href as string | undefined;
    setLinkUrl(existing || '');
    setShowLink(true);
    setShowTable(false);
  };

  const insertTable = () => {
    editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
    setShowTable(false);
  };

  const addRowAfter = () => {
    editor?.chain().focus().addRowAfter().run();
  };

  const addColumnAfter = () => {
    editor?.chain().focus().addColumnAfter().run();
  };

  const deleteTable = () => {
    editor?.chain().focus().deleteTable().run();
    setShowTable(false);
  };

  const getCurrentHeading = () => {
    if (!editor) return 'H';
    if (editor.isActive('paragraph')) return 'P';
    if (editor.isActive('heading', { level: 1 })) return 'H1';
    if (editor.isActive('heading', { level: 2 })) return 'H2';
    if (editor.isActive('heading', { level: 3 })) return 'H3';
    return 'H';
  };

  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (fontSizeRef.current && !fontSizeRef.current.contains(e.target as Node)) {
        setShowFontSize(false);
      }
      if (colorRef.current && !colorRef.current.contains(e.target as Node)) {
        setShowColor(false);
      }
      if (fontFamilyRef.current && !fontFamilyRef.current.contains(e.target as Node)) {
        setShowFontFamily(false);
      }
      if (linkRef.current && !linkRef.current.contains(e.target as Node)) {
        setShowLink(false);
      }
      if (tableRef.current && !tableRef.current.contains(e.target as Node)) {
        setShowTable(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!editor) {
    return (
      <div className="border border-gray-300 rounded-lg min-h-[200px] bg-gray-50 animate-pulse"></div>
    );
  }

  return (
    <div className="border border-gray-300 rounded-lg overflow-hidden">
      <div className="bg-gray-50 border-b border-gray-300 px-2 py-1 flex flex-wrap gap-1 items-center">
        {/* Text formatting */}
        <ToolbarButton
          title="Bold (Ctrl+B)"
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`p-2 rounded hover:bg-gray-200 ${editor.isActive('bold') ? 'bg-gray-200' : ''}`}
        >
          <i className="fas fa-bold"></i>
        </ToolbarButton>
        <ToolbarButton
          title="Italic (Ctrl+I)"
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`p-2 rounded hover:bg-gray-200 ${editor.isActive('italic') ? 'bg-gray-200' : ''}`}
        >
          <i className="fas fa-italic"></i>
        </ToolbarButton>
        <ToolbarButton
          title="Underline (Ctrl+U)"
          type="button"
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          className={`p-2 rounded hover:bg-gray-200 ${editor.isActive('underline') ? 'bg-gray-200' : ''}`}
        >
          <i className="fas fa-underline"></i>
        </ToolbarButton>
        <ToolbarButton
          title="Strikethrough"
          type="button"
          onClick={() => editor.chain().focus().toggleStrike().run()}
          className={`p-2 rounded hover:bg-gray-200 ${editor.isActive('strike') ? 'bg-gray-200' : ''}`}
        >
          <i className="fas fa-strikethrough"></i>
        </ToolbarButton>
        <ToolbarButton
          title="Highlight"
          type="button"
          onClick={() => editor.chain().focus().toggleHighlight().run()}
          className={`p-2 rounded hover:bg-gray-200 ${editor.isActive('highlight') ? 'bg-yellow-200' : ''}`}
        >
          <i className="fas fa-highlighter"></i>
        </ToolbarButton>

        {/* Font Family */}
        <div className="relative" ref={fontFamilyRef}>
          <ToolbarButton
            title="Font Family"
            type="button"
            onClick={() => {
              setShowFontFamily(!showFontFamily);
              setShowFontSize(false);
              setShowColor(false);
            }}
            className="p-2 rounded hover:bg-gray-200 text-sm font-medium"
          >
            <i className="fas fa-font"></i>
          </ToolbarButton>
          {showFontFamily && (
            <div className="absolute top-full left-0 mt-1 bg-white border rounded-lg shadow-lg z-20 p-2 min-w-[150px]">
              {FONT_FAMILIES.map(font => (
                <button
                  key={font.value}
                  onClick={() => setFontFamily(font.value)}
                  className={`w-full text-left px-3 py-2 text-sm rounded hover:bg-gray-100 ${
                    editor.isActive('textStyle', { fontFamily: font.value })
                      ? 'bg-indigo-100 text-indigo-700'
                      : ''
                  }`}
                  style={{ fontFamily: font.value }}
                >
                  {font.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <span className="w-px h-6 bg-gray-300 mx-1"></span>

        {/* Font size */}
        <div className="relative" ref={fontSizeRef}>
          <ToolbarButton
            title="Font Size"
            type="button"
            onClick={() => {
              setShowFontSize(!showFontSize);
              setShowColor(false);
              setShowFontFamily(false);
            }}
            className="p-2 rounded hover:bg-gray-200 text-sm font-medium"
          >
            <i className="fas fa-text-height"></i>
          </ToolbarButton>
          {showFontSize && (
            <div className="absolute top-full left-0 mt-1 bg-white border rounded-lg shadow-lg z-20 p-2 grid grid-cols-2 gap-1 min-w-[120px]">
              {FONT_SIZES.map(size => (
                <button
                  key={size}
                  onClick={() => setFontSize(size)}
                  className={`px-3 py-1 text-sm rounded hover:bg-gray-100 ${
                    editor.isActive('textStyle', { fontSize: size })
                      ? 'bg-indigo-100 text-indigo-700'
                      : ''
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Color */}
        <div className="relative" ref={colorRef}>
          <ToolbarButton
            title="Text Color"
            type="button"
            onClick={() => {
              setShowColor(!showColor);
              setShowFontSize(false);
              setShowFontFamily(false);
            }}
            className="p-2 rounded hover:bg-gray-200"
          >
            <i className="fas fa-palette"></i>
          </ToolbarButton>
          {showColor && (
            <div className="absolute top-full left-0 mt-1 bg-white border rounded-lg shadow-lg z-20 p-3 min-w-[200px]">
              <p className="text-xs text-gray-500 mb-2">Text Color</p>
              <div className="grid grid-cols-6 gap-2">
                {COLORS.map(color => (
                  <Tooltip key={color.value}>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => setColor(color.value)}
                        className="w-8 h-8 rounded-lg border-2 hover:scale-110 transition-transform shadow-sm"
                        style={{ backgroundColor: color.value }}
                      />
                    </TooltipTrigger>
                    <TooltipContent>{color.label}</TooltipContent>
                  </Tooltip>
                ))}
              </div>
            </div>
          )}
        </div>

        <span className="w-px h-6 bg-gray-300 mx-1"></span>

        {/* Alignment */}
        <ToolbarButton
          title="Align Left"
          type="button"
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
          className={`p-2 rounded hover:bg-gray-200 ${editor.isActive({ textAlign: 'left' }) ? 'bg-gray-200' : ''}`}
        >
          <i className="fas fa-align-left"></i>
        </ToolbarButton>
        <ToolbarButton
          title="Align Center"
          type="button"
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
          className={`p-2 rounded hover:bg-gray-200 ${editor.isActive({ textAlign: 'center' }) ? 'bg-gray-200' : ''}`}
        >
          <i className="fas fa-align-center"></i>
        </ToolbarButton>
        <ToolbarButton
          title="Align Right"
          type="button"
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
          className={`p-2 rounded hover:bg-gray-200 ${editor.isActive({ textAlign: 'right' }) ? 'bg-gray-200' : ''}`}
        >
          <i className="fas fa-align-right"></i>
        </ToolbarButton>

        <span className="w-px h-6 bg-gray-300 mx-1"></span>

        {/* Heading dropdown */}
        <div className="relative" ref={headingRef}>
          <ToolbarButton
            title="Heading"
            type="button"
            onClick={() => {
              setShowHeading(!showHeading);
              setShowFontFamily(false);
              setShowFontSize(false);
              setShowColor(false);
            }}
            className="p-2 rounded hover:bg-gray-200 text-xs font-bold"
          >
            {getCurrentHeading()}
          </ToolbarButton>
          {showHeading && (
            <div className="absolute top-full left-0 mt-1 bg-white border rounded-lg shadow-lg z-20 p-1 min-w-[120px]">
              {HEADINGS.map(h => (
                <button
                  key={h.level}
                  onClick={() => setHeading(h.level)}
                  className={`w-full text-left px-3 py-2 text-sm rounded hover:bg-gray-100 ${
                    (h.level === 0 && !editor.isActive('heading')) ||
                    (h.level > 0 && editor.isActive('heading', { level: h.level }))
                      ? 'bg-indigo-100 text-indigo-700'
                      : ''
                  }`}
                >
                  {h.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <span className="w-px h-6 bg-gray-300 mx-1"></span>

        {/* Lists */}
        <ToolbarButton
          title="Bullet List"
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`p-2 rounded hover:bg-gray-200 ${editor.isActive('bulletList') ? 'bg-gray-200' : ''}`}
        >
          <i className="fas fa-list-ul"></i>
        </ToolbarButton>
        <ToolbarButton
          title="Numbered List"
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`p-2 rounded hover:bg-gray-200 ${editor.isActive('orderedList') ? 'bg-gray-200' : ''}`}
        >
          <i className="fas fa-list-ol"></i>
        </ToolbarButton>

        <span className="w-px h-6 bg-gray-300 mx-1"></span>

        {/* Blocks */}
        <ToolbarButton
          title="Quote"
          type="button"
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={`p-2 rounded hover:bg-gray-200 ${editor.isActive('blockquote') ? 'bg-gray-200' : ''}`}
        >
          <i className="fas fa-quote-right"></i>
        </ToolbarButton>
        <ToolbarButton
          title="Code Block"
          type="button"
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          className={`p-2 rounded hover:bg-gray-200 ${editor.isActive('codeBlock') ? 'bg-gray-200' : ''}`}
        >
          <i className="fas fa-code"></i>
        </ToolbarButton>

        <span className="w-px h-6 bg-gray-300 mx-1"></span>

        {/* Link */}
        <div className="relative" ref={linkRef}>
          <ToolbarButton
            title="Insert Link"
            type="button"
            onClick={openLinkInput}
            className={`p-2 rounded hover:bg-gray-200 ${editor.isActive('link') ? 'bg-gray-200' : ''}`}
          >
            <i className="fas fa-link"></i>
          </ToolbarButton>
          {showLink && (
            <div className="absolute top-full left-0 mt-1 bg-white border rounded-lg shadow-lg z-20 p-2 min-w-[280px]">
              <div className="flex items-center gap-2">
                <input
                  type="url"
                  value={linkUrl}
                  onChange={e => setLinkUrl(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      applyLink();
                    } else if (e.key === 'Escape') {
                      setShowLink(false);
                      setLinkUrl('');
                    }
                  }}
                  placeholder="https://example.com"
                  className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded focus:border-indigo-500 focus:outline-none"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={applyLink}
                  className="px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 rounded hover:bg-indigo-700"
                >
                  Apply
                </button>
              </div>
              {editor.isActive('link') && (
                <button
                  type="button"
                  onClick={() => {
                    editor.chain().focus().unsetLink().run();
                    setShowLink(false);
                    setLinkUrl('');
                  }}
                  className="mt-2 text-xs text-red-600 hover:text-red-800"
                >
                  Remove link
                </button>
              )}
            </div>
          )}
        </div>

        {/* Table */}
        <div className="relative" ref={tableRef}>
          <ToolbarButton
            title="Table"
            type="button"
            onClick={() => {
              setShowTable(!showTable);
              setShowLink(false);
            }}
            className={`p-2 rounded hover:bg-gray-200 ${editor.isActive('table') ? 'bg-gray-200' : ''}`}
          >
            <i className="fas fa-table"></i>
          </ToolbarButton>
          {showTable && (
            <div className="absolute top-full left-0 mt-1 bg-white border rounded-lg shadow-lg z-20 p-1 min-w-[160px]">
              <button
                onClick={insertTable}
                className="w-full text-left px-3 py-2 text-sm rounded hover:bg-gray-100"
              >
                Insert Table (3×3)
              </button>
              {editor.isActive('table') && (
                <>
                  <div className="border-t border-gray-100 my-1"></div>
                  <button
                    onClick={addRowAfter}
                    className="w-full text-left px-3 py-2 text-sm rounded hover:bg-gray-100"
                  >
                    Add Row Below
                  </button>
                  <button
                    onClick={addColumnAfter}
                    className="w-full text-left px-3 py-2 text-sm rounded hover:bg-gray-100"
                  >
                    Add Column Right
                  </button>
                  <div className="border-t border-gray-100 my-1"></div>
                  <button
                    onClick={deleteTable}
                    className="w-full text-left px-3 py-2 text-sm rounded hover:bg-gray-100 text-red-600"
                  >
                    Delete Table
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        <span className="w-px h-6 bg-gray-300 mx-1"></span>

        {/* Images */}
        <ToolbarButton
          title="Upload Image"
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className={`p-2 rounded hover:bg-gray-200 ${uploading ? 'opacity-50' : ''}`}
        >
          {uploading ? (
            <i className="fas fa-spinner fa-spin"></i>
          ) : (
            <i className="fas fa-image"></i>
          )}
        </ToolbarButton>
        <ToolbarButton
          title="Media Library"
          type="button"
          onClick={openMediaLibrary}
          className="p-2 rounded hover:bg-gray-200"
        >
          <i className="fas fa-images"></i>
        </ToolbarButton>

        <span className="w-px h-6 bg-gray-300 mx-1"></span>

        {/* Undo/Redo */}
        <ToolbarButton
          title="Undo (Ctrl+Z)"
          type="button"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          className="p-2 rounded hover:bg-gray-200 disabled:opacity-50"
        >
          <i className="fas fa-undo"></i>
        </ToolbarButton>
        <ToolbarButton
          title="Redo (Ctrl+Shift+Z)"
          type="button"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          className="p-2 rounded hover:bg-gray-200 disabled:opacity-50"
        >
          <i className="fas fa-redo"></i>
        </ToolbarButton>

        {onDraftSave && (
          <>
            <span className="w-px h-6 bg-gray-300 mx-1"></span>
            <ToolbarButton
              title="Save Draft"
              type="button"
              onClick={handleDraftSave}
              className="px-3 py-1 text-sm bg-indigo-100 text-indigo-700 rounded hover:bg-indigo-200"
            >
              Save Draft
            </ToolbarButton>
          </>
        )}
        {lastSaved && (
          <span className="ml-2 text-xs text-gray-500">Saved {lastSaved.toLocaleTimeString()}</span>
        )}
      </div>
      <EditorContent editor={editor} />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        className="hidden"
        onChange={handleFileSelect}
      />

      {showMediaLib && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="font-semibold">Media Library</h3>
              <button
                onClick={() => setShowMediaLib(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="p-4 overflow-y-auto max-h-[60vh]">
              {loadingMedia ? (
                <div className="text-center py-8">Loading...</div>
              ) : mediaImages.length === 0 ? (
                <p className="text-center text-gray-500 py-8">
                  No images in your library. Upload some first!
                </p>
              ) : (
                <div className="grid grid-cols-4 gap-2">
                  {mediaImages.map((url, idx) => (
                    <button
                      key={idx}
                      onClick={() => insertFromMediaLib(url)}
                      className="aspect-square rounded overflow-hidden border-2 border-transparent hover:border-indigo-500 transition-colors"
                    >
                      <Image
                        src={url}
                        alt={`Image ${idx + 1}`}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
