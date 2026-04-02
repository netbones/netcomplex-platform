import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/messages/unread - Get unread message counts for current user
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all conversations where user is a participant
    const userConversations = await prisma.conversationParticipant.findMany({
      where: { userId: session.user.id },
      include: {
        conversation: {
          include: {
            messages: {
              orderBy: { createdAt: 'desc' },
              take: 1, // Get latest message
            },
            participants: {
              include: {
                user: {
                  select: { id: true, name: true },
                },
              },
            },
          },
        },
      },
    });

    const unreadCounts: Record<string, number> = {};
    let totalUnread = 0;

    for (const participant of userConversations) {
      const conversation = participant.conversation;
      const latestMessage = conversation.messages[0];

      if (!latestMessage) continue;

      // Count messages after last read
      const unreadCount = await prisma.message.count({
        where: {
          conversationId: conversation.id,
          senderId: { not: session.user.id }, // Messages from others
          createdAt: participant.lastReadAt ? { gt: participant.lastReadAt } : { gt: new Date(0) }, // All messages if never read
        },
      });

      if (unreadCount > 0) {
        // For direct conversations, use the other participant's ID as key
        if (conversation.type === 'DIRECT') {
          const otherParticipant = conversation.participants.find(
            p => p.userId !== session.user.id
          );
          if (otherParticipant) {
            unreadCounts[otherParticipant.userId] = unreadCount;
          }
        } else {
          // For group conversations, use conversation ID
          unreadCounts[conversation.id] = unreadCount;
        }
        totalUnread += unreadCount;
      }
    }

    return NextResponse.json({
      unreadCounts,
      totalUnread,
    });
  } catch (error) {
    console.error('Unread messages fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/messages/mark-read - Mark conversation as read
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { conversationId, messageId } = await request.json();

    if (!conversationId) {
      return NextResponse.json({ error: 'Conversation ID required' }, { status: 400 });
    }

    // Update participant's last read info
    await prisma.conversationParticipant.updateMany({
      where: {
        conversationId,
        userId: session.user.id,
      },
      data: {
        lastReadAt: new Date(),
        lastReadMessageId: messageId || null,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Mark read error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
