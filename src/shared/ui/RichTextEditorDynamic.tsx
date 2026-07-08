'use client';

import dynamic from 'next/dynamic';
import type { ComponentProps } from 'react';
import { RichTextEditor as RichTextEditorImpl } from './RichTextEditor';

const DynamicEditor = dynamic(
  () => import('./RichTextEditor').then(mod => ({ default: mod.RichTextEditor })),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-[200px] bg-gray-50 border border-gray-200 rounded-lg animate-pulse flex items-center justify-center">
        <span className="text-gray-400 text-sm">Loading editor...</span>
      </div>
    ),
  }
);

type RichTextEditorProps = ComponentProps<typeof RichTextEditorImpl>;

export function RichTextEditor(props: RichTextEditorProps) {
  return <DynamicEditor {...props} />;
}
