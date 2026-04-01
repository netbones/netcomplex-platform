import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const content = await prisma.content.findMany({
      where: {
        category: 'CONSERVATION',
        published: true,
      },
      orderBy: { publishedAt: 'desc' },
      take: 3,
      include: {
        author: {
          select: { name: true },
        },
      },
    });

    return NextResponse.json(content);
  } catch (error) {
    console.error('Failed to fetch conservation content:', error);
    return NextResponse.json({ error: 'Failed to fetch content' }, { status: 500 });
  }
}
