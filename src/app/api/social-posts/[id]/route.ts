import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateSlug } from '@/lib/slug'

export const dynamic = 'force-dynamic'

/** Generate a unique slug for a social post */
async function generateSocialSlug(content: string, platform: string, authorName?: string): Promise<string> {
  // Build a title-like string from content
  const prefix = platform.toLowerCase()
  const snippet = (content || 'social-post').substring(0, 60).trim()
  const author = authorName ? `-${authorName}` : ''
  const raw = `${prefix}${author}-${snippet}`
  const baseSlug = generateSlug(raw)

  let slug = baseSlug
  let counter = 1
  while (await prisma.socialPost.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${counter}`
    counter++
  }
  return slug
}

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
        client: { select: { id: true, name: true } },
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
      title,
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
      keyPersonalities,
      status,
    } = body

    // Delete existing sub-industry relations
    await prisma.socialPostSubIndustry.deleteMany({
      where: { socialPostId: params.id },
    })

    // If accepting (status → accepted), generate slug + title if not already set
    const updateData: any = {
      content,
      summary,
      embedUrl,
      embedHtml,
      mediaUrls,
      keywords,
      industryId,
      keyPersonalities,
      sentimentPositive,
      sentimentNeutral,
      sentimentNegative,
      overallSentiment,
      keyPersonalities,
      subIndustries: subIndustryIds?.length
        ? { create: subIndustryIds.map((id: string) => ({ subIndustryId: id })) }
        : undefined,
    }

    if (status) {
      updateData.status = status
    }

    if (title) {
      updateData.title = title
    }

    // Generate slug when accepting if post doesn't have one yet
    if (status === 'accepted') {
      const existing = await prisma.socialPost.findUnique({ where: { id: params.id } })
      if (existing && !existing.slug) {
        const postContent = content || existing.content || ''
        const postTitle = title || existing.title || postContent.substring(0, 80)
        updateData.title = updateData.title || postTitle
        updateData.slug = await generateSocialSlug(postContent, existing.platform, existing.authorName || undefined)
      }
    }

    const post = await prisma.socialPost.update({
      where: { id: params.id },
      data: updateData,
      include: {
        account: true,
        industry: true,
        client: { select: { id: true, name: true } },
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
