import { createSelectSchema } from 'drizzle-zod';
import { z } from 'zod/v4';
import { comments, users } from '../db';

const dateSchema = z
  .date()
  .nullable()
  .transform(d => (d ? d.toISOString() : new Date().toISOString()));
const nullableDateSchema = z
  .date()
  .nullable()
  .transform(d => (d ? d.toISOString() : null));

const commentAuthorDto = createSelectSchema(users).pick({
  id: true,
  name: true,
  avatar: true,
  profileSlug: true,
});

export const commentDto = createSelectSchema(comments, {
  createdAt: dateSchema,
  updatedAt: dateSchema,
  editedAt: nullableDateSchema,
  deletedAt: nullableDateSchema,
  moderatedAt: nullableDateSchema,
}).pick({
  id: true,
  contentId: true,
  authorId: true,
  parentId: true,
  rootId: true,
  body: true,
  status: true,
  score: true,
  upvotes: true,
  downvotes: true,
  createdAt: true,
  updatedAt: true,
  editedAt: true,
  deletedAt: true,
});

export type CommentDto = z.infer<typeof commentDto>;
export type CommentAuthorDto = z.infer<typeof commentAuthorDto>;

export type CommentDetailDto = Omit<CommentDto, 'body'> & {
  body: string;
  author: CommentAuthorDto | null;
  replies: CommentDetailDto[];
  userVote: 'UPVOTE' | 'DOWNVOTE' | null;
};

export const commentDetailDto: z.ZodType<CommentDetailDto> = commentDto.extend({
  author: commentAuthorDto.nullable(),
  replies: z.lazy((): z.ZodType<CommentDetailDto[]> => commentDetailDto.array()).default([]),
  userVote: z.enum(['UPVOTE', 'DOWNVOTE']).nullable().default(null),
});

export type CommentDTO = CommentDto;
export type CommentDetailDTO = CommentDetailDto;
export type CommentAuthorDTO = CommentAuthorDto;

export function toCommentDTO(row: z.input<typeof commentDto>): CommentDto {
  return commentDto.parse(row);
}

export function toCommentDTOs(rows: z.input<typeof commentDto>[]): CommentDto[] {
  return rows.map(row => commentDto.parse(row));
}

export function toCommentDetailDTO(row: z.input<typeof commentDetailDto>): CommentDetailDto {
  return commentDetailDto.parse(row);
}
