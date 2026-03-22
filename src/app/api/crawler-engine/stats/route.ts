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
    const [totalClients, totalPublications, totalKeywords, totalIndustries, pendingInsights, pendingSocialPosts, recentCrawls] = await Promise.all([
      prisma.client.count({ where: { isActive: true } }),
      prisma.webPublication.count({ where: { isActive: true } }),
      prisma.keyword.count({ where: { isActive: true } }),
      prisma.industry.count({ where: { isActive: true } }),
      prisma.dailyInsight.count({ where: { status: 'pending' } }),
      prisma.socialPost.count({ where: { status: 'pending' } }),
      prisma.crawlerLog.count({ where: { startedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } } }),
    ]);
    return NextResponse.json({ totalClients, totalPublications, totalKeywords, totalIndustries, pendingInsights, pendingSocialPosts, recentCrawls }, { headers: corsHeaders });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500, headers: corsHeaders });
  }
}
