import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// GET single social post
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const post = await prisma.socialPost.findUnique({
      where: { id: params.id },
      include: {
        account: true,
        industry: true,
        subIndustries: { include: { subIndustry: true } },
      },
    })

    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    return NextResponse.json(post)
  } catch (error) {
    console.error('Error fetching social post:', error)
    return NextResponse.json({ error: 'Failed to fetch post' }, { status: 500 })
  }
}

// PUT update social post
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const {
      content,
      summary,
      embedUrl,
      embedHtml,
      mediaUrls,
      keywords,
      industryId,
      subIndustryIds,
      sentimentPositive,
      sentimentNeutral,
      sentimentNegative,
      overallSentiment,
    } = body

    // Delete existing sub-industry relations
    await prisma.socialPostSubIndustry.deleteMany({
      where: { socialPostId: params.id },
    })

    const post = await prisma.socialPost.update({
      where: { id: params.id },
      data: {
        content,
        summary,
        embedUrl,
        embedHtml,
        mediaUrls,
        keywords,
        industryId,
        sentimentPositive,
        sentimentNeutral,
        sentimentNegative,
        overallSentiment,
        subIndustries: subIndustryIds?.length
          ? {
              create: subIndustryIds.map((id: string) => ({
                subIndustryId: id,
              })),
            }
          : undefined,
      },
      include: {
        account: true,
        industry: true,
        subIndustries: { include: { subIndustry: true } },
      },
    })

    return NextResponse.json(post)
  } catch (error) {
    console.error('Error updating social post:', error)
    return NextResponse.json({ error: 'Failed to update post' }, { status: 500 })
  }
}

// DELETE social post
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.socialPost.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting social post:', error)
    return NextResponse.json({ error: 'Failed to delete post' }, { status: 500 })
  }
}
