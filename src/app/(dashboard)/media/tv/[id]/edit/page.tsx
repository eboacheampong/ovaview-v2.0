'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SentimentDisplay } from '@/components/ui/sentiment-display'
import { KeywordInput } from '@/components/ui/keyword-input'
import { Video, ChevronRight, ChevronLeft, Loader2, ArrowLeft, Wand2, Upload, X, Play, Pause } from 'lucide-react'

interface Station {
  id: string
  name: string
  channel?: string
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

function getVideoEmbedUrl(url: string): string | null {
  if (!url) return null
  const ytMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/)
  if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`
  const vimeoMatch = url.match(/(?:vimeo\.com\/)(\d+)/)
  if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`
  return null
}

export default function EditTVStoryPage() {
  const router = useRouter()
  const params = useParams()
  const storyId = params.id as string
  const videoInputRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)

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
    videoUrl: '',
    videoTitle: '',
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
  const [existingVideoUrl, setExistingVideoUrl] = useState<string | null>(null)
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [selectedSubIndustries, setSelectedSubIndustries] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analyzeError, setAnalyzeError] = useState('')

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true)
      try {
        const [storyRes, stationRes, indRes, keywordRes] = await Promise.all([
          fetch(`/api/tv-stories/${storyId}`),
          fetch('/api/tv-stations'),
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
          videoUrl: story.videoUrl || '',
          videoTitle: '',
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
        if (story.videoUrl) {
          setExistingVideoUrl(story.videoUrl)
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
      if (videoPreviewUrl) {
        URL.revokeObjectURL(videoPreviewUrl)
      }
    }
  }, [videoPreviewUrl])

  const selectedStation = stations.find(s => s.id === formData.stationId)
  const filteredPrograms = selectedStation?.programs || []
  const selectedIndustry = industries.find(i => i.id === formData.industryId)
  const availableSubIndustries = selectedIndustry?.subIndustries.filter(s => !selectedSubIndustries.includes(s.id)) || []
  const selectedSubIndustryObjects = selectedIndustry?.subIndustries.filter(s => selectedSubIndustries.includes(s.id)) || []
  const embedUrl = getVideoEmbedUrl(formData.videoUrl)

  const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (!file.type.startsWith('video/')) {
        alert('Please select a video file')
        return
      }
      if (file.size > 500 * 1024 * 1024) {
        alert('Video file must be less than 500MB')
        return
      }
      setVideoFile(file)
      setExistingVideoUrl(null)
      setFormData(prev => ({ ...prev, videoUrl: '' }))
      if (videoPreviewUrl) {
        URL.revokeObjectURL(videoPreviewUrl)
      }
      setVideoPreviewUrl(URL.createObjectURL(file))
      if (!formData.videoTitle) {
        setFormData(prev => ({ ...prev, videoTitle: file.name.replace(/\.[^/.]+$/, '') }))
      }
    }
  }

  const handleRemoveVideo = () => {
    setVideoFile(null)
    setExistingVideoUrl(null)
    setFormData(prev => ({ ...prev, videoUrl: '' }))
    if (videoPreviewUrl) {
      URL.revokeObjectURL(videoPreviewUrl)
      setVideoPreviewUrl(null)
    }
    if (videoInputRef.current) {
      videoInputRef.current.value = ''
    }
    setIsPlaying(false)
  }

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause()
      } else {
        videoRef.current.play()
      }
      setIsPlaying(!isPlaying)
    }
  }

  // Determine what video to show: uploaded file preview, existing blob URL, or YouTube/Vimeo embed
  const currentVideoUrl = videoPreviewUrl || existingVideoUrl
  const isUploadedVideo = currentVideoUrl && !embedUrl

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
    setIsSubmitting(true)
    try {
      let videoUrl = existingVideoUrl || formData.videoUrl
      
      // Upload new video file to Vercel Blob if selected
      if (videoFile) {
        const formDataUpload = new FormData()
        formDataUpload.append('file', videoFile)
        formDataUpload.append('folder', 'tv-video')
        const uploadRes = await fetch('/api/upload', { method: 'POST', body: formDataUpload })
        if (uploadRes.ok) {
          const { url } = await uploadRes.json()
          videoUrl = url
        } else {
          throw new Error('Failed to upload video file')
        }
      }

      const response = await fetch(`/api/tv-stories/${storyId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title,
          content: formData.summary,
          summary: formData.summary,
          presenters: formData.presenters,
          videoUrl: videoUrl,
          videoTitle: formData.videoTitle,
          keywords: formData.keywords,
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
      router.push('/media/tv')
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
          <Button onClick={() => router.push('/media/tv')} variant="outline">Back to Stories</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white py-6 px-6 shadow-lg">
        <div className="max-w-4xl mx-auto">
          <button onClick={() => router.push('/media/tv')} className="flex items-center gap-2 text-orange-100 hover:text-white mb-3">
            <ArrowLeft className="h-4 w-4" />Back to Stories
          </button>
          <h1 className="text-2xl font-bold">Edit TV Story</h1>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="max-w-4xl mx-auto p-6 space-y-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <Label>Story title</Label>
          <Input value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className="mt-1 h-12" required />
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 grid grid-cols-2 gap-4">
          <div>
            <Label>Channel</Label>
            <select className="w-full h-11 mt-1 rounded-lg border px-3 bg-white" value={formData.stationId} onChange={(e) => setFormData({ ...formData, stationId: e.target.value, programId: '' })}>
              <option value="">Select channel</option>
              {stations.map(s => (<option key={s.id} value={s.id}>{s.name} {s.channel && `(${s.channel})`}</option>))}
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

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <Label className="mb-2 block">Keywords</Label>
          <KeywordInput
            value={formData.keywords}
            onChange={(value) => setFormData({ ...formData, keywords: value })}
            availableKeywords={availableKeywords}
            placeholder="Search keywords..."
          />
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 bg-purple-100 rounded-lg"><Video className="h-5 w-5 text-purple-600" /></div>
            <div>
              <h2 className="font-semibold text-gray-800">Video Source</h2>
              <p className="text-sm text-gray-500">Upload a video file or paste a YouTube/Vimeo URL</p>
            </div>
          </div>

          <div>
            <Label>Video URL (YouTube or Vimeo)</Label>
            <Input 
              value={formData.videoUrl} 
              onChange={(e) => {
                setFormData({ ...formData, videoUrl: e.target.value })
                if (e.target.value) {
                  setVideoFile(null)
                  setExistingVideoUrl(null)
                  if (videoPreviewUrl) {
                    URL.revokeObjectURL(videoPreviewUrl)
                    setVideoPreviewUrl(null)
                  }
                }
              }} 
              placeholder="Paste YouTube or Vimeo URL"
              className="mt-1 h-11" 
            />
          </div>

          {embedUrl && (
            <div className="aspect-video rounded-lg overflow-hidden bg-black">
              <iframe src={embedUrl} className="w-full h-full" allowFullScreen />
            </div>
          )}

          {!embedUrl && (
            <>
              <div className="flex items-center gap-4">
                <div className="flex-1 border-t border-gray-200" />
                <span className="text-sm text-gray-400">OR</span>
                <div className="flex-1 border-t border-gray-200" />
              </div>

              <input ref={videoInputRef} type="file" accept="video/*" onChange={handleVideoSelect} className="hidden" />

              {!currentVideoUrl ? (
                <button type="button" onClick={() => videoInputRef.current?.click()} className="w-full h-32 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center gap-2 hover:border-purple-400 hover:bg-purple-50 transition-colors">
                  <Upload className="h-8 w-8 text-gray-400" />
                  <span className="text-sm text-gray-500">Click to upload video file</span>
                  <span className="text-xs text-gray-400">MP4, MOV, AVI up to 500MB</span>
                </button>
              ) : (
                <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                        <Video className="h-5 w-5 text-purple-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 text-sm">{videoFile?.name || formData.videoTitle || 'Video file'}</p>
                        {videoFile && <p className="text-xs text-gray-500">{(videoFile.size / (1024 * 1024)).toFixed(2)} MB</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => videoInputRef.current?.click()} className="text-sm text-purple-600 hover:text-purple-700">Replace</button>
                      <button type="button" onClick={handleRemoveVideo} className="p-1.5 hover:bg-gray-200 rounded-full">
                        <X className="h-4 w-4 text-gray-500" />
                      </button>
                    </div>
                  </div>
                  <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
                    <video ref={videoRef} src={currentVideoUrl} onEnded={() => setIsPlaying(false)} className="w-full h-full" controls />
                  </div>
                </div>
              )}
            </>
          )}

          <div>
            <Label>Video Title</Label>
            <Input value={formData.videoTitle} onChange={(e) => setFormData({ ...formData, videoTitle: e.target.value })} placeholder="Video title" className="mt-1 h-11" />
          </div>
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
          <Button type="button" variant="outline" onClick={() => router.push('/media/tv')}>Cancel</Button>
          <Button type="submit" className="bg-orange-500 hover:bg-orange-600 text-white" disabled={isSubmitting}>
            {isSubmitting ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin" />Updating...</>) : 'Update Story'}
          </Button>
        </div>
      </form>
    </div>
  )
}
