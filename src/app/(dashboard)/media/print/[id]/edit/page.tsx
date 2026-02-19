'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RichTextEditor } from '@/components/ui/rich-text-editor'
import { SentimentDisplay } from '@/components/ui/sentiment-display'
import { KeywordInput } from '@/components/ui/keyword-input'
import { Camera, ChevronRight, ChevronLeft, Loader2, FileText, User, BookOpen, ArrowLeft, Wand2 } from 'lucide-react'

interface Publication {
  id: string
  name: string
  issues?: Issue[]
}

interface Issue {
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

interface Keyword {
  id: string
  name: string
}

export default function EditPrintStoryPage() {
  const router = useRouter()
  const params = useParams()
  const storyId = params.id as string

  const [publications, setPublications] = useState<Publication[]>([])
  const [industries, setIndustries] = useState<Industry[]>([])
  const [availableKeywords, setAvailableKeywords] = useState<Keyword[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    title: '',
    author: '',
    pageNumbers: '',
    publicationId: '',
    issueId: '',
    publicationDate: '',
    summary: '',
    keywords: '',
    articleText: '',
    industryId: '',
  })
  const [sentimentData, setSentimentData] = useState<{
    positive: number | null
    neutral: number | null
    negative: number | null
    overallSentiment: 'positive' | 'neutral' | 'negative' | null
  }>({
    positive: null,
    neutral: null,
    negative: null,
    overallSentiment: null,
  })
  const [selectedSubIndustries, setSelectedSubIndustries] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analyzeError, setAnalyzeError] = useState('')

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true)
      try {
        const [storyRes, pubRes, indRes, keywordRes] = await Promise.all([
          fetch(`/api/print-stories/${storyId}`),
          fetch('/api/print-publications'),
          fetch('/api/industries'),
          fetch('/api/keywords'),
        ])
        if (!storyRes.ok) throw new Error('Story not found')
        const story = await storyRes.json()
        if (pubRes.ok) setPublications(await pubRes.json())
        if (indRes.ok) setIndustries(await indRes.json())
        if (keywordRes.ok) setAvailableKeywords(await keywordRes.json())
        setFormData({
          title: story.title || '',
          author: story.author || '',
          pageNumbers: story.pageNumbers || '',
          publicationId: story.publicationId || '',
          issueId: story.issueId || '',
          publicationDate: story.date ? new Date(story.date).toISOString().split('T')[0] : '',
          summary: story.summary || '',
          keywords: story.keywords || '',
          articleText: story.content || '',
          industryId: story.industryId || '',
        })
        setSentimentData({
          positive: story.sentimentPositive ?? null,
          neutral: story.sentimentNeutral ?? null,
          negative: story.sentimentNegative ?? null,
          overallSentiment: story.overallSentiment ?? null,
        })
        if (story.subIndustries?.length) {
          setSelectedSubIndustries(story.subIndustries.map((si: any) => si.subIndustryId || si.subIndustry?.id))
        }
      } catch (err) {
        setLoadError(err instanceof Error ? err.message : 'Failed to load story')
      } finally {
        setIsLoading(false)
      }
    }
    loadData()
  }, [storyId])

  const selectedIndustry = industries.find(i => i.id === formData.industryId)
  const availableSubIndustries = selectedIndustry?.subIndustries.filter(s => !selectedSubIndustries.includes(s.id)) || []
  const selectedSubIndustryObjects = selectedIndustry?.subIndustries.filter(s => selectedSubIndustries.includes(s.id)) || []

  const handleArticleTextChange = (html: string) => {
    setFormData({ ...formData, articleText: html })
  }

  const handleAnalyzeArticle = async () => {
    if (!formData.articleText || formData.articleText.trim().length === 0) {
      setAnalyzeError('Please add article content first')
      return
    }

    setIsAnalyzing(true)
    setAnalyzeError('')

    try {
      const response = await fetch('/api/analyze-article', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: formData.articleText }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to analyze article')
      }

      if (data.summary) {
        setFormData(prev => ({ ...prev, summary: data.summary }))
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
      setAnalyzeError(error instanceof Error ? error.message : 'Failed to analyze article')
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/print-stories/${storyId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title,
          content: formData.articleText,
          summary: formData.summary,
          author: formData.author,
          pageNumbers: formData.pageNumbers,
          keywords: formData.keywords,
          date: formData.publicationDate,
          publicationId: formData.publicationId || null,
          issueId: formData.issueId || null,
          industryId: formData.industryId || null,
          subIndustryIds: selectedSubIndustries,
          sentimentPositive: sentimentData.positive,
          sentimentNeutral: sentimentData.neutral,
          sentimentNegative: sentimentData.negative,
          overallSentiment: sentimentData.overallSentiment,
        }),
      })
      if (!response.ok) throw new Error('Failed to update story')
      router.push('/media/print')
    } catch (err) {
      console.error('Update error:', err)
      alert('Failed to update story')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 mb-4">{loadError}</p>
          <Button onClick={() => router.push('/media/print')} variant="outline">Back to Stories</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white py-6 px-6 shadow-lg">
        <div className="max-w-4xl mx-auto">
          <button onClick={() => router.push('/media/print')} className="flex items-center gap-2 text-orange-100 hover:text-white mb-3">
            <ArrowLeft className="h-4 w-4" />Back to Stories
          </button>
          <h1 className="text-2xl font-bold">Edit Print Story</h1>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="max-w-4xl mx-auto p-6 space-y-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 bg-blue-100 rounded-lg"><FileText className="h-5 w-5 text-blue-600" /></div>
            <Label className="font-semibold text-gray-800">Article Title</Label>
          </div>
          <Input value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className="h-12 text-lg" required />
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 bg-purple-100 rounded-lg"><FileText className="h-5 w-5 text-purple-600" /></div>
            <Label className="font-semibold text-gray-800">Article Content</Label>
          </div>
          <RichTextEditor value={formData.articleText} onChange={handleArticleTextChange} className="min-h-[400px]" />
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-3">
            <Label className="font-semibold text-gray-800">Article Summary</Label>
            <Button
              type="button"
              onClick={handleAnalyzeArticle}
              disabled={isAnalyzing || !formData.articleText}
              variant="outline"
              className="flex items-center gap-2 text-purple-600 border-purple-200 hover:bg-purple-50 hover:border-purple-300"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Wand2 className="h-4 w-4" />
                  Analyze with AI
                </>
              )}
            </Button>
          </div>
          {analyzeError && (
            <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
              {analyzeError}
            </div>
          )}
          <textarea className="w-full min-h-[120px] rounded-lg border border-gray-200 p-4 resize-y" value={formData.summary} onChange={(e) => setFormData({ ...formData, summary: e.target.value })} placeholder="Click 'Analyze with AI' to generate a summary and sentiment analysis, or write your own..." />
        </div>

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

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="font-semibold text-gray-800 mb-4">Publication Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label className="text-gray-600 flex items-center gap-2 mb-2"><BookOpen className="h-4 w-4" />Publication</Label>
              <select className="w-full h-11 rounded-lg border px-3 bg-white" value={formData.publicationId} onChange={(e) => setFormData({ ...formData, publicationId: e.target.value, issueId: '' })}>
                <option value="">Select publication</option>
                {publications.map(pub => (<option key={pub.id} value={pub.id}>{pub.name}</option>))}
              </select>
            </div>
            <div>
              <Label className="text-gray-600 mb-2 block">Publication Date</Label>
              <Input type="date" value={formData.publicationDate} onChange={(e) => setFormData({ ...formData, publicationDate: e.target.value })} className="h-11" required />
            </div>
            <div>
              <Label className="text-gray-600 flex items-center gap-2 mb-2"><User className="h-4 w-4" />Article Author</Label>
              <Input value={formData.author} onChange={(e) => setFormData({ ...formData, author: e.target.value })} className="h-11" />
            </div>
            <div>
              <Label className="text-gray-600 mb-2 block">Page Numbers</Label>
              <Input value={formData.pageNumbers} onChange={(e) => setFormData({ ...formData, pageNumbers: e.target.value })} placeholder="e.g., 12-14" className="h-11" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <Label className="font-semibold text-gray-800 block mb-3">Keywords</Label>
          <KeywordInput
            value={formData.keywords}
            onChange={(value) => setFormData({ ...formData, keywords: value })}
            availableKeywords={availableKeywords}
            placeholder="Search keywords..."
          />
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <Label className="font-semibold text-gray-800 block mb-3">Industry Classification</Label>
          <select className="w-full h-11 rounded-lg border px-3 bg-white max-w-md" value={formData.industryId} onChange={(e) => { setFormData({ ...formData, industryId: e.target.value }); setSelectedSubIndustries([]) }}>
            <option value="">Select Industry</option>
            {industries.map(i => (<option key={i.id} value={i.id}>{i.name}</option>))}
          </select>
          {formData.industryId && (
            <div className="grid grid-cols-2 gap-6 mt-6">
              <div>
                <Label className="text-center block mb-3">Available</Label>
                <div className="border rounded-lg h-48 overflow-y-auto bg-gray-50">
                  {availableSubIndustries.map(s => (
                    <div key={s.id} className="px-4 py-3 hover:bg-white cursor-pointer flex justify-between" onClick={() => setSelectedSubIndustries([...selectedSubIndustries, s.id])}>
                      <span>{s.name}</span><ChevronRight className="h-4 w-4" />
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <Label className="text-center block mb-3">Selected</Label>
                <div className="border rounded-lg h-48 overflow-y-auto bg-orange-50">
                  {selectedSubIndustryObjects.map(s => (
                    <div key={s.id} className="px-4 py-3 hover:bg-orange-100 cursor-pointer flex justify-between" onClick={() => setSelectedSubIndustries(selectedSubIndustries.filter(x => x !== s.id))}>
                      <ChevronLeft className="h-4 w-4" /><span>{s.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-4 pt-4">
          <Button type="button" variant="outline" onClick={() => router.push('/media/print')} className="px-6">Cancel</Button>
          <Button type="submit" className="bg-orange-500 hover:bg-orange-600 text-white px-8" disabled={isSubmitting}>
            {isSubmitting ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin" />Updating...</>) : 'Update Story'}
          </Button>
        </div>
      </form>
    </div>
  )
}
