import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db, albums } from '@/lib/db';
import { eq, desc, and } from 'drizzle-orm';

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
    const now = new Date();

    switch (action) {
      case 'create': {
        // Check album limit (max 3 per user)
        const existingAlbums = await db
          .select({ id: albums.id })
          .from(albums)
          .where(eq(albums.userId, userId));

        if (existingAlbums.length >= 3) {
          return NextResponse.json({ error: 'Maximum 3 albums allowed' }, { status: 400 });
        }

        const newAlbum = await db
          .insert(albums)
          .values({
            id: crypto.randomUUID(),
            userId,
            title: album.title,
            description: album.description || null,
            isPublic: album.isPublic || false,
            mediaIds: album.mediaIds || [],
            createdAt: now,
            updatedAt: now,
          })
          .returning();

        const allAlbums = await db
          .select()
          .from(albums)
          .where(eq(albums.userId, userId))
          .orderBy(desc(albums.createdAt));

        return NextResponse.json({ albums: allAlbums });
      }

      case 'update': {
        const updatedAlbum = await db
          .update(albums)
          .set({
            title: album.title,
            description: album.description || null,
            isPublic: album.isPublic,
            mediaIds: album.mediaIds || [],
            updatedAt: now,
          })
          .where(and(eq(albums.id, album.id), eq(albums.userId, userId)))
          .returning();

        const allAlbums = await db
          .select()
          .from(albums)
          .where(eq(albums.userId, userId))
          .orderBy(desc(albums.createdAt));

        return NextResponse.json({ albums: allAlbums });
      }

      case 'delete': {
        await db.delete(albums).where(and(eq(albums.id, albumId), eq(albums.userId, userId)));

        const allAlbums = await db
          .select()
          .from(albums)
          .where(eq(albums.userId, userId))
          .orderBy(desc(albums.createdAt));

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

    const userAlbums = await db
      .select()
      .from(albums)
      .where(eq(albums.userId, session.user.id))
      .orderBy(desc(albums.createdAt));

    return NextResponse.json({ albums: userAlbums });
  } catch (error) {
    console.error('Get albums error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
