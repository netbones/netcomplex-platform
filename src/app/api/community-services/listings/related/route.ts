import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const maxDuration = 5;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const serviceId = searchParams.get('serviceId');
    const limit = parseInt(searchParams.get('limit') || '4');

    if (!serviceId) {
      return NextResponse.json({ error: 'serviceId is required' }, { status: 400 });
    }

    const currentService = await prisma.communityServiceListing.findUnique({
      where: { id: serviceId },
      select: { category: true, title: true, description: true },
    });

    if (!currentService) {
      return NextResponse.json({ error: 'Service not found' }, { status: 404 });
    }

    const relatedServices = await prisma.communityServiceListing.findMany({
      where: {
        id: { not: serviceId },
        isPublished: true,
        status: 'ACTIVE',
        OR: [
          { category: currentService.category },
          { title: { contains: currentService.title.split(' ')[0], mode: 'insensitive' } },
        ],
      },
      include: {
        provider: {
          select: {
            name: true,
            avatar: true,
          },
        },
        _count: {
          select: {
            reviews: true,
          },
        },
      },
      orderBy: [{ rating: 'desc' }, { _count: { reviews: 'desc' } }],
      take: limit,
    });

    return NextResponse.json({ relatedServices });
  } catch (error) {
    console.error('Related services fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
