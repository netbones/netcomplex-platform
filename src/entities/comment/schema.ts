import { z } from 'zod/v4';

export const createCommentSchema = z.object({
  contentId: z.string().min(1),
  body: z.string().min(1).max(5000),
  parentId: z.string().optional(),
  rootId: z.string().optional(),
});

export const voteSchema = z.object({
  commentId: z.string().min(1),
  type: z.enum(['UPVOTE', 'DOWNVOTE']),
});

export const reportSchema = z.object({
  commentId: z.string().min(1),
  reason: z.enum([
    'SPAM',
    'HARASSMENT',
    'MISINFORMATION',
    'HATE_SPEECH',
    'VIOLENCE',
    'NSFW',
    'IMPERSONATION',
    'OTHER',
  ]),
  note: z.string().max(1000).optional(),
});

export const moderateSchema = z.object({
  commentId: z.string().min(1),
  action: z.enum(['HIDDEN', 'REMOVED', 'PUBLISHED']),
  notes: z.string().max(1000).optional(),
  reportId: z.string().optional(),
  resolution: z.enum(['DISMISSED', 'COMMENT_REMOVED', 'USER_WARNED', 'USER_SUSPENDED']).optional(),
});

export const listCommentsSchema = z.object({
  contentId: z.string().min(1),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),
});

export const listFlaggedSchema = z.object({
  status: z.enum(['FLAGGED', 'HIDDEN', 'REMOVED', 'PUBLISHED']).optional().default('FLAGGED'),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  contentId: z.string().optional(),
});

export type CreateCommentInput = z.infer<typeof createCommentSchema>;
export type VoteInput = z.infer<typeof voteSchema>;
export type ReportInput = z.infer<typeof reportSchema>;
export type ModerateInput = z.infer<typeof moderateSchema>;
export type ListCommentsInput = z.infer<typeof listCommentsSchema>;
export type ListFlaggedInput = z.infer<typeof listFlaggedSchema>;

export type CommentVoteType = 'UPVOTE' | 'DOWNVOTE';
export type CommentStatusValue = 'PUBLISHED' | 'HIDDEN' | 'FLAGGED' | 'REMOVED';

export type ReportReason =
  | 'SPAM'
  | 'HARASSMENT'
  | 'MISINFORMATION'
  | 'HATE_SPEECH'
  | 'VIOLENCE'
  | 'NSFW'
  | 'IMPERSONATION'
  | 'OTHER';
