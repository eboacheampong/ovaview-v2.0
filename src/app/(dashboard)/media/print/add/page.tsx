'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RichTextEditor } from '@/components/ui/rich-text-editor'
import { SentimentDisplay } from '@/components/ui/sentiment-display'
import { useOCR } from '@/hooks/use-ocr'
import { ChevronRight, ChevronLeft, Loader2, FileText, User, BookOpen, Hash, ArrowLeft, Wand2, Upload, X, Image as ImageIcon, ScanText, Trash2, Sparkles } from 'lucide-react'

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

interface UploadedImage {
  file: File
  previewUrl: string
  extractedText?: string
}

export default function AddPrintStoryPage() {
  const router = useRouter()
  const imageInputRef = useRef<HTMLInputElement>(null)
  const { extractText, progress: ocrProgress } = useOCR()
  
  const [publications, setPublications] = useState<Publication[]>([])
  const [industries, setIndustries] = useState<Industry[]>([])
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
  }>({ positive: null, neutral: null, negative: null, overallSentiment: null })
  const [selectedSubIndustries, setSelectedSubIndustries] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analyzeError, setAnalyzeError] = useState('')
  
  // Image upload and OCR state
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([])
  const [isExtracting, setIsExtracting] = useState(false)
  const [extractError, setExtractError] = useState('')
  const [extractingIndex, setExtractingIndex] = useState<number | null>(null)
  const [isRefining, setIsRefining] = useState(false)
  const [refineError, setRefineError] = useState('')

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [pubRes, indRes] = await Promise.all([
          fetch('/api/print-publications'),
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

  useEffect(() => {
    return () => {
      uploadedImages.forEach(img => URL.revokeObjectURL(img.previewUrl))
    }
  }, [])

  const selectedPublication = publications.find(p => p.id === formData.publicationId)
  const selectedIndustry = industries.find(i => i.id === formData.industryId)
  const availableSubIndustries = selectedIndustry?.subIndustries.filter(s => !selectedSubIndustries.includes(s.id)) || []
  const selectedSubIndustryObjects = selectedIndustry?.subIndustries.filter(s => selectedSubIndustries.includes(s.id)) || []

  const handleArticleTextChange = (html: string) => {
    setFormData({ ...formData, articleText: html })
  }

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files) {
      const newImages: UploadedImage[] = []
      Array.from(files).forEach(file => {
        if (!file.type.startsWith('image/')) { alert('Please select only image files'); return }
        if (file.size > 10 * 1024 * 1024) { alert('Each image must be less than 10MB'); return }
        newImages.push({ file, previewUrl: URL.createObjectURL(file) })
      })
      setUploadedImages(prev => [...prev, ...newImages])
    }
    if (imageInputRef.current) imageInputRef.current.value = ''
  }

  const handleRemoveImage = (index: number) => {
    setUploadedImages(prev => {
      const newImages = [...prev]
      URL.revokeObjectURL(newImages[index].previewUrl)
      newImages.splice(index, 1)
      return newImages
    })
  }

  // Extract text from a single image using client-side OCR
  const handleExtractText = async (index: number) => {
    const image = uploadedImages[index]
    if (!image) return
    setIsExtracting(true)
    setExtractingIndex(index)
    setExtractError('')
    try {
      const text = await extractText(image.file)
      if (text) {
        setUploadedImages(prev => {
          const newImages = [...prev]
          newImages[index] = { ...newImages[index], extractedText: text }
          return newImages
        })
        const currentContent = formData.articleText
        const newContent = currentContent ? `${currentContent}\n\n${text}` : text
        setFormData(prev => ({ ...prev, articleText: newContent }))
      } else {
        setExtractError('No text could be extracted from this image')
      }
    } catch (error) {
      setExtractError(error instanceof Error ? error.message : 'Failed to extract text')
    } finally {
      setIsExtracting(false)
      setExtractingIndex(null)
    }
  }

  // Extract text from all images
  const handleExtractAllText = async () => {
    if (uploadedImages.length === 0) return
    setIsExtracting(true)
    setExtractError('')
    let allExtractedText = ''
    try {
      for (let i = 0; i < uploadedImages.length; i++) {
        setExtractingIndex(i)
        const image = uploadedImages[i]
        const text = await extractText(image.file)
        if (text) {
          allExtractedText += (allExtractedText ? '\n\n' : '') + text
          setUploadedImages(prev => {
            const newImages = [...prev]
            newImages[i] = { ...newImages[i], extractedText: text }
            return newImages
          })
        }
      }
      if (allExtractedText) {
        const currentContent = formData.articleText
        const newContent = currentContent ? `${currentContent}\n\n${allExtractedText}` : allExtractedText
        setFormData(prev => ({ ...prev, articleText: newContent }))
      }
    } catch (error) {
      setExtractError(error instanceof Error ? error.message : 'Failed to extract text')
    } finally {
      setIsExtracting(false)
      setExtractingIndex(null)
    }
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
      if (!response.ok) throw new Error(data.error || 'Failed to analyze')
      if (data.summary) setFormData(prev => ({ ...prev, summary: data.summary }))
      if (data.sentiment) {
        setSentimentData({
          positive: data.sentiment.positive, neutral: data.sentiment.neutral,
          negative: data.sentiment.negative, overallSentiment: data.overallSentiment,
        })
      }
    } catch (error) {
      setAnalyzeError(error instanceof Error ? error.message : 'Failed to analyze')
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleRefineText = async () => {
    if (!formData.articleText || formData.articleText.trim().length < 20) {
      setRefineError('Please add at least 20 characters of article content first')
      return
    }
    setIsRefining(true)
    setRefineError('')
    try {
      const response = await fetch('/api/refine-ocr-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: formData.articleText }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to refine text')
      
      // Update article text with refined version
      if (data.text) setFormData(prev => ({ ...prev, articleText: data.text }))
      
      // Update title if empty
      if (data.title && !formData.title) setFormData(prev => ({ ...prev, title: data.title }))
      
      // Update sentiment data
      if (data.sentiment) {
        setSentimentData({
          positive: data.sentiment.positive,
          neutral: data.sentiment.neutral,
          negative: data.sentiment.negative,
          overallSentiment: data.overallSentiment,
        })
      }
    } catch (error) {
      setRefineError(error instanceof Error ? error.message : 'Failed to refine text')
    } finally {
      setIsRefining(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      const imageUrls = uploadedImages.map(img => ({ url: img.previewUrl }))
      const response = await fetch('/api/print-stories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title, content: formData.articleText, summary: formData.summary,
          author: formData.author, pageNumbers: formData.pageNumbers, keywords: formData.keywords,
          date: formData.publicationDate, publicationId: formData.publicationId || null,
          issueId: formData.issueId || null, industryId: formData.industryId || null,
          subIndustryIds: selectedSubIndustries, images: imageUrls,
          sentimentPositive: sentimentData.positive, sentimentNeutral: sentimentData.neutral,
          sentimentNegative: sentimentData.negative, overallSentiment: sentimentData.overallSentiment,
        }),
      })
      if (!response.ok) throw new Error('Failed to create story')
      router.push('/media/print')
    } catch (err) {
      console.error('Submit error:', err)
      alert('Failed to save story')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white py-6 px-6 shadow-lg">
        <div className="max-w-4xl mx-auto">
          <button onClick={() => router.push('/media/print')} className="flex items-center gap-2 text-orange-100 hover:text-white mb-3 transition-colors">
            <ArrowLeft className="h-4 w-4" />Back to Stories
          </button>
          <h1 className="text-2xl font-bold">New Print Story</h1>
          <p className="text-orange-100 text-sm mt-1">Add a new print article to the media monitoring system</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Story Title - FIRST */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <Label htmlFor="title" className="text-gray-700 font-medium flex items-center gap-2"><FileText className="h-4 w-4" />Story Title</Label>
          <Input id="title" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className="mt-1 h-12 text-lg" placeholder="Enter the article title" required />
        </div>

        {/* Publication Details - SECOND */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="font-semibold text-gray-800 mb-4">Publication Details</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="publication" className="text-gray-700 flex items-center gap-2"><BookOpen className="h-4 w-4" />Publication</Label>
              <select id="publication" className="w-full h-11 mt-1 rounded-lg border border-gray-200 px-3 bg-white" value={formData.publicationId} onChange={(e) => setFormData({ ...formData, publicationId: e.target.value, issueId: '' })}>
                <option value="">Select publication</option>
                {publications.map(pub => (<option key={pub.id} value={pub.id}>{pub.name}</option>))}
              </select>
            </div>
            <div>
              <Label htmlFor="issue" className="text-gray-700">Issue</Label>
              <select id="issue" className="w-full h-11 mt-1 rounded-lg border border-gray-200 px-3 bg-white" value={formData.issueId} onChange={(e) => setFormData({ ...formData, issueId: e.target.value })} disabled={!selectedPublication}>
                <option value="">Select issue</option>
                {selectedPublication?.issues?.map(issue => (<option key={issue.id} value={issue.id}>{issue.name}</option>))}
              </select>
            </div>
            <div>
              <Label htmlFor="author" className="text-gray-700 flex items-center gap-2"><User className="h-4 w-4" />Author</Label>
              <Input id="author" value={formData.author} onChange={(e) => setFormData({ ...formData, author: e.target.value })} placeholder="Article author" className="mt-1 h-11" />
            </div>
            <div>
              <Label htmlFor="pageNumbers" className="text-gray-700 flex items-center gap-2"><Hash className="h-4 w-4" />Page Numbers</Label>
              <Input id="pageNumbers" value={formData.pageNumbers} onChange={(e) => setFormData({ ...formData, pageNumbers: e.target.value })} placeholder="e.g., 1-3 or 5" className="mt-1 h-11" />
            </div>
            <div>
              <Label htmlFor="publicationDate" className="text-gray-700">Publication Date</Label>
              <Input id="publicationDate" type="date" value={formData.publicationDate} onChange={(e) => setFormData({ ...formData, publicationDate: e.target.value })} className="mt-1 h-11" required />
            </div>
            <div>
              <Label htmlFor="keywords" className="text-gray-700">Keywords</Label>
              <Input id="keywords" value={formData.keywords} onChange={(e) => setFormData({ ...formData, keywords: e.target.value })} placeholder="politics, economy, sports..." className="mt-1 h-11" />
            </div>
          </div>
        </div>

        {/* Image Upload Section with OCR */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-green-100 rounded-lg"><ImageIcon className="h-5 w-5 text-green-600" /></div>
              <div>
                <h2 className="font-semibold text-gray-800">Print Images</h2>
                <p className="text-sm text-gray-500">Upload newspaper/magazine clippings and extract text</p>
              </div>
            </div>
            {uploadedImages.length > 0 && (
              <Button type="button" onClick={handleExtractAllText} disabled={isExtracting} variant="outline" className="flex items-center gap-2 text-green-600 border-green-200 hover:bg-green-50">
                {isExtracting ? (<><Loader2 className="h-4 w-4 animate-spin" />Extracting...</>) : (<><ScanText className="h-4 w-4" />Extract All Text</>)}
              </Button>
            )}
          </div>

          <input ref={imageInputRef} type="file" accept="image/*" multiple onChange={handleImageSelect} className="hidden" />
          
          {uploadedImages.length === 0 ? (
            <button type="button" onClick={() => imageInputRef.current?.click()} className="w-full h-40 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center gap-2 hover:border-green-400 hover:bg-green-50 transition-colors">
              <Upload className="h-10 w-10 text-gray-400" />
              <span className="text-gray-600 font-medium">Click to upload print images</span>
              <span className="text-xs text-gray-400">PNG, JPG, JPEG up to 10MB each</span>
            </button>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {uploadedImages.map((image, index) => (
                  <div key={index} className="relative group border border-gray-200 rounded-lg overflow-hidden">
                    <div className="aspect-[4/3] bg-gray-100">
                      <img src={image.previewUrl} alt={`Upload ${index + 1}`} className="w-full h-full object-cover" />
                    </div>
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <button type="button" onClick={() => handleExtractText(index)} disabled={isExtracting} className="p-2 bg-white rounded-full hover:bg-green-100 transition-colors" title="Extract text">
                        {extractingIndex === index ? <Loader2 className="h-4 w-4 animate-spin text-green-600" /> : <ScanText className="h-4 w-4 text-green-600" />}
                      </button>
                      <button type="button" onClick={() => handleRemoveImage(index)} className="p-2 bg-white rounded-full hover:bg-red-100 transition-colors" title="Remove">
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </button>
                    </div>
                    {image.extractedText && (
                      <div className="absolute bottom-0 left-0 right-0 bg-green-500 text-white text-xs py-1 px-2 text-center">
                        Text extracted ✓
                      </div>
                    )}
                  </div>
                ))}
                <button type="button" onClick={() => imageInputRef.current?.click()} className="aspect-[4/3] border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center gap-1 hover:border-green-400 hover:bg-green-50 transition-colors">
                  <Upload className="h-6 w-6 text-gray-400" />
                  <span className="text-xs text-gray-500">Add more</span>
                </button>
              </div>
            </div>
          )}

          {isExtracting && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-2 text-blue-700 text-sm mb-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                {ocrProgress.message || `Extracting text from image ${extractingIndex !== null ? extractingIndex + 1 : ''}...`}
              </div>
              <div className="w-full bg-blue-200 rounded-full h-2">
                <div className="bg-blue-600 h-2 rounded-full transition-all duration-300" style={{ width: `${ocrProgress.progress}%` }} />
              </div>
            </div>
          )}
          {extractError && <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">{extractError}</div>}
        </div>

        {/* Article Content */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-purple-100 rounded-lg"><FileText className="h-5 w-5 text-purple-600" /></div>
              <Label className="font-semibold text-gray-800">Article Content</Label>
            </div>
            <div className="flex items-center gap-2">
              <Button type="button" onClick={handleRefineText} disabled={isRefining || !formData.articleText} variant="outline" className="flex items-center gap-2 text-blue-600 border-blue-200 hover:bg-blue-50">
                {isRefining ? (<><Loader2 className="h-4 w-4 animate-spin" />Refining...</>) : (<><Sparkles className="h-4 w-4" />Refine OCR Text</>)}
              </Button>
              <Button type="button" onClick={handleAnalyzeArticle} disabled={isAnalyzing || !formData.articleText} variant="outline" className="flex items-center gap-2 text-purple-600 border-purple-200 hover:bg-purple-50">
                {isAnalyzing ? (<><Loader2 className="h-4 w-4 animate-spin" />Analyzing...</>) : (<><Wand2 className="h-4 w-4" />Analyze with AI</>)}
              </Button>
            </div>
          </div>
          {refineError && <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">{refineError}</div>}
          {analyzeError && <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">{analyzeError}</div>}
          <RichTextEditor value={formData.articleText} onChange={handleArticleTextChange} className="min-h-[300px]" />
        </div>

        {/* Summary */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <Label htmlFor="summary" className="font-semibold text-gray-800 block mb-3">Article Summary</Label>
          <textarea id="summary" className="w-full min-h-[100px] rounded-lg border border-gray-200 p-3 resize-y" value={formData.summary} onChange={(e) => setFormData({ ...formData, summary: e.target.value })} placeholder="Summary will be auto-generated when you click 'Analyze with AI', or write your own..." />
        </div>

        {/* Sentiment Analysis */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <Label className="text-gray-700 font-medium block mb-4">Sentiment Analysis</Label>
          <SentimentDisplay positive={sentimentData.positive} neutral={sentimentData.neutral} negative={sentimentData.negative} overallSentiment={sentimentData.overallSentiment} isLoading={isAnalyzing} onSentimentChange={(data) => setSentimentData(data)} />
        </div>

        {/* Industry Classification */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <Label htmlFor="industry" className="text-gray-700 font-medium">Industry</Label>
          <select id="industry" className="w-full h-11 mt-1 rounded-lg border border-gray-200 px-3 bg-white max-w-md" value={formData.industryId} onChange={(e) => { setFormData({ ...formData, industryId: e.target.value }); setSelectedSubIndustries([]) }}>
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

        {/* Submit Buttons */}
        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="outline" onClick={() => router.push('/media/print')}>Cancel</Button>
          <Button type="submit" className="bg-orange-500 hover:bg-orange-600 text-white" disabled={isSubmitting}>
            {isSubmitting ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving...</>) : 'Save Story'}
          </Button>
        </div>
      </form>
    </div>
  )
}
