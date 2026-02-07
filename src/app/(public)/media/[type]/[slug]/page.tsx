import { notFound } from 'next/navigation'
import prisma from '@/lib/prisma'
import { Badge } from '@/components/ui/badge'
import { Calendar, User, Building2, Newspaper, Radio, Tv, Globe, Tag, ExternalLink, Play } from 'lucide-react'

type MediaType = 'web' | 'tv' | 'radio' | 'print'

interface PageProps {
  params: Promise<{
    type: MediaType
    slug: string
  }>
}

async function getStory(type: MediaType, slug: string) {
  switch (type) {
    case 'web':
      return prisma.webStory.findUnique({
        where: { slug },
        include: {
          publication: true,
          industry: true,
          subIndustries: { include: { subIndustry: true } },
          images: true,
        },
      })
    case 'tv':
      return prisma.tVStory.findUnique({
        where: { slug },
        include: {
          station: true,
          program: true,
          industry: true,
          subIndustries: { include: { subIndustry: true } },
        },
      })
    case 'radio':
      return prisma.radioStory.findUnique({
        where: { slug },
        include: {
          station: true,
          program: true,
          industry: true,
          subIndustries: { include: { subIndustry: true } },
        },
      })
    case 'print':
      return prisma.printStory.findUnique({
        where: { slug },
        include: {
          publication: true,
          issue: true,
          industry: true,
          subIndustries: { include: { subIndustry: true } },
          images: true,
        },
      })
    default:
      return null
  }
}

function getMediaIcon(type: MediaType) {
  switch (type) {
    case 'web': return <Globe className="h-5 w-5" />
    case 'tv': return <Tv className="h-5 w-5" />
    case 'radio': return <Radio className="h-5 w-5" />
    case 'print': return <Newspaper className="h-5 w-5" />
  }
}

function getMediaLabel(type: MediaType) {
  switch (type) {
    case 'web': return 'Web Article'
    case 'tv': return 'TV Story'
    case 'radio': return 'Radio Story'
    case 'print': return 'Print Article'
  }
}

function getSentimentColor(sentiment: string | null) {
  switch (sentiment) {
    case 'positive': return 'bg-green-100 text-green-700 border-green-200'
    case 'negative': return 'bg-red-100 text-red-700 border-red-200'
    default: return 'bg-gray-100 text-gray-700 border-gray-200'
  }
}

export default async function PublicMediaPage({ params }: PageProps) {
  const { type, slug } = await params
  
  if (!['web', 'tv', 'radio', 'print'].includes(type)) {
    notFound()
  }

  const story = await getStory(type, slug)

  if (!story) {
    notFound()
  }

  const title = story.title
  const content = story.content
  const summary = story.summary
  const date = story.date
  const keywords = story.keywords
  const industry = story.industry
  const overallSentiment = story.overallSentiment
  const sentimentPositive = story.sentimentPositive
  const sentimentNeutral = story.sentimentNeutral
  const sentimentNegative = story.sentimentNegative

  const author = 'author' in story ? story.author : null
  const presenters = 'presenters' in story ? story.presenters : null
  const sourceUrl = 'sourceUrl' in story ? story.sourceUrl : null
  const videoUrl = 'videoUrl' in story ? story.videoUrl : null
  const videoTitle = 'videoTitle' in story ? story.videoTitle : null
  const audioUrl = 'audioUrl' in story ? story.audioUrl : null
  const audioTitle = 'audioTitle' in story ? story.audioTitle : null
  const pageNumbers = 'pageNumbers' in story ? story.pageNumbers : null
  const publication = 'publication' in story ? story.publication : null
  const station = 'station' in story ? story.station : null
  const program = 'program' in story ? story.program : null
  const issue = 'issue' in story ? story.issue : null
  const images = 'images' in story ? story.images : []

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <article className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-8 pt-8">
          <div className="flex items-center gap-2 text-orange-600 mb-4">
            {getMediaIcon(type)}
            <span className="text-sm font-medium">{getMediaLabel(type)}</span>
          </div>

          <h1 className="text-3xl font-bold text-gray-900 mb-4">{title}</h1>

          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 mb-6">
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              <span>{new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
            </div>
            
            {(author || presenters) && (
              <div className="flex items-center gap-1">
                <User className="h-4 w-4" />
                <span>{author || presenters}</span>
              </div>
            )}

            {publication && (
              <div className="flex items-center gap-1">
                <Building2 className="h-4 w-4" />
                <span>{publication.name}</span>
              </div>
            )}

            {station && (
              <div className="flex items-center gap-1">
                <Building2 className="h-4 w-4" />
                <span>{station.name}</span>
                {program && <span className="text-gray-400">• {program.name}</span>}
              </div>
            )}

            {issue && <span className="text-gray-400">Issue: {issue.name}</span>}
            {pageNumbers && <span className="text-gray-400">Page {pageNumbers}</span>}
          </div>

          <div className="flex flex-wrap items-center gap-2 mb-6">
            {industry && (
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                {industry.name}
              </Badge>
            )}
            {overallSentiment && (
              <Badge variant="outline" className={getSentimentColor(overallSentiment)}>
                {overallSentiment.charAt(0).toUpperCase() + overallSentiment.slice(1)} Sentiment
              </Badge>
            )}
          </div>
        </div>

        {images && images.length > 0 && (
          <div className="px-8 mb-6">
            <img src={images[0].url} alt={images[0].caption || title} className="w-full h-64 object-cover rounded-xl" />
            {images[0].caption && <p className="text-sm text-gray-500 mt-2 text-center">{images[0].caption}</p>}
          </div>
        )}

        {(sentimentPositive !== null || sentimentNeutral !== null || sentimentNegative !== null) && (
          <div className="px-8 mb-6">
            <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-5 border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-gray-700">Sentiment Analysis</h2>
                {overallSentiment && (
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    overallSentiment === 'positive' ? 'bg-green-100 text-green-700' :
                    overallSentiment === 'negative' ? 'bg-red-100 text-red-700' :
                    'bg-gray-200 text-gray-700'
                  }`}>
                    Overall: {overallSentiment.charAt(0).toUpperCase() + overallSentiment.slice(1)}
                  </span>
                )}
              </div>
              <div className="flex gap-3">
                {sentimentPositive !== null && (
                  <div className="flex-1 bg-white rounded-lg p-4 text-center shadow-sm border border-green-100">
                    <div className="text-2xl font-bold text-green-600">{sentimentPositive}%</div>
                    <div className="text-xs text-green-700 mt-1">Positive</div>
                    <div className="mt-2 h-1.5 bg-green-100 rounded-full overflow-hidden">
                      <div className="h-full bg-green-500 rounded-full" style={{ width: `${sentimentPositive}%` }} />
                    </div>
                  </div>
                )}
                {sentimentNeutral !== null && (
                  <div className="flex-1 bg-white rounded-lg p-4 text-center shadow-sm border border-gray-200">
                    <div className="text-2xl font-bold text-gray-600">{sentimentNeutral}%</div>
                    <div className="text-xs text-gray-700 mt-1">Neutral</div>
                    <div className="mt-2 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                      <div className="h-full bg-gray-500 rounded-full" style={{ width: `${sentimentNeutral}%` }} />
                    </div>
                  </div>
                )}
                {sentimentNegative !== null && (
                  <div className="flex-1 bg-white rounded-lg p-4 text-center shadow-sm border border-red-100">
                    <div className="text-2xl font-bold text-red-600">{sentimentNegative}%</div>
                    <div className="text-xs text-red-700 mt-1">Negative</div>
                    <div className="mt-2 h-1.5 bg-red-100 rounded-full overflow-hidden">
                      <div className="h-full bg-red-500 rounded-full" style={{ width: `${sentimentNegative}%` }} />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {videoUrl && (
          <div className="px-8 mb-6">
            <div className="bg-gray-900 rounded-xl overflow-hidden">
              <video controls className="w-full"><source src={videoUrl} type="video/mp4" /></video>
            </div>
            {videoTitle && <p className="text-sm text-gray-500 mt-2 flex items-center gap-1"><Play className="h-4 w-4" />{videoTitle}</p>}
          </div>
        )}

        {audioUrl && (
          <div className="px-8 mb-6">
            <div className="bg-gray-100 rounded-xl p-4">
              <audio controls className="w-full"><source src={audioUrl} type="audio/mpeg" /></audio>
            </div>
            {audioTitle && <p className="text-sm text-gray-500 mt-2">{audioTitle}</p>}
          </div>
        )}

        {summary && (
          <div className="px-8 mb-6">
            <div className="bg-orange-50 border-l-4 border-orange-500 p-4 rounded-r-lg">
              <h2 className="text-sm font-semibold text-orange-800 mb-2">Summary</h2>
              <p className="text-gray-700">{summary}</p>
            </div>
          </div>
        )}

        {content && (
          <div className="px-8 pb-6">
            <div className="prose prose-gray max-w-none" dangerouslySetInnerHTML={{ __html: content }} />
          </div>
        )}

        {keywords && (
          <div className="px-8 pb-6">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-5 border border-blue-100">
              <div className="flex items-center gap-2 mb-3">
                <Tag className="h-4 w-4 text-blue-500" />
                <span className="text-sm font-semibold text-blue-700">Keywords</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {keywords.split(',').map((keyword: string, index: number) => (
                  <span 
                    key={index} 
                    className="px-3 py-1.5 bg-white text-blue-700 text-sm rounded-full border border-blue-200 shadow-sm hover:shadow-md transition-shadow"
                  >
                    {keyword.trim()}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {sourceUrl && (
          <div className="px-8 pb-8 border-t border-gray-100 pt-6">
            <a href={sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 text-sm font-medium bg-blue-50 px-4 py-2 rounded-lg hover:bg-blue-100 transition-colors">
              <ExternalLink className="h-4 w-4" />View Original Source
            </a>
          </div>
        )}

        {images && images.length > 1 && (
          <div className="px-8 pb-8 border-t border-gray-100 pt-6">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">More Images</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {images.slice(1).map((image: { id: string; url: string; caption?: string | null }, index: number) => (
                <div key={image.id || index} className="relative">
                  <img src={image.url} alt={image.caption || `Image ${index + 2}`} className="w-full h-32 object-cover rounded-lg" />
                  {image.caption && <p className="text-xs text-gray-500 mt-1">{image.caption}</p>}
                </div>
              ))}
            </div>
          </div>
        )}
      </article>

      <footer className="mt-8 py-6 border-t border-gray-200">
        <div className="flex flex-col items-center gap-2">
          <img
            src="/Ovaview-Media-Monitoring-Logo.png"
            alt="Ovaview"
            className="h-10 w-auto"
          />
          <p className="text-xs text-gray-400">© {new Date().getFullYear()} All rights reserved</p>
        </div>
      </footer>
    </div>
  )
}

export async function generateMetadata({ params }: PageProps) {
  const { type, slug } = await params
  const story = await getStory(type as MediaType, slug)
  
  if (!story) {
    return { title: 'Story Not Found' }
  }

  return {
    title: story.title,
    description: story.summary || `${getMediaLabel(type as MediaType)} - ${story.title}`,
  }
}
