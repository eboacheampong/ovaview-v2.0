import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/**
 * GET /api/web-stories/check-url?url=...
 * Check if a URL has already been published as a web story
 */
export async function GET(request: NextRequest) {
  try {
    const url = request.nextUrl.searchParams.get('url')
    if (!url) return NextResponse.json({ exists: false })

    const existing = await prisma.webStory.findFirst({
      where: { sourceUrl: url },
      select: { id: true, title: true, createdAt: true },
    })

    return NextResponse.json({
      exists: !!existing,
      story: existing ? { id: existing.id, title: existing.title, createdAt: existing.createdAt } : null,
    })
  } catch {
    return NextResponse.json({ exists: false })
  }
}
