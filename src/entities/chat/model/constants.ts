export const COMMON_EMOJIS = ['😀', '😂', '❤️', '👍', '🎉', '🔥', '💯', '👏', '🙏', '😊'] as const;

export const DEFAULT_MESSAGE_RETENTION_DAYS = 30;

export const MAX_MESSAGE_LENGTH = 2000;

export const TYPING_INDICATOR_TIMEOUT_MS = 2000;

export const MAX_CONVERSATION_NAME_LENGTH = 100;

export const MIN_PARTICIPANTS_FOR_GROUP = 2;

export const MAX_RECENT_CONVERSATIONS_DISPLAY = 5;

export const ONLINE_INDICATOR_ANIMATION_CLASS =
  'animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75';

export const ONLINE_INDICATOR_BASE_CLASS = 'relative inline-flex rounded-full h-3 w-3 bg-green-500';

export type { MessageType } from './types';
