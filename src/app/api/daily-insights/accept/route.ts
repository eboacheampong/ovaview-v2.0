import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * POST /api/daily-insights/accept
 * Accept an insight article and prepare it for web publication
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { articleId } = body

    if (!articleId) {
      return NextResponse.json(
        { error: 'articleId is required' },
        { status: 400 }
      )
    }

    // Get the article
    const article = await prisma.dailyInsight.findUnique({
      where: { id: articleId },
    })

    if (!article) {
      return NextResponse.json(
        { error: 'Article not found' },
        { status: 404 }
      )
    }

    // Update status to accepted
    await prisma.dailyInsight.update({
      where: { id: articleId },
      data: { status: 'accepted' },
    })

    // Return article data for web publication creation
    return NextResponse.json({
      id: article.id,
      title: article.title,
      url: article.url,
      description: article.description,
      source: article.source,
      message: 'Article accepted. Ready for web publication creation.',
    })
  } catch (error) {
    console.error('Error accepting article:', error)
    return NextResponse.json(
      { error: 'Failed to accept article' },
      { status: 500 }
    )
  }
}
