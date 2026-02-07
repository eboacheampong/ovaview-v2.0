'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RichTextEditor } from '@/components/ui/rich-text-editor'
import { SentimentDisplay } from '@/components/ui/sentiment-display'
import { Camera, ChevronRight, ChevronLeft, Link2, Loader2, Sparkles, X, Globe, Calendar, User, FileText, Image as ImageIcon, Trash2, Wand2 } from 'lucide-react'

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

export default function AddWebStoryPage() {
  const router = useRouter()
  const [publications, setPublications] = useState<Publication[]>([])
  const [industries, setIndustries] = useState<Industry[]>([])
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
  const [isExtracting, setIsExtracting] = useState(false)
  const [extractError, setExtractError] = useState('')
  const [extractSuccess, setExtractSuccess] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analyzeError, setAnalyzeError] = useState('')

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [pubRes, indRes] = await Promise.all([
          fetch('/api/web-publications'),
          fetch('/api/industries'),
        ])
        if (pubRes.ok) setPublications(await pubRes.json())
        if (indRes.ok) setIndustries(await indRes.json())
      } catch (err) {
        console.error('Failed to load form data:', err)
      }
    }
    fetchData()
  }, [])

  const selectedIndustry = industries.find(i => i.id === formData.industryId)
  const availableSubIndustries = selectedIndustry?.subIndustries.filter(s => !selectedSubIndustries.includes(s.id)) || []
  const selectedSubIndustryObjects = selectedIndustry?.subIndustries.filter(s => selectedSubIndustries.includes(s.id)) || []

  const handleArticleTextChange = (html: string) => {
    setFormData({ ...formData, articleText: html })
  }

  const handleExtractArticle = async () => {
    if (!formData.sourceUrl) {
      setExtractError('Please enter a URL first')
      return
    }

    setIsExtracting(true)
    setExtractError('')
    setExtractSuccess(false)

    try {
      const response = await fetch('/api/extract-article', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: formData.sourceUrl }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to extract article')
      }

      setFormData(prev => ({
        ...prev,
        title: data.title || prev.title,
        author: data.author || prev.author,
        publicationDate: data.publishDate || prev.publicationDate,
        articleText: data.content || prev.articleText,
      }))

      if (data.images && data.images.length > 0) {
        setExtractedImages(data.images)
      }

      setExtractSuccess(true)
      setTimeout(() => setExtractSuccess(false), 3000)

    } catch (error) {
      setExtractError(error instanceof Error ? error.message : 'Failed to extract article')
    } finally {
      setIsExtracting(false)
    }
  }

  const handleRemoveImage = (index: number) => {
    setExtractedImages(prev => prev.filter((_, i) => i !== index))
  }

  const handleClearForm = () => {
    setFormData({
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
    setSentimentData({ positive: null, neutral: null, negative: null, overallSentiment: null })
    setExtractedImages([])
    setSelectedSubIndustries([])
    setExtractError('')
    setExtractSuccess(false)
    setAnalyzeError('')
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
      // Upload extracted images to Vercel Blob storage
      const uploadedImages: string[] = []
      for (const imageUrl of extractedImages) {
        try {
          const uploadRes = await fetch('/api/upload', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: imageUrl, folder: 'web-images' }),
          })
          if (uploadRes.ok) {
            const { url } = await uploadRes.json()
            uploadedImages.push(url)
          } else {
            // Keep original URL if upload fails
            uploadedImages.push(imageUrl)
          }
        } catch {
          // Keep original URL if upload fails
          uploadedImages.push(imageUrl)
        }
      }

      const response = await fetch('/api/web-stories', {
        method: 'POST',
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
          images: uploadedImages.map(url => ({ url })),
          sentimentPositive: sentimentData.positive,
          sentimentNeutral: sentimentData.neutral,
          sentimentNegative: sentimentData.negative,
          overallSentiment: sentimentData.overallSentiment,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        console.error('API Error Response:', error)
        throw new Error(error.details || error.error || 'Failed to create story')
      }

      router.push('/media/web')
    } catch (err) {
      console.error('Submit error:', err)
      alert(err instanceof Error ? err.message : 'Failed to save article')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white py-6 px-6 shadow-lg">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold">New Web Article</h1>
          <p className="text-orange-100 text-sm mt-1">Add a new web article to the media monitoring system</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="max-w-4xl mx-auto p-6 space-y-8">
        
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Sparkles className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-800">Auto-Fill from URL</h2>
              <p className="text-sm text-gray-500">Paste an article URL to automatically extract content and images</p>
            </div>
          </div>
          
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                value={formData.sourceUrl}
                onChange={(e) => setFormData({ ...formData, sourceUrl: e.target.value })}
                placeholder="https://example.com/article..."
                className="pl-10 h-11"
              />
            </div>
            <Button type="button" onClick={handleExtractArticle} disabled={isExtracting || !formData.sourceUrl} className="bg-orange-500 hover:bg-orange-600 text-white h-11 px-6">
              {isExtracting ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin" />Extracting...</>) : (<><Link2 className="h-4 w-4 mr-2" />Extract</>)}
            </Button>
            {(formData.sourceUrl || formData.title) && (
              <Button type="button" variant="outline" onClick={handleClearForm} className="h-11"><X className="h-4 w-4" /></Button>
            )}
          </div>

          {extractError && <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">{extractError}</div>}
          {extractSuccess && <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg text-green-600 text-sm flex items-center gap-2"><Sparkles className="h-4 w-4" />Article content and images extracted successfully!</div>}
        </div>

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
            <Button type="button" onClick={handleAnalyzeArticle} disabled={isAnalyzing || !formData.articleText} variant="outline" className="flex items-center gap-2 text-purple-600 border-purple-200 hover:bg-purple-50 hover:border-purple-300">
              {isAnalyzing ? (<><Loader2 className="h-4 w-4 animate-spin" />Analyzing...</>) : (<><Wand2 className="h-4 w-4" />Analyze with AI</>)}
            </Button>
          </div>
          {analyzeError && <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">{analyzeError}</div>}
          <textarea id="summary" className="w-full min-h-[120px] rounded-lg border border-gray-200 p-4 resize-y focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all" value={formData.summary} onChange={(e) => setFormData({ ...formData, summary: e.target.value })} placeholder="Click 'Analyze with AI' to generate a summary and sentiment analysis, or write your own..." />
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
              <Label htmlFor="publication" className="text-gray-600 mb-2 block">Publication</Label>
              <select id="publication" className="w-full h-11 rounded-lg border border-gray-200 px-3 bg-white focus:ring-2 focus:ring-orange-500 focus:border-transparent" value={formData.publicationId} onChange={(e) => setFormData({ ...formData, publicationId: e.target.value })}>
                <option value="">Select publication</option>
                {publications.map(pub => (<option key={pub.id} value={pub.id}>{pub.name}</option>))}
              </select>
            </div>
            <div>
              <Label htmlFor="keywords" className="text-gray-600 mb-2 block">Keywords</Label>
              <Input id="keywords" value={formData.keywords} onChange={(e) => setFormData({ ...formData, keywords: e.target.value })} placeholder="technology, news, africa..." className="h-11" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 bg-green-100 rounded-lg"><ImageIcon className="h-5 w-5 text-green-600" /></div>
            <div>
              <Label className="font-semibold text-gray-800">Article Images</Label>
              {extractedImages.length > 0 && <p className="text-sm text-gray-500">{extractedImages.length} image(s) extracted from article</p>}
            </div>
          </div>
          
          {extractedImages.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {extractedImages.map((imageUrl, index) => (
                <div key={index} className="relative group">
                  <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
                    <img src={imageUrl} alt={`Extracted image ${index + 1}`} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                  </div>
                  <button type="button" onClick={() => handleRemoveImage(index)} className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg">
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))}
              <div className="aspect-video border-2 border-dashed border-gray-200 rounded-lg flex flex-col items-center justify-center hover:border-orange-300 transition-colors cursor-pointer">
                <Camera className="h-8 w-8 text-gray-400 mb-2" /><p className="text-sm text-gray-500">Add more</p>
              </div>
            </div>
          ) : (
            <div className="border-2 border-dashed border-gray-200 rounded-lg p-8 text-center hover:border-orange-300 transition-colors cursor-pointer">
              <Camera className="h-10 w-10 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600 font-medium">Click to upload images</p>
              <p className="text-sm text-gray-400 mt-1">PNG, JPG up to 10MB • Or extract from URL above</p>
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <Label htmlFor="industry" className="font-semibold text-gray-800 block mb-3">Industry Classification</Label>
          <select id="industry" className="w-full h-11 rounded-lg border border-gray-200 px-3 bg-white max-w-md focus:ring-2 focus:ring-orange-500 focus:border-transparent" value={formData.industryId} onChange={(e) => { setFormData({ ...formData, industryId: e.target.value }); setSelectedSubIndustries([]) }}>
            <option value="">Select Industry</option>
            {industries.map(industry => (<option key={industry.id} value={industry.id}>{industry.name}</option>))}
          </select>

          {formData.industryId && (
            <div className="grid grid-cols-2 gap-6 mt-6">
              <div>
                <Label className="text-gray-600 text-center block mb-3">Available Sub-industries</Label>
                <div className="border border-gray-200 rounded-lg h-48 overflow-y-auto bg-gray-50">
                  {availableSubIndustries.length === 0 ? (<p className="text-gray-400 text-sm text-center py-4">No more sub-industries</p>) : (
                    availableSubIndustries.map(s => (
                      <div key={s.id} className="px-4 py-3 hover:bg-white cursor-pointer flex justify-between items-center border-b border-gray-100 last:border-0 transition-colors" onClick={() => setSelectedSubIndustries([...selectedSubIndustries, s.id])}>
                        <span className="text-gray-700">{s.name}</span><ChevronRight className="h-4 w-4 text-gray-400" />
                      </div>
                    ))
                  )}
                </div>
              </div>
              <div>
                <Label className="text-gray-600 text-center block mb-3">Selected Sub-industries</Label>
                <div className="border border-gray-200 rounded-lg h-48 overflow-y-auto bg-orange-50">
                  {selectedSubIndustryObjects.length === 0 ? (<p className="text-gray-400 text-sm text-center py-4">Click to add sub-industries</p>) : (
                    selectedSubIndustryObjects.map(s => (
                      <div key={s.id} className="px-4 py-3 hover:bg-orange-100 cursor-pointer flex justify-between items-center border-b border-orange-100 last:border-0 transition-colors" onClick={() => setSelectedSubIndustries(selectedSubIndustries.filter(x => x !== s.id))}>
                        <ChevronLeft className="h-4 w-4 text-orange-400" /><span className="text-gray-700">{s.name}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-4 pt-4">
          <Button type="button" variant="outline" onClick={() => router.back()} className="px-6">Cancel</Button>
          <Button type="submit" className="bg-orange-500 hover:bg-orange-600 text-white px-8" disabled={isSubmitting}>
            {isSubmitting ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving...</>) : 'Save Article'}
          </Button>
        </div>
      </form>
    </div>
  )
}
