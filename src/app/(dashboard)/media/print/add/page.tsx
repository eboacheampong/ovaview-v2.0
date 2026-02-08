'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RichTextEditor } from '@/components/ui/rich-text-editor'
import { SentimentDisplay } from '@/components/ui/sentiment-display'
import { KeywordInput } from '@/components/ui/keyword-input'
import { useOCR } from '@/hooks/use-ocr'
import { ChevronRight, ChevronLeft, Loader2, FileText, User, BookOpen, Hash, Wand2, Upload, X, Image as ImageIcon, ScanText, Trash2, Sparkles, Calendar } from 'lucide-react'

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
  const [availableKeywords, setAvailableKeywords] = useState<Keyword[]>([])
  
  // Raw OCR text (not saved to DB)
  const [rawOcrText, setRawOcrText] = useState('')
  
  const [formData, setFormData] = useState({
    title: '',
    author: '',
    pageNumbers: '',
    publicationId: '',
    issueId: '',
    publicationDate: '',
    summary: '',
    keywords: '',
    content: '',
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

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [pubRes, indRes, keywordRes] = await Promise.all([
          fetch('/api/print-publications'),
          fetch('/api/industries'),
          fetch('/api/keywords'),
        ])
        if (pubRes.ok) setPublications(await pubRes.json())
        if (indRes.ok) setIndustries(await indRes.json())
        if (keywordRes.ok) setAvailableKeywords(await keywordRes.json())
      } catch (err) {
        console.error('Failed to load form data:', err)
      }
    }
    fetchData()
  }, [])

  useEffect(() => {
    return () => { uploadedImages.forEach(img => URL.revokeObjectURL(img.previewUrl)) }
  }, [])

  const selectedPublication = publications.find(p => p.id === formData.publicationId)
  const selectedIndustry = industries.find(i => i.id === formData.industryId)
  const availableSubIndustries = selectedIndustry?.subIndustries.filter(s => !selectedSubIndustries.includes(s.id)) || []
  const selectedSubIndustryObjects = selectedIndustry?.subIndustries.filter(s => selectedSubIndustries.includes(s.id)) || []

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

  // Extract text from all images to raw OCR textarea
  const handleExtractText = async () => {
    if (uploadedImages.length === 0) {
      setExtractError('Please upload images first')
      return
    }
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
        setRawOcrText(allExtractedText)
      }
    } catch (error) {
      setExtractError(error instanceof Error ? error.message : 'Failed to extract text')
    } finally {
      setIsExtracting(false)
      setExtractingIndex(null)
    }
  }

  // Analyze with AI - refines OCR text and fills all fields
  const handleAnalyze = async () => {
    if (!rawOcrText || rawOcrText.trim().length < 20) {
      setAnalyzeError('Extract text first (at least 20 characters)')
      return
    }
    setIsAnalyzing(true)
    setAnalyzeError('')
    try {
      const response = await fetch('/api/refine-ocr-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: rawOcrText }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to analyze')
      
      setFormData(prev => ({ 
        ...prev, 
        title: data.title || prev.title,
        content: data.text || prev.content,
        industryId: data.suggestedIndustryId || prev.industryId,
        keywords: data.suggestedKeywords?.length > 0 ? data.suggestedKeywords.join(', ') : prev.keywords,
      }))
      
      if (data.suggestedSubIndustryIds?.length > 0) {
        setSelectedSubIndustries(data.suggestedSubIndustryIds)
      }
      
      setSentimentData({ 
        positive: data.sentiment.positive, 
        neutral: data.sentiment.neutral, 
        negative: data.sentiment.negative, 
        overallSentiment: data.overallSentiment 
      })
    } catch (error) {
      setAnalyzeError(error instanceof Error ? error.message : 'Failed to analyze')
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      const uploadedUrls: { url: string }[] = []
      for (const img of uploadedImages) {
        const fd = new FormData()
        fd.append('file', img.file)
        fd.append('folder', 'print-images')
        const uploadRes = await fetch('/api/upload', { method: 'POST', body: fd })
        if (uploadRes.ok) {
          const { url } = await uploadRes.json()
          uploadedUrls.push({ url })
        }
      }

      const response = await fetch('/api/print-stories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title,
          content: formData.content,
          summary: formData.summary,
          author: formData.author,
          pageNumbers: formData.pageNumbers,
          keywords: formData.keywords,
          date: formData.publicationDate,
          publicationId: formData.publicationId || null,
          issueId: formData.issueId || null,
          industryId: formData.industryId || null,
          subIndustryIds: selectedSubIndustries,
          images: uploadedUrls,
          sentimentPositive: sentimentData.positive,
          sentimentNeutral: sentimentData.neutral,
          sentimentNegative: sentimentData.negative,
          overallSentiment: sentimentData.overallSentiment,
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
          <h1 className="text-2xl font-bold">New Print Story</h1>
          <p className="text-orange-100 text-sm mt-1">Add a new print article to the media monitoring system</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="max-w-4xl mx-auto p-6 space-y-8">
        
        {/* Section 1: Image Upload */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 bg-green-100 rounded-lg"><ImageIcon className="h-5 w-5 text-green-600" /></div>
            <div>
              <h2 className="font-semibold text-gray-800">Print Images</h2>
              <p className="text-sm text-gray-500">Upload newspaper/magazine clippings</p>
            </div>
          </div>
          
          <input ref={imageInputRef} type="file" accept="image/*" multiple onChange={handleImageSelect} className="hidden" />
          
          {uploadedImages.length === 0 ? (
            <button type="button" onClick={() => imageInputRef.current?.click()} className="w-full h-32 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center gap-2 hover:border-green-400 hover:bg-green-50 transition-colors">
              <Upload className="h-8 w-8 text-gray-400" />
              <span className="text-sm text-gray-500">Click to upload images</span>
              <span className="text-xs text-gray-400">PNG, JPG up to 10MB each</span>
            </button>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                {uploadedImages.map((image, index) => (
                  <div key={index} className="relative group border border-gray-200 rounded-lg overflow-hidden">
                    <div className="aspect-[4/3] bg-gray-100">
                      <img src={image.previewUrl} alt={`Image ${index + 1}`} className="w-full h-full object-cover" />
                    </div>
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <button type="button" onClick={() => handleRemoveImage(index)} className="p-2 bg-white rounded-full hover:bg-red-100">
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </button>
                    </div>
                    {image.extractedText && (
                      <div className="absolute bottom-0 left-0 right-0 bg-green-500 text-white text-xs py-1 text-center">✓</div>
                    )}
                  </div>
                ))}
                <button type="button" onClick={() => imageInputRef.current?.click()} className="aspect-[4/3] border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center hover:border-green-400 hover:bg-green-50">
                  <Upload className="h-5 w-5 text-gray-400" />
                  <span className="text-xs text-gray-500 mt-1">Add more</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Section 2: OCR Extraction */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-blue-100 rounded-lg"><ScanText className="h-5 w-5 text-blue-600" /></div>
              <div>
                <h2 className="font-semibold text-gray-800">Text Extraction</h2>
                <p className="text-sm text-gray-500">Extract text from images using OCR</p>
              </div>
            </div>
            <Button type="button" onClick={handleExtractText} disabled={isExtracting || uploadedImages.length === 0} variant="outline" className="flex items-center gap-2 text-blue-600 border-blue-200 hover:bg-blue-50">
              {isExtracting ? (
                <><Loader2 className="h-4 w-4 animate-spin" />Extracting...</>
              ) : (
                <><ScanText className="h-4 w-4" />Extract Text</>
              )}
            </Button>
          </div>
          
          {isExtracting && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-2 text-blue-700 text-sm mb-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                {ocrProgress.message || `Processing image ${extractingIndex !== null ? extractingIndex + 1 : ''}...`}
              </div>
              <div className="w-full bg-blue-200 rounded-full h-2">
                <div className="bg-blue-600 h-2 rounded-full transition-all" style={{ width: `${ocrProgress.progress}%` }} />
              </div>
            </div>
          )}
          
          {extractError && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">{extractError}</div>}
          
          <textarea 
            className="w-full min-h-[150px] rounded-lg border border-gray-200 p-4 resize-y bg-gray-50 text-gray-700" 
            value={rawOcrText} 
            onChange={(e) => setRawOcrText(e.target.value)} 
            placeholder="Extracted text appears here..." 
          />
          <p className="text-xs text-gray-400 mt-2">Raw OCR text for AI processing</p>
        </div>

        {/* Section 3: AI Analysis */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-purple-100 rounded-lg"><Sparkles className="h-5 w-5 text-purple-600" /></div>
              <div>
                <h2 className="font-semibold text-gray-800">AI Analysis</h2>
                <p className="text-sm text-gray-500">Refine text and auto-fill fields</p>
              </div>
            </div>
            <Button type="button" onClick={handleAnalyze} disabled={isAnalyzing || !rawOcrText} variant="outline" className="flex items-center gap-2 text-purple-600 border-purple-200 hover:bg-purple-50">
              {isAnalyzing ? (
                <><Loader2 className="h-4 w-4 animate-spin" />Analyzing...</>
              ) : (
                <><Wand2 className="h-4 w-4" />Analyze with AI</>
              )}
            </Button>
          </div>
          {analyzeError && <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">{analyzeError}</div>}
        </div>

        {/* Section 4: Story Title */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 bg-blue-100 rounded-lg"><FileText className="h-5 w-5 text-blue-600" /></div>
            <Label htmlFor="title" className="font-semibold text-gray-800">Story Title</Label>
          </div>
          <Input id="title" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} placeholder="Enter article title" className="h-12 text-lg" required />
        </div>

        {/* Section 5: Story Content */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 bg-green-100 rounded-lg"><FileText className="h-5 w-5 text-green-600" /></div>
            <div>
              <h2 className="font-semibold text-gray-800">Article Content</h2>
              <p className="text-sm text-gray-500">Refined content from AI analysis</p>
            </div>
          </div>
          <RichTextEditor value={formData.content} onChange={(html) => setFormData({ ...formData, content: html })} className="min-h-[300px]" />
        </div>

        {/* Section 6: Story Summary */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 bg-amber-100 rounded-lg"><FileText className="h-5 w-5 text-amber-600" /></div>
            <div>
              <h2 className="font-semibold text-gray-800">Article Summary</h2>
              <p className="text-sm text-gray-500">Brief summary of the article</p>
            </div>
          </div>
          <textarea 
            className="w-full min-h-[100px] rounded-lg border border-gray-200 p-4 resize-y focus:ring-2 focus:ring-orange-500 focus:border-transparent" 
            value={formData.summary} 
            onChange={(e) => setFormData({ ...formData, summary: e.target.value })} 
            placeholder="Enter article summary..." 
          />
        </div>

        {/* Section 7: Sentiment Analysis */}
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

        {/* Section 8: Publication Details */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="font-semibold text-gray-800 mb-4">Publication Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="publication" className="text-gray-600 flex items-center gap-2 mb-2">
                <BookOpen className="h-4 w-4" />Publication
              </Label>
              <select id="publication" className="w-full h-11 rounded-lg border border-gray-200 px-3 bg-white focus:ring-2 focus:ring-orange-500" value={formData.publicationId} onChange={(e) => setFormData({ ...formData, publicationId: e.target.value, issueId: '' })}>
                <option value="">Select publication</option>
                {publications.map(pub => (<option key={pub.id} value={pub.id}>{pub.name}</option>))}
              </select>
            </div>
            <div>
              <Label htmlFor="issue" className="text-gray-600 mb-2 block">Issue</Label>
              <select id="issue" className="w-full h-11 rounded-lg border border-gray-200 px-3 bg-white focus:ring-2 focus:ring-orange-500" value={formData.issueId} onChange={(e) => setFormData({ ...formData, issueId: e.target.value })} disabled={!selectedPublication}>
                <option value="">Select issue</option>
                {selectedPublication?.issues?.map(issue => (<option key={issue.id} value={issue.id}>{issue.name}</option>))}
              </select>
            </div>
            <div>
              <Label htmlFor="author" className="text-gray-600 flex items-center gap-2 mb-2">
                <User className="h-4 w-4" />Author
              </Label>
              <Input id="author" value={formData.author} onChange={(e) => setFormData({ ...formData, author: e.target.value })} placeholder="Author name" className="h-11" />
            </div>
            <div>
              <Label htmlFor="pageNumbers" className="text-gray-600 flex items-center gap-2 mb-2">
                <Hash className="h-4 w-4" />Page Numbers
              </Label>
              <Input id="pageNumbers" value={formData.pageNumbers} onChange={(e) => setFormData({ ...formData, pageNumbers: e.target.value })} placeholder="e.g., 1-3" className="h-11" />
            </div>
            <div>
              <Label htmlFor="publicationDate" className="text-gray-600 flex items-center gap-2 mb-2">
                <Calendar className="h-4 w-4" />Publication Date
              </Label>
              <Input id="publicationDate" type="date" value={formData.publicationDate} onChange={(e) => setFormData({ ...formData, publicationDate: e.target.value })} className="h-11" required />
            </div>
            <div>
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

        {/* Section 9: Industry Classification */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <Label htmlFor="industry" className="font-semibold text-gray-800 block mb-3">Industry Classification</Label>
          <select id="industry" className="w-full h-11 rounded-lg border border-gray-200 px-3 bg-white max-w-md focus:ring-2 focus:ring-orange-500" value={formData.industryId} onChange={(e) => { setFormData({ ...formData, industryId: e.target.value }); setSelectedSubIndustries([]) }}>
            <option value="">Select Industry</option>
            {industries.map(industry => (<option key={industry.id} value={industry.id}>{industry.name}</option>))}
          </select>

          {formData.industryId && (
            <div className="grid grid-cols-2 gap-6 mt-6">
              <div>
                <Label className="text-gray-600 text-center block mb-3">Available Sub-industries</Label>
                <div className="border border-gray-200 rounded-lg h-48 overflow-y-auto bg-gray-50">
                  {availableSubIndustries.length === 0 ? (
                    <p className="text-gray-400 text-sm text-center py-4">No more sub-industries</p>
                  ) : (
                    availableSubIndustries.map(s => (
                      <div key={s.id} className="px-4 py-3 hover:bg-white cursor-pointer flex justify-between items-center border-b border-gray-100 last:border-0" onClick={() => setSelectedSubIndustries([...selectedSubIndustries, s.id])}>
                        <span className="text-gray-700">{s.name}</span>
                        <ChevronRight className="h-4 w-4 text-gray-400" />
                      </div>
                    ))
                  )}
                </div>
              </div>
              <div>
                <Label className="text-gray-600 text-center block mb-3">Selected Sub-industries</Label>
                <div className="border border-gray-200 rounded-lg h-48 overflow-y-auto bg-orange-50">
                  {selectedSubIndustryObjects.length === 0 ? (
                    <p className="text-gray-400 text-sm text-center py-4">Click to add</p>
                  ) : (
                    selectedSubIndustryObjects.map(s => (
                      <div key={s.id} className="px-4 py-3 hover:bg-orange-100 cursor-pointer flex justify-between items-center border-b border-orange-100 last:border-0" onClick={() => setSelectedSubIndustries(selectedSubIndustries.filter(x => x !== s.id))}>
                        <ChevronLeft className="h-4 w-4 text-orange-400" />
                        <span className="text-gray-700">{s.name}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Submit Buttons */}
        <div className="flex justify-end gap-4 pt-4">
          <Button type="button" variant="outline" onClick={() => router.back()} className="px-6">Cancel</Button>
          <Button type="submit" className="bg-orange-500 hover:bg-orange-600 text-white px-8" disabled={isSubmitting}>
            {isSubmitting ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving...</>) : 'Save Story'}
          </Button>
        </div>
      </form>
    </div>
  )
}
