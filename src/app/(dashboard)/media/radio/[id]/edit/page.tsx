'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SentimentDisplay } from '@/components/ui/sentiment-display'
import { KeywordInput } from '@/components/ui/keyword-input'
import { uploadFile } from '@/lib/upload'
import { ChevronRight, ChevronLeft, Loader2, ArrowLeft, Upload, X, Music, Play, Pause, Wand2 } from 'lucide-react'

interface Station {
  id: string
  name: string
  frequency?: string
  programs: Program[]
}

interface Program {
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

export default function EditRadioStoryPage() {
  const router = useRouter()
  const params = useParams()
  const storyId = params.id as string
  const audioRef = useRef<HTMLAudioElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [stations, setStations] = useState<Station[]>([])
  const [industries, setIndustries] = useState<Industry[]>([])
  const [availableKeywords, setAvailableKeywords] = useState<Keyword[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    title: '',
    stationId: '',
    presenters: '',
    programId: '',
    dateAired: '',
    summary: '',
    keywords: '',
    audioTitle: '',
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
  const [existingAudioUrl, setExistingAudioUrl] = useState<string | null>(null)
  const [audioFile, setAudioFile] = useState<File | null>(null)
  const [audioPreviewUrl, setAudioPreviewUrl] = useState<string | null>(null)
  const [uploadedAudioUrl, setUploadedAudioUrl] = useState<string | null>(null)
  const [isUploadingAudio, setIsUploadingAudio] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [selectedSubIndustries, setSelectedSubIndustries] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analyzeError, setAnalyzeError] = useState('')


  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true)
      try {
        const [storyRes, stationRes, indRes, keywordRes] = await Promise.all([
          fetch(`/api/radio-stories/${storyId}`),
          fetch('/api/radio-stations'),
          fetch('/api/industries'),
          fetch('/api/keywords'),
        ])
        if (!storyRes.ok) throw new Error('Story not found')
        const story = await storyRes.json()
        if (stationRes.ok) setStations(await stationRes.json())
        if (indRes.ok) setIndustries(await indRes.json())
        if (keywordRes.ok) setAvailableKeywords(await keywordRes.json())
        setFormData({
          title: story.title || '',
          stationId: story.stationId || '',
          presenters: story.presenters || '',
          programId: story.programId || '',
          dateAired: story.date ? new Date(story.date).toISOString().split('T')[0] : '',
          summary: story.content || story.summary || '',
          keywords: story.keywords || '',
          audioTitle: story.audioTitle || '',
          industryId: story.industryId || '',
        })
        setSentimentData({
          positive: story.sentimentPositive ?? null,
          neutral: story.sentimentNeutral ?? null,
          negative: story.sentimentNegative ?? null,
          overallSentiment: story.overallSentiment ?? null,
        })
        if (story.audioUrl) {
          setExistingAudioUrl(story.audioUrl)
        }
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

  useEffect(() => {
    return () => {
      if (audioPreviewUrl) {
        URL.revokeObjectURL(audioPreviewUrl)
      }
    }
  }, [audioPreviewUrl])

  const selectedStation = stations.find(s => s.id === formData.stationId)
  const filteredPrograms = selectedStation?.programs || []
  const selectedIndustry = industries.find(i => i.id === formData.industryId)
  const availableSubIndustries = selectedIndustry?.subIndustries.filter(s => !selectedSubIndustries.includes(s.id)) || []
  const selectedSubIndustryObjects = selectedIndustry?.subIndustries.filter(s => selectedSubIndustries.includes(s.id)) || []


  const handleAudioSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (!file.type.startsWith('audio/')) {
        alert('Please select an audio file')
        return
      }
      if (file.size > 50 * 1024 * 1024) {
        alert('Audio file must be less than 50MB')
        return
      }
      
      setAudioFile(file)
      setExistingAudioUrl(null)
      setUploadedAudioUrl(null)
      setUploadError('')
      if (audioPreviewUrl) {
        URL.revokeObjectURL(audioPreviewUrl)
      }
      setAudioPreviewUrl(URL.createObjectURL(file))
      if (!formData.audioTitle) {
        const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '')
        setFormData(prev => ({ ...prev, audioTitle: nameWithoutExt }))
      }
      
      // Upload immediately using client-side upload
      setIsUploadingAudio(true)
      try {
        const result = await uploadFile(file, 'radio-audio')
        if (result.error) {
          throw new Error(result.error)
        }
        setUploadedAudioUrl(result.url)
      } catch (error) {
        setUploadError(error instanceof Error ? error.message : 'Failed to upload audio')
        console.error('Audio upload error:', error)
      } finally {
        setIsUploadingAudio(false)
      }
    }
  }

  const handleRemoveAudio = () => {
    setAudioFile(null)
    setExistingAudioUrl(null)
    setUploadedAudioUrl(null)
    setUploadError('')
    if (audioPreviewUrl) {
      URL.revokeObjectURL(audioPreviewUrl)
      setAudioPreviewUrl(null)
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
    setIsPlaying(false)
  }

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause()
      } else {
        audioRef.current.play()
      }
      setIsPlaying(!isPlaying)
    }
  }

  const currentAudioUrl = audioPreviewUrl || existingAudioUrl

  const handleAnalyzeArticle = async () => {
    if (!formData.summary || formData.summary.trim().length === 0) {
      setAnalyzeError('Please add content first')
      return
    }

    setIsAnalyzing(true)
    setAnalyzeError('')

    try {
      const response = await fetch('/api/analyze-article', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: formData.summary }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to analyze content')
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
      setAnalyzeError(error instanceof Error ? error.message : 'Failed to analyze content')
    } finally {
      setIsAnalyzing(false)
    }
  }


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Check if audio is still uploading
    if (isUploadingAudio) {
      alert('Please wait for audio upload to complete')
      return
    }
    
    setIsSubmitting(true)
    try {
      // Use already uploaded URL or existing URL
      const audioUrl = uploadedAudioUrl || existingAudioUrl

      const response = await fetch(`/api/radio-stories/${storyId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title,
          content: formData.summary,
          summary: formData.summary,
          presenters: formData.presenters,
          keywords: formData.keywords,
          audioUrl: audioUrl,
          audioTitle: formData.audioTitle || null,
          date: formData.dateAired,
          stationId: formData.stationId || null,
          programId: formData.programId || null,
          industryId: formData.industryId || null,
          subIndustryIds: selectedSubIndustries,
          sentimentPositive: sentimentData.positive,
          sentimentNeutral: sentimentData.neutral,
          sentimentNegative: sentimentData.negative,
          overallSentiment: sentimentData.overallSentiment,
        }),
      })
      if (!response.ok) throw new Error('Failed to update story')
      router.push('/media/radio')
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
          <Button onClick={() => router.push('/media/radio')}>Back to Stories</Button>
        </div>
      </div>
    )
  }


  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white py-6 px-6 shadow-lg">
        <div className="max-w-4xl mx-auto">
          <button onClick={() => router.push('/media/radio')} className="flex items-center gap-2 text-orange-100 hover:text-white mb-3">
            <ArrowLeft className="h-4 w-4" />Back to Stories
          </button>
          <h1 className="text-2xl font-bold">Edit Radio Story</h1>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="max-w-4xl mx-auto p-6 space-y-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <Label htmlFor="title">Story title</Label>
          <Input id="title" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className="mt-1 h-12" required />
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 grid grid-cols-2 gap-4">
          <div>
            <Label>Frequency</Label>
            <select className="w-full h-11 mt-1 rounded-lg border px-3 bg-white" value={formData.stationId} onChange={(e) => setFormData({ ...formData, stationId: e.target.value, programId: '' })}>
              <option value="">Select station</option>
              {stations.map(s => (<option key={s.id} value={s.id}>{s.name} {s.frequency && `(${s.frequency})`}</option>))}
            </select>
          </div>
          <div>
            <Label>Presenter(s)</Label>
            <Input value={formData.presenters} onChange={(e) => setFormData({ ...formData, presenters: e.target.value })} className="mt-1 h-11" />
          </div>
          <div>
            <Label>Show</Label>
            <select className="w-full h-11 mt-1 rounded-lg border px-3 bg-white" value={formData.programId} onChange={(e) => setFormData({ ...formData, programId: e.target.value })}>
              <option value="">Select Program</option>
              {filteredPrograms.map(p => (<option key={p.id} value={p.id}>{p.name}</option>))}
            </select>
          </div>
          <div>
            <Label>Date Aired</Label>
            <Input type="date" value={formData.dateAired} onChange={(e) => setFormData({ ...formData, dateAired: e.target.value })} className="mt-1 h-11" required />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-3">
            <Label>Summary</Label>
            <Button type="button" onClick={handleAnalyzeArticle} disabled={isAnalyzing || !formData.summary} variant="outline" className="flex items-center gap-2 text-purple-600 border-purple-200 hover:bg-purple-50">
              {isAnalyzing ? (<><Loader2 className="h-4 w-4 animate-spin" />Analyzing...</>) : (<><Wand2 className="h-4 w-4" />Analyze with AI</>)}
            </Button>
          </div>
          {analyzeError && <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">{analyzeError}</div>}
          <textarea className="w-full min-h-[120px] rounded-lg border p-3" value={formData.summary} onChange={(e) => setFormData({ ...formData, summary: e.target.value })} required />
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <Label className="block mb-4">Sentiment Analysis</Label>
          <SentimentDisplay positive={sentimentData.positive} neutral={sentimentData.neutral} negative={sentimentData.negative} overallSentiment={sentimentData.overallSentiment} isLoading={isAnalyzing} onSentimentChange={(data) => setSentimentData(data)} />
        </div>


        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
          <div>
            <Label htmlFor="audioTitle">Audio Title</Label>
            <Input id="audioTitle" value={formData.audioTitle} onChange={(e) => setFormData({ ...formData, audioTitle: e.target.value })} className="mt-1 h-11" placeholder="Enter audio clip title" />
          </div>

          <div>
            <Label>Audio File</Label>
            <input ref={fileInputRef} type="file" accept="audio/*" onChange={handleAudioSelect} className="hidden" />
            
            {!currentAudioUrl ? (
              <button type="button" onClick={() => fileInputRef.current?.click()} className="mt-1 w-full h-32 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center gap-2 hover:border-orange-400 hover:bg-orange-50 transition-colors">
                <Upload className="h-8 w-8 text-gray-400" />
                <span className="text-sm text-gray-500">Click to upload audio file</span>
                <span className="text-xs text-gray-400">MP3, WAV, M4A up to 50MB</span>
              </button>
            ) : (
              <div className="mt-1 border border-gray-200 rounded-lg p-4 bg-gray-50">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                      {isUploadingAudio ? <Loader2 className="h-5 w-5 text-orange-600 animate-spin" /> : <Music className="h-5 w-5 text-orange-600" />}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 text-sm">{audioFile?.name || formData.audioTitle || 'Audio file'}</p>
                      <p className="text-xs text-gray-500">
                        {audioFile && `${(audioFile.size / (1024 * 1024)).toFixed(2)} MB`}
                        {isUploadingAudio && <span className="ml-2 text-orange-600">• Uploading...</span>}
                        {uploadedAudioUrl && <span className="ml-2 text-green-600">• Uploaded ✓</span>}
                        {uploadError && <span className="ml-2 text-red-600">• {uploadError}</span>}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => fileInputRef.current?.click()} disabled={isUploadingAudio} className="text-sm text-orange-600 hover:text-orange-700 disabled:opacity-50">Replace</button>
                    <button type="button" onClick={handleRemoveAudio} disabled={isUploadingAudio} className="p-1.5 hover:bg-gray-200 rounded-full transition-colors disabled:opacity-50">
                      <X className="h-4 w-4 text-gray-500" />
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-3 bg-white rounded-lg p-3 border border-gray-200">
                  <button type="button" onClick={togglePlay} className="w-10 h-10 bg-orange-500 hover:bg-orange-600 rounded-full flex items-center justify-center text-white transition-colors">
                    {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
                  </button>
                  <audio ref={audioRef} src={currentAudioUrl} onEnded={() => setIsPlaying(false)} className="flex-1" controls />
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <Label className="mb-2 block">Keywords</Label>
          <KeywordInput
            value={formData.keywords}
            onChange={(value) => setFormData({ ...formData, keywords: value })}
            availableKeywords={availableKeywords}
            placeholder="Search keywords..."
          />
        </div>


        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <Label>Industry</Label>
          <select className="w-full h-11 mt-1 rounded-lg border px-3 bg-white max-w-md" value={formData.industryId} onChange={(e) => { setFormData({ ...formData, industryId: e.target.value }); setSelectedSubIndustries([]) }}>
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

        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="outline" onClick={() => router.push('/media/radio')}>Cancel</Button>
          <Button type="submit" className="bg-orange-500 hover:bg-orange-600 text-white" disabled={isSubmitting || isUploadingAudio}>
            {isSubmitting ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin" />Updating...</>) : isUploadingAudio ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin" />Uploading...</>) : 'Update Story'}
          </Button>
        </div>
      </form>
    </div>
  )
}
