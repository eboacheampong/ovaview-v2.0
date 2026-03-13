'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { SentimentDisplay } from '@/components/ui/sentiment-display'
import { KeywordInput } from '@/components/ui/keyword-input'
import { Wand2, Loader2, Share2, User, Calendar, Heart, MessageCircle, Repeat2, Eye, Link2, Code, Sparkles, Users } from 'lucide-react'

const platforms = [
  { value: 'TWITTER', label: 'Twitter/X' },
  { value: 'YOUTUBE', label: 'YouTube' },
  { value: 'FACEBOOK', label: 'Facebook' },
  { value: 'LINKEDIN', label: 'LinkedIn' },
  { value: 'INSTAGRAM', label: 'Instagram' },
  { value: 'TIKTOK', label: 'TikTok' },
]

interface Keyword {
  id: string
  name: string
}

interface SubIndustry {
  id: string
  name: string
}

interface Industry {
  id: string
  name: string
  subIndustries: SubIndustry[]
}

export default function AddSocialPostPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isLoading, setIsLoading] = useState(false)
  const [industries, setIndustries] = useState<Industry[]>([])
  const [clients, setClients] = useState<{ id: string; name: string }[]>([])
  const [availableKeywords, setAvailableKeywords] = useState<Keyword[]>([])
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analyzeError, setAnalyzeError] = useState('')

  const [formData, setFormData] = useState({
    platform: searchParams.get('platform') || 'TWITTER',
    content: searchParams.get('content') || '',
    authorName: searchParams.get('authorName') || '',
    authorHandle: searchParams.get('authorHandle') || '',
    postUrl: searchParams.get('postUrl') || '',
    embedUrl: searchParams.get('embedUrl') || '',
    embedHtml: searchParams.get('embedHtml') || '',
    keywords: searchParams.get('keywords') || '',
    keyPersonalities: '',
    likesCount: parseInt(searchParams.get('likesCount') || '0'),
    commentsCount: parseInt(searchParams.get('commentsCount') || '0'),
    sharesCount: parseInt(searchParams.get('sharesCount') || '0'),
    viewsCount: parseInt(searchParams.get('viewsCount') || '0'),
    postedAt: new Date().toISOString().slice(0, 16),
    industryId: '',
    clientId: searchParams.get('clientId') || '',
  })
  const [sentimentData, setSentimentData] = useState<{
    positive: number | null
    neutral: number | null
    negative: number | null
    overallSentiment: 'positive' | 'neutral' | 'negative' | null
  }>({ positive: null, neutral: null, negative: null, overallSentiment: null })
  const [selectedSubIndustries, setSelectedSubIndustries] = useState<string[]>([])

  const isPreFilled = searchParams.get('postUrl') !== null

  useEffect(() => {
    Promise.all([
      fetch('/api/industries').then(r => r.json()),
      fetch('/api/clients').then(r => r.json()),
      fetch('/api/keywords').then(r => r.json()),
    ]).then(([indData, clientData, kwData]) => {
      setIndustries(indData.industries || indData || [])
      setClients(Array.isArray(clientData) ? clientData.map((c: { id: string; name: string }) => ({ id: c.id, name: c.name })) : [])
      setAvailableKeywords(kwData || [])
    }).catch(() => {})
  }, [])

  const selectedIndustry = industries.find(i => i.id === formData.industryId)
  const availableSubIndustries = selectedIndustry?.subIndustries.filter(s => !selectedSubIndustries.includes(s.id)) || []
  const selectedSubIndustryObjects = selectedIndustry?.subIndustries.filter(s => selectedSubIndustries.includes(s.id)) || []

  const generateEmbed = () => {
    const url = formData.postUrl
    if (!url) return
    let embedUrl = ''
    let embedHtml = ''
    const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/)
    if (ytMatch) {
      embedUrl = `https://www.youtube.com/embed/${ytMatch[1]}`
      embedHtml = `<iframe width="100%" height="315" src="${embedUrl}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`
    }
    const twMatch = url.match(/(?:twitter\.com|x\.com)\/(\w+)\/status\/(\d+)/)
    if (twMatch) {
      embedUrl = url
      embedHtml = `<blockquote class="twitter-tweet"><a href="${url}"></a></blockquote><script async src="https://platform.twitter.com/widgets.js"></script>`
    }
    const ttMatch = url.match(/tiktok\.com\/@[\w.]+\/video\/(\d+)/)
    if (ttMatch) {
      embedUrl = `https://www.tiktok.com/embed/v2/${ttMatch[1]}`
      embedHtml = `<iframe src="${embedUrl}" width="100%" height="750" frameborder="0" allowfullscreen></iframe>`
    }
    const igMatch = url.match(/instagram\.com\/(?:p|reel)\/([a-zA-Z0-9_-]+)/)
    if (igMatch) {
      embedUrl = `${url}/embed`
      embedHtml = `<iframe src="${embedUrl}" width="100%" height="500" frameborder="0" scrolling="no" allowtransparency="true"></iframe>`
    }
    if (embedUrl || embedHtml) {
      setFormData(prev => ({ ...prev, embedUrl, embedHtml }))
    }
  }

  const handleAnalyze = async () => {
    if (!formData.content || formData.content.trim().length < 10) {
      setAnalyzeError('Post content must be at least 10 characters to analyze')
      return
    }
    setIsAnalyzing(true)
    setAnalyzeError('')
    try {
      const response = await fetch('/api/analyze-article', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: formData.content,
          existingKeywords: availableKeywords.map(k => k.name),
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to analyze')

      if (data.suggestedIndustryId) {
        setFormData(prev => ({ ...prev, industryId: data.suggestedIndustryId }))
      }
      if (data.suggestedKeywords?.length > 0) {
        setFormData(prev => ({ ...prev, keywords: data.suggestedKeywords.join(', ') }))
      }
      if (data.suggestedSubIndustryIds?.length > 0) {
        setSelectedSubIndustries(data.suggestedSubIndustryIds)
      }
      if (data.keyPersonalities?.length > 0) {
        setFormData(prev => ({ ...prev, keyPersonalities: data.keyPersonalities.join(', ') }))
      }
      if (data.sentiment) {
        setSentimentData({
          positive: data.sentiment.positive,
          neutral: data.sentiment.neutral,
          negative: data.sentiment.negative,
          overallSentiment: data.overallSentiment,
        })
      }
    } catch (error) {
      setAnalyzeError(error instanceof Error ? error.message : 'Failed to analyze')
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    try {
      const insightId = searchParams.get('insightId')
      if (insightId) {
        const res = await fetch(`/api/social-posts/${insightId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: 'accepted',
            content: formData.content,
            embedUrl: formData.embedUrl,
            embedHtml: formData.embedHtml,
            keywords: formData.keywords,
            keyPersonalities: formData.keyPersonalities || null,
            industryId: formData.industryId || null,
            sentimentPositive: sentimentData.positive,
            sentimentNeutral: sentimentData.neutral,
            sentimentNegative: sentimentData.negative,
            overallSentiment: sentimentData.overallSentiment,
            subIndustryIds: selectedSubIndustries,
          }),
        })
        if (res.ok) { router.push('/media/social') }
        else { const error = await res.json(); alert(error.error || 'Failed to accept post') }
      } else {
        const payload = {
          platform: formData.platform,
          postId: searchParams.get('postId') || `manual_${Date.now()}`,
          content: formData.content,
          authorName: formData.authorName,
          authorHandle: formData.authorHandle,
          postUrl: formData.postUrl,
          embedUrl: formData.embedUrl,
          embedHtml: formData.embedHtml,
          keywords: formData.keywords,
          keyPersonalities: formData.keyPersonalities || null,
          likesCount: formData.likesCount,
          commentsCount: formData.commentsCount,
          sharesCount: formData.sharesCount,
          viewsCount: formData.viewsCount,
          postedAt: new Date(formData.postedAt).toISOString(),
          industryId: formData.industryId || null,
          clientId: formData.clientId || null,
          sentimentPositive: sentimentData.positive,
          sentimentNeutral: sentimentData.neutral,
          sentimentNegative: sentimentData.negative,
          overallSentiment: sentimentData.overallSentiment,
          subIndustryIds: selectedSubIndustries,
          status: 'accepted',
        }
        const res = await fetch('/api/social-posts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (res.ok) { router.push('/media/social') }
        else {
          const error = await res.json()
          alert(error.error?.includes('already exists') ? 'This post has already been added.' : (error.error || 'Failed to create post'))
        }
      }
    } catch (error) {
      alert('Failed to save post')
    } finally {
      setIsLoading(false)
    }
  }

  const industryOptions = [
    { value: '', label: 'Select industry' },
    ...industries.map(i => ({ value: i.id, label: i.name }))
  ]
  const clientOptions = [
    { value: '', label: 'Select client (optional)' },
    ...clients.map(c => ({ value: c.id, label: c.name }))
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white py-6 px-6 shadow-lg">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold">{isPreFilled ? 'Add Scraped Social Post' : 'New Social Post'}</h1>
          <p className="text-purple-100 text-sm mt-1">
            {isPreFilled ? 'Review and save this social media post' : 'Manually add a social media post to the monitoring system'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="max-w-4xl mx-auto p-6 space-y-8">
        
        {/* Platform, Industry & Client */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 bg-purple-100 rounded-lg"><Share2 className="h-5 w-5 text-purple-600" /></div>
            <div>
              <h2 className="font-semibold text-gray-800">Platform & Classification</h2>
              <p className="text-sm text-gray-500">Select the social platform, industry, and client</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label className="text-gray-600 mb-2 block">Platform</Label>
              <Select options={platforms} value={formData.platform} onChange={e => setFormData(p => ({ ...p, platform: e.target.value }))} className="h-11" />
            </div>
            <div>
              <Label className="text-gray-600 mb-2 block">Industry</Label>
              <select className="w-full h-11 rounded-lg border border-gray-200 px-3 bg-white" value={formData.industryId} onChange={e => { setFormData(p => ({ ...p, industryId: e.target.value })); setSelectedSubIndustries([]) }}>
                {industryOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <Label className="text-gray-600 mb-2 block">Client</Label>
              <Select options={clientOptions} value={formData.clientId} onChange={e => setFormData(p => ({ ...p, clientId: e.target.value }))} className="h-11" />
            </div>
          </div>
          {formData.industryId && (
            <div className="grid grid-cols-2 gap-6 mt-6">
              <div>
                <Label className="text-gray-600 text-center block mb-3">Available Sub-industries</Label>
                <div className="border border-gray-200 rounded-lg h-36 overflow-y-auto bg-gray-50">
                  {availableSubIndustries.length === 0 ? (
                    <p className="text-gray-400 text-sm text-center py-4">No more sub-industries</p>
                  ) : availableSubIndustries.map(s => (
                    <div key={s.id} className="px-4 py-2 hover:bg-white cursor-pointer flex justify-between items-center border-b border-gray-100 last:border-0" onClick={() => setSelectedSubIndustries([...selectedSubIndustries, s.id])}>
                      <span className="text-gray-700 text-sm">{s.name}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <Label className="text-gray-600 text-center block mb-3">Selected Sub-industries</Label>
                <div className="border border-gray-200 rounded-lg h-36 overflow-y-auto bg-purple-50">
                  {selectedSubIndustryObjects.length === 0 ? (
                    <p className="text-gray-400 text-sm text-center py-4">Click to add</p>
                  ) : selectedSubIndustryObjects.map(s => (
                    <div key={s.id} className="px-4 py-2 hover:bg-purple-100 cursor-pointer flex justify-between items-center border-b border-purple-100 last:border-0" onClick={() => setSelectedSubIndustries(selectedSubIndustries.filter(x => x !== s.id))}>
                      <span className="text-gray-700 text-sm">{s.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Author Information */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 bg-blue-100 rounded-lg"><User className="h-5 w-5 text-blue-600" /></div>
            <div>
              <h2 className="font-semibold text-gray-800">Author Information</h2>
              <p className="text-sm text-gray-500">Details about the post author</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-gray-600 mb-2 block">Author Name</Label>
              <Input value={formData.authorName} onChange={e => setFormData(p => ({ ...p, authorName: e.target.value }))} placeholder="John Doe" className="h-11" />
            </div>
            <div>
              <Label className="text-gray-600 mb-2 block">Author Handle</Label>
              <Input value={formData.authorHandle} onChange={e => setFormData(p => ({ ...p, authorHandle: e.target.value }))} placeholder="@johndoe" className="h-11" />
            </div>
          </div>
        </div>

        {/* Content & AI Analysis */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-green-100 rounded-lg"><MessageCircle className="h-5 w-5 text-green-600" /></div>
              <Label className="font-semibold text-gray-800">Post Content</Label>
            </div>
            <Button type="button" onClick={handleAnalyze} disabled={isAnalyzing || !formData.content || formData.content.trim().length < 10} variant="outline" className="flex items-center gap-2 text-purple-600 border-purple-200 hover:bg-purple-50">
              {isAnalyzing ? (<><Loader2 className="h-4 w-4 animate-spin" />Analyzing...</>) : (<><Wand2 className="h-4 w-4" />Analyze with AI</>)}
            </Button>
          </div>
          {analyzeError && <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">{analyzeError}</div>}
          <Textarea 
            value={formData.content} 
            onChange={e => setFormData(p => ({ ...p, content: e.target.value }))} 
            placeholder="Enter the post content..."
            rows={4}
            className="mb-4"
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-gray-600 mb-2 block">Keywords</Label>
              <KeywordInput
                value={formData.keywords}
                onChange={(value) => setFormData(p => ({ ...p, keywords: value }))}
                availableKeywords={availableKeywords}
                placeholder="Search keywords..."
              />
            </div>
            <div>
              <Label className="text-gray-600 mb-2 flex items-center gap-1"><Users className="h-3 w-3" />Key Personalities</Label>
              <Input value={formData.keyPersonalities} onChange={e => setFormData(p => ({ ...p, keyPersonalities: e.target.value }))} placeholder="Dr. John Smith, Minister Jane Doe" className="h-11" />
              <p className="text-xs text-gray-400 mt-1">Comma-separated names. AI will auto-detect when analyzing.</p>
            </div>
          </div>
        </div>

        {/* Sentiment Analysis */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <Label className="font-semibold text-gray-800 block mb-4">Sentiment Analysis</Label>
          <SentimentDisplay 
            positive={sentimentData.positive} 
            neutral={sentimentData.neutral} 
            negative={sentimentData.negative} 
            overallSentiment={sentimentData.overallSentiment} 
            isLoading={isAnalyzing} 
            onSentimentChange={(data) => setSentimentData(data)} 
          />
        </div>

        {/* URL & Embed */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 bg-orange-100 rounded-lg"><Link2 className="h-5 w-5 text-orange-600" /></div>
            <div>
              <h2 className="font-semibold text-gray-800">URL & Embed</h2>
              <p className="text-sm text-gray-500">Post URL and embed code for display</p>
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <Label className="text-gray-600 mb-2 block">Post URL</Label>
              <div className="flex gap-2">
                <Input value={formData.postUrl} onChange={e => setFormData(p => ({ ...p, postUrl: e.target.value }))} placeholder="https://twitter.com/user/status/123..." className="flex-1 h-11" />
                <Button type="button" variant="outline" onClick={generateEmbed} className="h-11 px-4">
                  <Wand2 className="h-4 w-4 mr-2" /> Generate Embed
                </Button>
              </div>
            </div>
            <div>
              <Label className="text-gray-600 mb-2 block">Embed URL</Label>
              <Input value={formData.embedUrl} onChange={e => setFormData(p => ({ ...p, embedUrl: e.target.value }))} placeholder="https://www.youtube.com/embed/..." className="h-11" />
            </div>
            <div>
              <Label className="text-gray-600 mb-2 flex items-center gap-2"><Code className="h-4 w-4" />Embed HTML</Label>
              <Textarea value={formData.embedHtml} onChange={e => setFormData(p => ({ ...p, embedHtml: e.target.value }))} placeholder="<iframe src='...'></iframe>" rows={3} />
            </div>
            {formData.embedHtml && (
              <div>
                <Label className="text-gray-600 mb-2 block">Embed Preview</Label>
                <div className="border rounded-lg p-4 bg-gray-50 overflow-hidden">
                  <div dangerouslySetInnerHTML={{ __html: formData.embedHtml }} />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Engagement & Date */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 bg-pink-100 rounded-lg"><Heart className="h-5 w-5 text-pink-600" /></div>
            <div>
              <h2 className="font-semibold text-gray-800">Engagement & Date</h2>
              <p className="text-sm text-gray-500">Engagement metrics and posting date</p>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div>
              <Label className="text-gray-600 mb-2 flex items-center gap-1"><Heart className="h-3 w-3" />Likes</Label>
              <Input type="number" value={formData.likesCount} onChange={e => setFormData(p => ({ ...p, likesCount: parseInt(e.target.value) || 0 }))} className="h-11" />
            </div>
            <div>
              <Label className="text-gray-600 mb-2 flex items-center gap-1"><MessageCircle className="h-3 w-3" />Comments</Label>
              <Input type="number" value={formData.commentsCount} onChange={e => setFormData(p => ({ ...p, commentsCount: parseInt(e.target.value) || 0 }))} className="h-11" />
            </div>
            <div>
              <Label className="text-gray-600 mb-2 flex items-center gap-1"><Repeat2 className="h-3 w-3" />Shares</Label>
              <Input type="number" value={formData.sharesCount} onChange={e => setFormData(p => ({ ...p, sharesCount: parseInt(e.target.value) || 0 }))} className="h-11" />
            </div>
            <div>
              <Label className="text-gray-600 mb-2 flex items-center gap-1"><Eye className="h-3 w-3" />Views</Label>
              <Input type="number" value={formData.viewsCount} onChange={e => setFormData(p => ({ ...p, viewsCount: parseInt(e.target.value) || 0 }))} className="h-11" />
            </div>
            <div>
              <Label className="text-gray-600 mb-2 flex items-center gap-1"><Calendar className="h-3 w-3" />Posted At</Label>
              <Input type="datetime-local" value={formData.postedAt} onChange={e => setFormData(p => ({ ...p, postedAt: e.target.value }))} className="h-11" />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-4 pt-4">
          <Button type="button" variant="outline" onClick={() => router.back()} className="px-6">Cancel</Button>
          <Button type="submit" className="bg-purple-500 hover:bg-purple-600 text-white px-8" disabled={isLoading}>
            {isLoading ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving...</>) : (isPreFilled ? 'Save Post' : 'Create Post')}
          </Button>
        </div>
      </form>
    </div>
  )
}
