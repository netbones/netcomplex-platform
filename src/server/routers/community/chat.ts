import { router } from '@api/server';
import { conversationProcedures } from '../chat/conversations';
import { messagingProcedures } from '../chat/messaging';

export const chatRouter = router({
  ...conversationProcedures,
  ...messagingProcedures,
});
