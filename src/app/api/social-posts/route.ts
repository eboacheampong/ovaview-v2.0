import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { SocialPlatform } from '@prisma/client'

export const dynamic = 'force-dynamic'

// GET all social posts
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const search = searchParams.get('search') || ''
    const platform = searchParams.get('platform') as SocialPlatform | null
    const clientId = searchParams.get('clientId')

    const skip = (page - 1) * limit

    const where: any = {}
    
    if (search) {
      where.OR = [
        { content: { contains: search, mode: 'insensitive' } },
        { authorHandle: { contains: search, mode: 'insensitive' } },
        { authorName: { contains: search, mode: 'insensitive' } },
      ]
    }
    
    if (platform) {
      where.platform = platform
    }

    if (clientId) {
      where.clientId = clientId
    }

    const [posts, total] = await Promise.all([
      prisma.socialPost.findMany({
        where,
        include: {
          account: true,
          industry: true,
          client: { select: { id: true, name: true } },
          subIndustries: { include: { subIndustry: true } },
        },
        orderBy: { postedAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.socialPost.count({ where }),
    ])

    return NextResponse.json({
      posts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Error fetching social posts:', error)
    return NextResponse.json({ error: 'Failed to fetch posts' }, { status: 500 })
  }
}

// POST create new social post
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      platform,
      postId,
      content,
      summary,
      authorHandle,
      authorName,
      authorAvatarUrl,
      postUrl,
      embedUrl,
      embedHtml,
      mediaUrls,
      mediaType,
      likesCount,
      commentsCount,
      sharesCount,
      viewsCount,
      hashtags,
      mentions,
      keywords,
      postedAt,
      accountId,
      industryId,
      subIndustryIds,
      sentimentPositive,
      sentimentNeutral,
      sentimentNegative,
      overallSentiment,
    } = body

    if (!platform || !postId || !postUrl) {
      return NextResponse.json(
        { error: 'platform, postId, and postUrl are required' },
        { status: 400 }
      )
    }

    // Check if post already exists
    const existing = await prisma.socialPost.findUnique({
      where: { platform_postId: { platform, postId } },
    })

    if (existing) {
      return NextResponse.json(
        { error: 'Post already exists', id: existing.id },
        { status: 409 }
      )
    }

    const post = await prisma.socialPost.create({
      data: {
        platform,
        postId,
        content,
        summary,
        authorHandle,
        authorName,
        authorAvatarUrl,
        postUrl,
        embedUrl,
        embedHtml,
        mediaUrls: mediaUrls || [],
        mediaType,
        likesCount,
        commentsCount,
        sharesCount,
        viewsCount,
        hashtags: hashtags || [],
        mentions: mentions || [],
        keywords,
        postedAt: new Date(postedAt),
        accountId,
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

    return NextResponse.json(post, { status: 201 })
  } catch (error) {
    console.error('Error creating social post:', error)
    return NextResponse.json({ error: 'Failed to create post' }, { status: 500 })
  }
}
