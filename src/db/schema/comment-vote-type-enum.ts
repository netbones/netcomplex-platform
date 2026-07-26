import { pgEnum } from 'drizzle-orm/pg-core';

export const commentVoteTypeEnum = pgEnum('CommentVoteType', ['UPVOTE', 'DOWNVOTE']);
