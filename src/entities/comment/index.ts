export {
  createCommentSchema,
  voteSchema,
  reportSchema,
  moderateSchema,
  listCommentsSchema,
} from './schema';
export type {
  CreateCommentInput,
  VoteInput,
  ReportInput,
  ModerateInput,
  ListCommentsInput,
  CommentVoteType,
  CommentStatusValue,
  ReportReason,
} from './schema';
export { canComment, canModerateComments, canVote } from './permissions';
export type { CommentDTO, CommentDetailDTO, CommentAuthorDTO } from '@api/server';

export { CommentItem } from './ui/CommentItem';
export type { CommentItemProps } from './ui/CommentItem';
export { CommentForm } from './ui/CommentForm';
export type { CommentFormProps } from './ui/CommentForm';
export { VoteButtons } from './ui/VoteButtons';
export type { VoteButtonsProps } from './ui/VoteButtons';
export { ReportMenu } from './ui/ReportMenu';
export type { ReportMenuProps } from './ui/ReportMenu';
