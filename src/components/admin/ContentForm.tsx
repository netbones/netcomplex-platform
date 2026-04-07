'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { RichTextEditor } from '@/components/ui/RichTextEditor';
import { TagInput } from '@/components/ui/TagInput';
import { LocaleSelector, LocaleTabs, LocaleBadge } from '@/components/ui/LocaleSelector';
import { authClient } from '@/lib/auth-client';
import {
  supportedLanguages,
  languageNames,
  defaultLanguage,
  type SupportedLanguage,
} from '@/lib/i18n';

interface ContentFormProps {
  initialData?: {
    id?: string;
    category?: string;
    groupId?: string;
    tags?: string[];
    featured?: boolean;
    published?: boolean;
    defaultLocale?: string;
    contentType?: string;
    _raw?: {
      title?: Record<string, string>;
      content?: Record<string, string>;
      excerpt?: Record<string, string>;
    };
  };
  groups?: { id: string; name: string }[];
  baseRedirect?: string;
}

type LocaleContent = Record<string, string>;

const categories = [
  { value: 'NEWS', label: 'News' },
  { value: 'ANNOUNCEMENT', label: 'Announcement' },
  { value: 'EVENT', label: 'Event' },
  { value: 'BLOG', label: 'Blog' },
  { value: 'SERVICE', label: 'Service' },
  { value: 'RESOURCE', label: 'Resource' },
  { value: 'CAMPAIGN', label: 'Campaign' },
  { value: 'CONSERVATION', label: 'Conservation (Sub-category)' },
];

export function ContentForm({ initialData, groups = [], baseRedirect }: ContentFormProps) {
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const [mounted, setMounted] = useState(false);
  const [activeLocale, setActiveLocale] = useState<SupportedLanguage>(
    defaultLanguage as SupportedLanguage
  );
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    category: initialData?.category || 'BLOG',
    groupId: initialData?.groupId || '',
    tags: initialData?.tags || ([] as string[]),
    featured: initialData?.featured || false,
    published: initialData?.published || false,
    defaultLocale: initialData?.defaultLocale || defaultLanguage,
    contentType: initialData?.contentType || 'article',
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  const initialTitles: LocaleContent = initialData?._raw?.title || {
    [defaultLanguage]: '',
  };
  const initialContent: LocaleContent = initialData?._raw?.content || {
    [defaultLanguage]: '',
  };
  const initialExcerpt: LocaleContent = initialData?._raw?.excerpt || {
    [defaultLanguage]: '',
  };

  const [titleContent, setTitleContent] = useState<LocaleContent>(initialTitles);
  const [editorContent, setEditorContent] = useState<LocaleContent>(initialContent);
  const [excerptContent, setExcerptContent] = useState<LocaleContent>(initialExcerpt);

  const handleLocaleChange = useCallback((locale: SupportedLanguage) => {
    setActiveLocale(locale);
  }, []);

  const handleCopyContent = useCallback(
    (targetLocale: SupportedLanguage) => {
      const sourceTitle = titleContent[activeLocale] || '';
      const sourceContent = editorContent[activeLocale] || '';
      const sourceExcerpt = excerptContent[activeLocale] || '';

      setTitleContent(prev => ({ ...prev, [targetLocale]: sourceTitle }));
      setEditorContent(prev => ({ ...prev, [targetLocale]: sourceContent }));
      setExcerptContent(prev => ({ ...prev, [targetLocale]: sourceExcerpt }));

      toast.success(
        `Copied ${languageNames[activeLocale]} content to ${languageNames[targetLocale]}`
      );
    },
    [activeLocale, titleContent, editorContent, excerptContent]
  );

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    const isEditing = !!initialData?.id;
    const loadingToast = toast.loading(isEditing ? 'Updating...' : 'Creating...');

    const payload = {
      title: titleContent,
      content: editorContent,
      excerpt: excerptContent,
      defaultLocale: formData.defaultLocale,
      contentType: formData.contentType,
      category: formData.category,
      groupId: formData.groupId || null,
      tags: formData.tags || [],
      featured: formData.featured,
      published: formData.published,
    };

    try {
      const method = isEditing ? 'PATCH' : 'POST';
      const url = isEditing ? `/api/content/${initialData.id}` : '/api/content';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        toast.success(isEditing ? 'Content updated!' : 'Content created!');
        const redirectTo =
          baseRedirect || (session?.user?.id ? `/resident/${session.user.id}` : '/dashboard');
        router.push(redirectTo);
        router.refresh();
      } else {
        const error = await res.json();
        toast.error(error.error || 'Failed to save content');
      }
    } catch (error) {
      console.error('Error saving content:', error);
      toast.error('Something went wrong');
    } finally {
      toast.dismiss(loadingToast);
      setIsSaving(false);
    }
  };

  const availableLocales = supportedLanguages as readonly SupportedLanguage[];

  const hasTitle = !!titleContent[activeLocale]?.trim();
  const hasContent = !!editorContent[activeLocale]?.trim();

  return (
    <form onSubmit={onSubmit} className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between bg-gray-50 p-3 rounded-lg border border-gray-200">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700">Editing Language:</span>
          <LocaleSelector
            currentLocale={activeLocale}
            availableLocales={availableLocales}
            onLocaleChange={handleLocaleChange}
            onCopyToLocale={handleCopyContent}
          />
        </div>
        <div className="text-xs text-gray-500">{Object.keys(titleContent).length} translations</div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Title ({languageNames[activeLocale]})
        </label>
        <input
          type="text"
          value={titleContent[activeLocale] || ''}
          onChange={e => setTitleContent({ ...titleContent, [activeLocale]: e.target.value })}
          className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          placeholder={`Enter title in ${languageNames[activeLocale]}...`}
        />
        {!hasTitle && (
          <p className="mt-1 text-sm text-amber-600">
            Title is required for {languageNames[activeLocale]}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
          <select
            value={formData.category}
            onChange={e => setFormData({ ...formData, category: e.target.value })}
            className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            {categories.map(cat => (
              <option key={cat.value} value={cat.value}>
                {cat.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Content Type</label>
          <select
            value={formData.contentType}
            onChange={e => setFormData({ ...formData, contentType: e.target.value })}
            className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="article">Article</option>
            <option value="campaign">Campaign</option>
          </select>
        </div>
      </div>

      {groups.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Interest Group (optional)
          </label>
          <select
            value={formData.groupId}
            onChange={e => setFormData({ ...formData, groupId: e.target.value })}
            className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="">None (General)</option>
            {groups.map(group => (
              <option key={group.id} value={group.id}>
                {group.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="flex items-center space-x-6">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={formData.featured}
              onChange={e => setFormData({ ...formData, featured: e.target.checked })}
              className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
            />
            <span className="ml-2 text-sm text-gray-700">Featured</span>
          </label>
        </div>

        <div className="flex items-center space-x-6">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={formData.published}
              onChange={e => setFormData({ ...formData, published: e.target.checked })}
              className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
            />
            <span className="ml-2 text-sm text-gray-700">Published</span>
          </label>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Default Locale</label>
          <select
            value={formData.defaultLocale}
            onChange={e => setFormData({ ...formData, defaultLocale: e.target.value })}
            className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            {supportedLanguages.map(lang => (
              <option key={lang} value={lang}>
                {languageNames[lang as SupportedLanguage]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Excerpt ({languageNames[activeLocale]}) (optional)
        </label>
        <input
          type="text"
          value={excerptContent[activeLocale] || ''}
          onChange={e => setExcerptContent({ ...excerptContent, [activeLocale]: e.target.value })}
          className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          placeholder={`Short summary in ${languageNames[activeLocale]}...`}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Tags</label>
        <TagInput
          tags={formData.tags || []}
          onChange={newTags => setFormData({ ...formData, tags: newTags })}
          placeholder="Add tags for SEO and categorization..."
          maxTags={10}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Content ({languageNames[activeLocale]})
        </label>
        <RichTextEditor
          content={editorContent[activeLocale] || ''}
          onChange={html => setEditorContent({ ...editorContent, [activeLocale]: html })}
        />
        {!hasContent && (
          <p className="mt-1 text-sm text-amber-600">
            Content is required for {languageNames[activeLocale]}
          </p>
        )}
      </div>

      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
        <h3 className="text-sm font-medium text-gray-700 mb-3">Translation Status</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {supportedLanguages.map(lang => {
            const hasLangTitle = !!titleContent[lang]?.trim();
            const hasLangContent = !!editorContent[lang]?.trim();
            return (
              <div
                key={lang}
                className={`p-2 rounded text-center text-xs ${
                  hasLangTitle && hasLangContent
                    ? 'bg-green-100 text-green-700'
                    : hasLangTitle
                      ? 'bg-yellow-100 text-yellow-700'
                      : 'bg-gray-100 text-gray-500'
                }`}
              >
                <span className="font-medium">{languageNames[lang as SupportedLanguage]}</span>
                <div className="mt-1">
                  {hasLangTitle && hasLangContent ? (
                    <span className="text-green-600">✓ Complete</span>
                  ) : hasLangTitle ? (
                    <span className="text-yellow-600">⚠ Title only</span>
                  ) : (
                    <span className="text-gray-400">Missing</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex justify-end space-x-4">
        <button
          type="button"
          onClick={() => router.back()}
          className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSaving || !hasTitle || !hasContent}
          className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
        >
          {isSaving ? 'Saving...' : 'Save Content'}
        </button>
      </div>
    </form>
  );
}
