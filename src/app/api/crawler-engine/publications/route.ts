import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function GET() {
  try {
    const publications = await prisma.webPublication.findMany({
      where: { isActive: true },
      select: { id: true, name: true, website: true, location: true, reach: true, region: true, isActive: true },
      orderBy: { name: 'asc' },
    });
    return NextResponse.json(publications, { headers: corsHeaders });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch publications' }, { status: 500, headers: corsHeaders });
  }
}
