import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action, album, albumId } = await request.json();
    const userId = session.user.id;

    switch (action) {
      case 'create': {
        // Check album limit (max 3 per user)
        const existingAlbums = await prisma.album.count({
          where: { userId },
        });

        if (existingAlbums >= 3) {
          return NextResponse.json({ error: 'Maximum 3 albums allowed' }, { status: 400 });
        }

        const newAlbum = await prisma.album.create({
          data: {
            userId,
            title: album.title,
            description: album.description || null,
            isPublic: album.isPublic || false,
            mediaIds: album.mediaIds || [],
          },
        });

        const allAlbums = await prisma.album.findMany({
          where: { userId },
          orderBy: { createdAt: 'desc' },
        });

        return NextResponse.json({ albums: allAlbums });
      }

      case 'update': {
        const updatedAlbum = await prisma.album.update({
          where: {
            id: album.id,
            userId, // Ensure user owns the album
          },
          data: {
            title: album.title,
            description: album.description || null,
            isPublic: album.isPublic,
            mediaIds: album.mediaIds || [],
          },
        });

        const allAlbums = await prisma.album.findMany({
          where: { userId },
          orderBy: { createdAt: 'desc' },
        });

        return NextResponse.json({ albums: allAlbums });
      }

      case 'delete': {
        await prisma.album.delete({
          where: {
            id: albumId,
            userId, // Ensure user owns the album
          },
        });

        const allAlbums = await prisma.album.findMany({
          where: { userId },
          orderBy: { createdAt: 'desc' },
        });

        return NextResponse.json({ albums: allAlbums });
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Album API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const albums = await prisma.album.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ albums });
  } catch (error) {
    console.error('Get albums error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
