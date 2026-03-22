import { NextRequest, NextResponse } from 'next/server';
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

export async function GET(request: NextRequest) {
  try {
    const limit = parseInt(new URL(request.url).searchParams.get('limit') || '50');
    const logs = await prisma.crawlerLog.findMany({
      select: {
        id: true, sourceName: true, sourceUrl: true, status: true,
        articlesFound: true, articlesSaved: true, duration: true,
        errorMessage: true, startedAt: true, completedAt: true,
      },
      orderBy: { startedAt: 'desc' },
      take: Math.min(limit, 200),
    });
    return NextResponse.json(logs, { headers: corsHeaders });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch logs' }, { status: 500, headers: corsHeaders });
  }
}
