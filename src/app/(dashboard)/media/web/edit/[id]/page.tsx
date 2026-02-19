'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RichTextEditor } from '@/components/ui/rich-text-editor'
import { SentimentDisplay } from '@/components/ui/sentiment-display'
import { KeywordInput } from '@/components/ui/keyword-input'
import { ChevronRight, ChevronLeft, Loader2, Globe, Calendar, User, FileText, Image as ImageIcon, Trash2, Wand2, ArrowLeft, Camera } from 'lucide-react'

interface Publication {
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

export default function EditWebStoryPage() {
  const router = useRouter()
  const params = useParams()
  const storyId = params.id as string

  const [publications, setPublications] = useState<Publication[]>([])
  const [industries, setIndustries] = useState<Industry[]>([])
  const [availableKeywords, setAvailableKeywords] = useState<Keyword[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [formData, setFormData] = useState({
    title: '',
    author: '',
    publicationId: '',
    publicationDate: '',
    sourceUrl: '',
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
  const [extractedImages, setExtractedImages] = useState<string[]>([])
  const [selectedSubIndustries, setSelectedSubIndustries] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analyzeError, setAnalyzeError] = useState('')

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [pubRes, indRes, keywordRes, storyRes] = await Promise.all([
          fetch('/api/web-publications'),
          fetch('/api/industries'),
          fetch('/api/keywords'),
          fetch(`/api/web-stories/${storyId}`),
        ])
        
        if (pubRes.ok) setPublications(await pubRes.json())
        if (indRes.ok) setIndustries(await indRes.json())
        if (keywordRes.ok) setAvailableKeywords(await keywordRes.json())
        
        if (storyRes.ok) {
          const story = await storyRes.json()
          setFormData({
            title: story.title || '',
            author: story.author || '',
            publicationId: story.publicationId || '',
            publicationDate: story.date ? new Date(story.date).toISOString().split('T')[0] : '',
            sourceUrl: story.sourceUrl || '',
            summary: story.summary || '',
            keywords: story.keywords || '',
            articleText: story.content || '',
            industryId: story.industryId || '',
          })
          setSentimentData({
            positive: story.sentimentPositive,
            neutral: story.sentimentNeutral,
            negative: story.sentimentNegative,
            overallSentiment: story.overallSentiment,
          })
          if (story.images) {
            setExtractedImages(story.images.map((img: { url: string }) => img.url))
          }
          if (story.subIndustries) {
            setSelectedSubIndustries(story.subIndustries.map((s: { subIndustryId: string }) => s.subIndustryId))
          }
        }
      } catch (err) {
        console.error('Failed to load data:', err)
      } finally {
        setIsLoading(false)
      }
    }
    fetchData()
  }, [storyId])

  const selectedIndustry = industries.find(i => i.id === formData.industryId)
  const availableSubIndustries = selectedIndustry?.subIndustries.filter(s => !selectedSubIndustries.includes(s.id)) || []
  const selectedSubIndustryObjects = selectedIndustry?.subIndustries.filter(s => selectedSubIndustries.includes(s.id)) || []

  const handleArticleTextChange = (html: string) => {
    setFormData({ ...formData, articleText: html })
  }

  const handleRemoveImage = (index: number) => {
    setExtractedImages(prev => prev.filter((_, i) => i !== index))
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
      if (!response.ok) throw new Error(data.error || 'Failed to analyze article')
      if (data.summary) setFormData(prev => ({ ...prev, summary: data.summary }))
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
      const response = await fetch(`/api/web-stories/${storyId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title,
          content: formData.articleText,
          summary: formData.summary,
          author: formData.author,
          sourceUrl: formData.sourceUrl,
          keywords: formData.keywords,
          date: formData.publicationDate,
          publicationId: formData.publicationId || null,
          industryId: formData.industryId || null,
          subIndustryIds: selectedSubIndustries,
          images: extractedImages.map(url => ({ url })),
          sentimentPositive: sentimentData.positive,
          sentimentNeutral: sentimentData.neutral,
          sentimentNegative: sentimentData.negative,
          overallSentiment: sentimentData.overallSentiment,
        }),
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.details || error.error || 'Failed to update story')
      }
      router.push('/media/web')
    } catch (err) {
      console.error('Submit error:', err)
      alert(err instanceof Error ? err.message : 'Failed to save article')
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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white py-6 px-6 shadow-lg">
        <div className="max-w-4xl mx-auto">
          <button onClick={() => router.push('/media/web')} className="flex items-center gap-2 text-orange-100 hover:text-white mb-3 transition-colors">
            <ArrowLeft className="h-4 w-4" />Back to Stories
          </button>
          <h1 className="text-2xl font-bold">Edit Web Article</h1>
          <p className="text-orange-100 text-sm mt-1">Update the web article details</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="max-w-4xl mx-auto p-6 space-y-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 bg-blue-100 rounded-lg"><FileText className="h-5 w-5 text-blue-600" /></div>
            <Label htmlFor="title" className="font-semibold text-gray-800">Article Title</Label>
          </div>
          <Input id="title" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} placeholder="Enter the article title" className="h-12 text-lg" required />
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
            <Label htmlFor="summary" className="font-semibold text-gray-800">Article Summary</Label>
            <Button type="button" onClick={handleAnalyzeArticle} disabled={isAnalyzing || !formData.articleText} variant="outline" className="flex items-center gap-2 text-purple-600 border-purple-200 hover:bg-purple-50">
              {isAnalyzing ? (<><Loader2 className="h-4 w-4 animate-spin" />Analyzing...</>) : (<><Wand2 className="h-4 w-4" />Analyze with AI</>)}
            </Button>
          </div>
          {analyzeError && <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">{analyzeError}</div>}
          <textarea id="summary" className="w-full min-h-[120px] rounded-lg border border-gray-200 p-4 resize-y" value={formData.summary} onChange={(e) => setFormData({ ...formData, summary: e.target.value })} placeholder="Article summary..." />
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <Label className="font-semibold text-gray-800 block mb-4">Sentiment Analysis</Label>
          <SentimentDisplay positive={sentimentData.positive} neutral={sentimentData.neutral} negative={sentimentData.negative} overallSentiment={sentimentData.overallSentiment} isLoading={isAnalyzing} onSentimentChange={(data) => setSentimentData(data)} />
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="font-semibold text-gray-800 mb-4">Article Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="author" className="text-gray-600 flex items-center gap-2 mb-2"><User className="h-4 w-4" />Author</Label>
              <Input id="author" value={formData.author} onChange={(e) => setFormData({ ...formData, author: e.target.value })} placeholder="Article author" className="h-11" />
            </div>
            <div>
              <Label htmlFor="publicationDate" className="text-gray-600 flex items-center gap-2 mb-2"><Calendar className="h-4 w-4" />Publication Date</Label>
              <Input id="publicationDate" type="date" value={formData.publicationDate} onChange={(e) => setFormData({ ...formData, publicationDate: e.target.value })} className="h-11" required />
            </div>
            <div>
              <Label htmlFor="sourceUrl" className="text-gray-600 flex items-center gap-2 mb-2"><Globe className="h-4 w-4" />Source URL</Label>
              <Input id="sourceUrl" value={formData.sourceUrl} onChange={(e) => setFormData({ ...formData, sourceUrl: e.target.value })} placeholder="https://..." className="h-11" />
            </div>
            <div>
              <Label htmlFor="publication" className="text-gray-600 mb-2 block">Publication</Label>
              <select id="publication" className="w-full h-11 rounded-lg border border-gray-200 px-3 bg-white" value={formData.publicationId} onChange={(e) => setFormData({ ...formData, publicationId: e.target.value })}>
                <option value="">Select publication</option>
                {publications.map(pub => (<option key={pub.id} value={pub.id}>{pub.name}</option>))}
              </select>
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="keywords" className="text-gray-600 mb-2 block">Keywords</Label>
              <KeywordInput
                value={formData.keywords}
                onChange={(value) => setFormData({ ...formData, keywords: value })}
                availableKeywords={availableKeywords}
                placeholder="Search keywords..."
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 bg-green-100 rounded-lg"><ImageIcon className="h-5 w-5 text-green-600" /></div>
            <Label className="font-semibold text-gray-800">Article Images</Label>
          </div>
          {extractedImages.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {extractedImages.map((imageUrl, index) => (
                <div key={index} className="relative group">
                  <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
                    <img src={imageUrl} alt={`Image ${index + 1}`} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                  </div>
                  <button type="button" onClick={() => handleRemoveImage(index)} className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg">
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="border-2 border-dashed border-gray-200 rounded-lg p-8 text-center">
              <Camera className="h-10 w-10 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500">No images attached</p>
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <Label htmlFor="industry" className="font-semibold text-gray-800 block mb-3">Industry Classification</Label>
          <select id="industry" className="w-full h-11 rounded-lg border border-gray-200 px-3 bg-white max-w-md" value={formData.industryId} onChange={(e) => { setFormData({ ...formData, industryId: e.target.value }); setSelectedSubIndustries([]) }}>
            <option value="">Select Industry</option>
            {industries.map(industry => (<option key={industry.id} value={industry.id}>{industry.name}</option>))}
          </select>
          {formData.industryId && (
            <div className="grid grid-cols-2 gap-6 mt-6">
              <div>
                <Label className="text-gray-600 text-center block mb-3">Available Sub-industries</Label>
                <div className="border border-gray-200 rounded-lg h-48 overflow-y-auto bg-gray-50">
                  {availableSubIndustries.length === 0 ? (<p className="text-gray-400 text-sm text-center py-4">No more sub-industries</p>) : (
                    availableSubIndustries.map(s => (<div key={s.id} className="px-4 py-3 hover:bg-white cursor-pointer flex justify-between items-center border-b border-gray-100 last:border-0" onClick={() => setSelectedSubIndustries([...selectedSubIndustries, s.id])}><span className="text-gray-700">{s.name}</span><ChevronRight className="h-4 w-4 text-gray-400" /></div>))
                  )}
                </div>
              </div>
              <div>
                <Label className="text-gray-600 text-center block mb-3">Selected Sub-industries</Label>
                <div className="border border-gray-200 rounded-lg h-48 overflow-y-auto bg-orange-50">
                  {selectedSubIndustryObjects.length === 0 ? (<p className="text-gray-400 text-sm text-center py-4">Click to add</p>) : (
                    selectedSubIndustryObjects.map(s => (<div key={s.id} className="px-4 py-3 hover:bg-orange-100 cursor-pointer flex justify-between items-center border-b border-orange-100 last:border-0" onClick={() => setSelectedSubIndustries(selectedSubIndustries.filter(x => x !== s.id))}><ChevronLeft className="h-4 w-4 text-orange-400" /><span className="text-gray-700">{s.name}</span></div>))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-4 pt-4">
          <Button type="button" variant="outline" onClick={() => router.push('/media/web')} className="px-6">Cancel</Button>
          <Button type="submit" className="bg-orange-500 hover:bg-orange-600 text-white px-8" disabled={isSubmitting}>
            {isSubmitting ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving...</>) : 'Update Article'}
          </Button>
        </div>
      </form>
    </div>
  )
}
