import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all tags from user's content
    const response = await fetch(
      `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/content?authorId=${session.user.id}`,
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      return NextResponse.json({ tags: [] });
    }

    const content = await response.json();

    // Extract all unique tags from user's content
    const tagSet = new Set<string>();
    content.forEach((item: any) => {
      if (item.tags && Array.isArray(item.tags)) {
        item.tags.forEach((tag: string) => tagSet.add(tag));
      }
    });

    const tags = Array.from(tagSet).sort();

    return NextResponse.json({ tags });
  } catch (error) {
    console.error('Error fetching user tags:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
