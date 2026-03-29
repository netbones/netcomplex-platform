import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET() {
  const [userCount, groupCount, contentCount] = await Promise.all([
    prisma.user.count({ where: { isActive: true } }),
    prisma.group.count({ where: { isActive: true } }),
    prisma.content.count({ where: { category: 'CONSERVATION', published: true } }),
  ]);

  const stats = {
    homes: 180,
    years: 15,
    birdSpecies: 47,
    nativePlants: 150,
    residents: userCount,
    groups: groupCount,
    conservationArticles: contentCount,
  };

  return NextResponse.json(stats);
}
