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
    const clients = await prisma.client.findMany({
      where: { isActive: true },
      select: {
        id: true, name: true, newsKeywords: true, isActive: true,
        industries: { select: { industry: { select: { id: true, name: true } } } },
        keywords: { select: { keyword: { select: { id: true, name: true } } } },
      },
      orderBy: { name: 'asc' },
    });
    return NextResponse.json(clients, { headers: corsHeaders });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch clients' }, { status: 500, headers: corsHeaders });
  }
}
