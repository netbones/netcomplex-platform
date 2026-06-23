'use client';

import { useRouter } from 'next/navigation';
import { useState, useCallback, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toastPromise, ToastMsg } from '@shared/lib/hooks';
import { AlertTriangle } from 'lucide-react';
import { LocaleAwareEditor, LocaleAwareInput } from '@features/i18n';
import { TagInput } from '@shared/ui';
import { authClient } from '@api/client';
import {
  supportedLanguages,
  languageNames,
  defaultLanguage,
  type SupportedLanguage,
} from '@/shared/lib/i18n';
import { contentSchema, type ContentFormData } from '@entities/content';

interface ContentFormProps {
  initialData?: {
    id?: string;
    category?: string;
    groupId?: string | null;
    tags?: string[];
    featured?: boolean;
    published?: boolean;
    defaultLocale?: string;
    contentType?: string;
    title?: Record<string, string>;
    content?: Record<string, string>;
    excerpt?: Record<string, string>;
  };
  groups?: { id: string; name: string }[];
  baseRedirect?: string;
}

const categories = [
  { value: 'NEWS', label: 'News' },
  { value: 'ANNOUNCEMENT', label: 'Announcement' },
  { value: 'EVENT', label: 'Event' },
  { value: 'BLOG', label: 'Blog' },
  { value: 'SERVICE', label: 'Service' },
  { value: 'RESOURCE', label: 'Resource' },
  { value: 'CAMPAIGN', label: 'Campaign' },
  { value: 'CONSERVATION', label: 'Conservation (Sub-category)' },
] as const;

function getInitialDefaultValues(initialData?: ContentFormProps['initialData']): ContentFormData {
  // Convert Date objects to datetime-local format for the inputs
  const formatForInput = (date: unknown): string => {
    if (!date) return '';
    const d =
      typeof date === 'string'
        ? new Date(date)
        : date instanceof Date
          ? date
          : new Date(String(date));
    // datetime-local expects YYYY-MM-DDTHH:MM format
    return d.toISOString().slice(0, 16);
  };

  const initialDataRecord = initialData as Record<string, unknown> | undefined;

  return {
    title: initialData?.title || { [defaultLanguage]: '' },
    content: initialData?.content || { [defaultLanguage]: '' },
    excerpt: initialData?.excerpt || {},
    category: (initialData?.category as ContentFormData['category']) || 'BLOG',
    groupId: initialData?.groupId || null,
    tags: initialData?.tags || [],
    featured: initialData?.featured || false,
    published: initialData?.published || false,
    defaultLocale: initialData?.defaultLocale || defaultLanguage,
    contentType: (initialData?.contentType as ContentFormData['contentType']) || 'article',
    publishedAt: formatForInput(initialDataRecord?.publishedAt),
    expiresAt: formatForInput(initialDataRecord?.expiresAt),
  };
}

export function ContentForm({ initialData, groups = [], baseRedirect }: ContentFormProps) {
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const [activeLocale, setActiveLocale] = useState<SupportedLanguage>(
    defaultLanguage as SupportedLanguage
  );

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ContentFormData>({
    resolver: zodResolver(contentSchema),
    defaultValues: getInitialDefaultValues(initialData),
  });

  const formValues = watch();
  const isEditing = !!initialData?.id;

  // Track whether the current locale's content has unsaved changes
  const [localeDirtyState, setLocaleDirtyState] = useState<Record<string, boolean>>({});
  const [pendingLocaleChange, setPendingLocaleChange] = useState<SupportedLanguage | null>(null);

  // Mark current locale as dirty when content changes (skip initial render)
  const isInitialRender = useRef(true);
  useEffect(() => {
    if (isInitialRender.current) {
      isInitialRender.current = false;
      return;
    }
    const hasTitle = !!formValues.title?.[activeLocale]?.trim();
    const hasContent = !!formValues.content?.[activeLocale]?.trim();
    if (hasTitle || hasContent) {
      setLocaleDirtyState(prev => ({ ...prev, [activeLocale]: true }));
    }
  }, [formValues.title, formValues.content, activeLocale]);

  const switchLocale = useCallback((locale: SupportedLanguage) => {
    setActiveLocale(locale);
    setPendingLocaleChange(null);
  }, []);

  const handleLocaleChange = useCallback(
    (locale: SupportedLanguage) => {
      if (locale === activeLocale) return;
      if (localeDirtyState[activeLocale]) {
        setPendingLocaleChange(locale);
      } else {
        switchLocale(locale);
      }
    },
    [activeLocale, localeDirtyState, switchLocale]
  );

  const onSubmit = async (data: ContentFormData) => {
    await toastPromise(
      (async () => {
        const method = isEditing ? 'PATCH' : 'POST';
        const url = isEditing ? `/api/content/${initialData.id}` : '/api/content';

        const body = {
          ...data,
          publishedAt: data.publishedAt ? new Date(data.publishedAt) : null,
          expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
        };

        const res = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });

        if (!res.ok) {
          const error = await res.json();
          throw new Error(error.error || ToastMsg.failedToSave('content'));
        }

        setLocaleDirtyState(prev => ({ ...prev, [activeLocale]: false }));
        const redirectTo =
          baseRedirect || (session?.user?.id ? `/resident/${session.user.id}` : '/dashboard');
        router.push(redirectTo);
        router.refresh();
      })(),
      {
        loading: isEditing ? 'Updating...' : 'Creating...',
        success: isEditing ? ToastMsg.updated('Content') : ToastMsg.created('Content'),
        error: ToastMsg.failedToSave('content'),
        component: 'ContentForm',
      }
    );
  };

  const titleError = errors.title?.message;
  const contentError = errors.content?.message;
  const categoryError = errors.category?.message;
  const tagsError = errors.tags?.message;

  const hasContentForActiveLocale = !!formValues.content?.[activeLocale]?.trim();

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between bg-gray-50 p-3 rounded-lg border border-gray-200">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700">Translation Status:</span>
          <span className="text-xs text-gray-500">
            {Object.keys(formValues.title || {}).length} locales active
          </span>
        </div>
        <div className="text-xs text-gray-500">
          {Object.keys(formValues.title || {}).length} translations
        </div>
      </div>

      {pendingLocaleChange && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-yellow-800">Unsaved Changes</p>
              <p className="text-sm text-yellow-700 mt-1">
                Unsaved changes. Switching locales will discard your changes. Save before
                continuing.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 ml-4 flex-shrink-0">
            <button
              type="button"
              onClick={() => setPendingLocaleChange(null)}
              className="px-3 py-1.5 text-sm border border-yellow-300 rounded-lg text-yellow-700 hover:bg-yellow-100"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => pendingLocaleChange && switchLocale(pendingLocaleChange)}
              className="px-3 py-1.5 text-sm bg-yellow-600 text-white rounded-lg hover:bg-yellow-700"
            >
              Discard &amp; Switch
            </button>
          </div>
        </div>
      )}

      <div>
        <LocaleAwareInput
          value={formValues.title || {}}
          onChange={newTitle => setValue('title', newTitle, { shouldValidate: true })}
          placeholder="Enter title..."
          label={`Title ${(<span className="text-red-500">*</span>)}`}
          currentLocale={activeLocale}
          onLocaleChange={handleLocaleChange}
        />
        {typeof titleError === 'string' && (
          <p className="mt-1 text-sm text-red-600">{titleError}</p>
        )}
        {!titleError && !formValues.title?.[activeLocale]?.trim() && isSubmitting && (
          <p className="mt-1 text-sm text-red-600">
            Title is required for {languageNames[activeLocale]}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
          <select
            {...register('category')}
            className={`w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
              categoryError ? 'border-red-300' : 'border-gray-300'
            }`}
          >
            {categories.map(cat => (
              <option key={cat.value} value={cat.value}>
                {cat.label}
              </option>
            ))}
          </select>
          {categoryError && <p className="mt-1 text-sm text-red-600">{categoryError}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Content Type</label>
          <select
            {...register('contentType')}
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
            {...register('groupId')}
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
              {...register('featured')}
              className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
            />
            <span className="ml-2 text-sm text-gray-700">Featured</span>
          </label>
        </div>

        <div className="flex items-center space-x-6">
          <label className="flex items-center">
            <input
              type="checkbox"
              {...register('published')}
              className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
            />
            <span className="ml-2 text-sm text-gray-700">Published</span>
          </label>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Default Locale</label>
          <select
            {...register('defaultLocale')}
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

      {/* Schedule Publish Date */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Publish Date (optional)
        </label>
        <input
          type="date"
          value={
            formValues.publishedAt
              ? typeof formValues.publishedAt === 'string'
                ? formValues.publishedAt.slice(0, 10)
                : ''
              : ''
          }
          onChange={e =>
            setValue('publishedAt', e.target.value ? e.target.value + 'T00:00' : null, {
              shouldValidate: false,
            })
          }
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
        />
        <p className="mt-1 text-xs text-gray-500">
          Leave empty to publish immediately when toggled on. Set a future date to auto-publish.
        </p>
      </div>

      {/* Schedule Expiry Date */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Expiry Date (optional)
        </label>
        <input
          type="date"
          value={
            formValues.expiresAt
              ? typeof formValues.expiresAt === 'string'
                ? formValues.expiresAt.slice(0, 10)
                : ''
              : ''
          }
          onChange={e =>
            setValue('expiresAt', e.target.value ? e.target.value + 'T00:00' : null, {
              shouldValidate: false,
            })
          }
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
        />
        <p className="mt-1 text-xs text-gray-500">
          Content will be hidden after this date. Leave empty for no expiry.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Excerpt ({languageNames[activeLocale]}) (optional)
        </label>
        <input
          type="text"
          value={formValues.excerpt?.[activeLocale] || ''}
          onChange={e =>
            setValue(
              'excerpt',
              { ...formValues.excerpt, [activeLocale]: e.target.value },
              {
                shouldValidate: false,
              }
            )
          }
          className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          placeholder={`Short summary in ${languageNames[activeLocale]}...`}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Tags</label>
        <TagInput
          tags={formValues.tags || []}
          onChange={newTags => setValue('tags', newTags, { shouldValidate: true })}
          placeholder="Add tags for SEO and categorization..."
          maxTags={10}
        />
        {tagsError && <p className="mt-1 text-sm text-red-600">{tagsError}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Content <span className="text-red-500">*</span>
        </label>
        <LocaleAwareEditor
          content={formValues.content || {}}
          onChange={newContent => setValue('content', newContent, { shouldValidate: true })}
          placeholder="Start typing..."
          currentLocale={activeLocale}
          onLocaleChange={handleLocaleChange}
        />
        {typeof contentError === 'string' && (
          <p className="mt-1 text-sm text-red-600">{contentError}</p>
        )}
        {!contentError && !hasContentForActiveLocale && isSubmitting && (
          <p className="mt-1 text-sm text-red-600">
            Content is required for {languageNames[activeLocale]}
          </p>
        )}
      </div>

      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
        <h3 className="text-sm font-medium text-gray-700 mb-3">Translation Status</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {supportedLanguages.map(lang => {
            const hasLangTitle = !!formValues.title?.[lang]?.trim();
            const hasLangContent = !!formValues.content?.[lang]?.trim();
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
          disabled={isSubmitting}
          className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
        >
          {isSubmitting ? 'Saving...' : 'Save Content'}
        </button>
      </div>
    </form>
  );
}
