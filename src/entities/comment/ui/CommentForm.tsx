'use client';

import { useRef, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Send, X } from 'lucide-react';
import { toast } from 'sonner';
import { trpc, authClient } from '@api/client';
import { cn } from '@/shared/lib/utils';
import { createCommentSchema, type CreateCommentInput } from '@entities/comment';

export interface CommentFormProps {
  contentId: string;
  parentId?: string;
  rootId?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
  placeholder?: string;
  submitLabel?: string;
  compact?: boolean;
  autoFocus?: boolean;
}

export function CommentForm({
  contentId,
  parentId,
  rootId,
  onSuccess,
  onCancel,
  placeholder = 'Add a comment…',
  submitLabel = 'Post',
  compact = false,
  autoFocus = false,
}: CommentFormProps) {
  const { data: session } = authClient.useSession();
  const textAreaRef = useRef<HTMLTextAreaElement | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CreateCommentInput>({
    resolver: zodResolver(createCommentSchema),
    defaultValues: {
      contentId,
      body: '',
      parentId,
      rootId,
    },
  });

  const utils = trpc.useUtils();

  const createMutation = trpc.comments.create.useMutation({
    onSuccess: () => {
      reset({ contentId, body: '', parentId, rootId });
      onSuccess?.();
      utils.comments.list.invalidate();
    },
    onError: error => {
      toast.error(error.message || 'Failed to post comment');
    },
  });

  const body = watch('body');
  const charCount = body?.length ?? 0;

  const onSubmit = useCallback(
    async (data: CreateCommentInput) => {
      if (!session?.user) {
        toast.error('Sign in to comment');
        return;
      }
      await createMutation.mutateAsync({
        contentId: data.contentId,
        body: data.body,
        parentId: data.parentId,
        rootId: data.rootId,
      });
    },
    [session, createMutation]
  );

  if (!session?.user) {
    return (
      <div
        className={cn(
          'rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-600',
          !compact && 'p-4'
        )}
      >
        <p>Sign in to join the conversation.</p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className={cn(
        'flex flex-col gap-2 rounded-lg border border-gray-200 bg-white p-3',
        !compact && 'p-4'
      )}
    >
      <textarea
        {...register('body')}
        ref={e => {
          textAreaRef.current = e;
        }}
        placeholder={placeholder}
        rows={compact ? 2 : 3}
        maxLength={5000}
        autoFocus={autoFocus}
        aria-label={placeholder}
        aria-invalid={!!errors.body}
        aria-describedby={errors.body ? 'comment-error' : undefined}
        className={cn(
          'w-full resize-none rounded border border-gray-200 bg-white px-3 py-2 text-sm',
          'focus:border-indigo-300 focus:outline-none focus:ring-1 focus:ring-indigo-300',
          'placeholder:text-gray-400'
        )}
      />

      <div className="flex items-center justify-between text-xs">
        <div>
          {errors.body && (
            <p id="comment-error" className="text-red-600">
              {errors.body.message}
            </p>
          )}
          {charCount > 4500 && (
            <span className="text-gray-500">{5000 - charCount} characters left</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="rounded px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100"
              aria-label="Cancel reply"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
          <button
            type="submit"
            disabled={isSubmitting || createMutation.isPending || !body?.trim()}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-md bg-indigo-600 px-3 py-1.5',
              'text-sm font-medium text-white transition-colors hover:bg-indigo-700',
              'disabled:cursor-not-allowed disabled:bg-gray-300'
            )}
            aria-label={submitLabel}
          >
            <Send className="h-3.5 w-3.5" />
            <span>{submitLabel}</span>
          </button>
        </div>
      </div>
    </form>
  );
}
