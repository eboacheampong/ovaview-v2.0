'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SentimentDisplay } from '@/components/ui/sentiment-display'
import { useWhisperTranscription } from '@/hooks/use-whisper-transcription'
import { Video, ChevronRight, ChevronLeft, Loader2, ArrowLeft, Wand2, Upload, X, Play, Pause, FileText, Mic } from 'lucide-react'

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

// Helper to extract YouTube/Vimeo video ID
function getVideoEmbedUrl(url: string): string | null {
  if (!url) return null
  const ytMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/)
  if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`
  const vimeoMatch = url.match(/(?:vimeo\.com\/)(\d+)/)
  if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`
  return null
}

export default function AddTVStoryPage() {
  const router = useRouter()
  const videoInputRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const { transcribe, progress: transcriptionProgress, isReady: whisperReady } = useWhisperTranscription()

  const [stations, setStations] = useState<Station[]>([])
  const [industries, setIndustries] = useState<Industry[]>([])
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
  }>({ positive: null, neutral: null, negative: null, overallSentiment: null })
  const [selectedSubIndustries, setSelectedSubIndustries] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isRefining, setIsRefining] = useState(false)
  const [refineError, setRefineError] = useState('')
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [transcribeError, setTranscribeError] = useState('')

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [stationRes, indRes] = await Promise.all([
          fetch('/api/tv-stations'),
          fetch('/api/industries'),
        ])
        if (stationRes.ok) setStations(await stationRes.json())
        if (indRes.ok) setIndustries(await indRes.json())
      } catch (err) {
        console.error('Failed to load form data:', err)
      }
    }
    fetchData()
  }, [])

  useEffect(() => {
    return () => { if (videoPreviewUrl) URL.revokeObjectURL(videoPreviewUrl) }
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
      if (!file.type.startsWith('video/')) { alert('Please select a video file'); return }
      if (file.size > 500 * 1024 * 1024) { alert('Video file must be less than 500MB'); return }
      setVideoFile(file)
      if (videoPreviewUrl) URL.revokeObjectURL(videoPreviewUrl)
      setVideoPreviewUrl(URL.createObjectURL(file))
      if (!formData.videoTitle) setFormData(prev => ({ ...prev, videoTitle: file.name.replace(/\.[^/.]+$/, '') }))
    }
  }

  const handleRemoveVideo = () => {
    setVideoFile(null)
    if (videoPreviewUrl) { URL.revokeObjectURL(videoPreviewUrl); setVideoPreviewUrl(null) }
    if (videoInputRef.current) videoInputRef.current.value = ''
    setIsPlaying(false)
  }

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) videoRef.current.pause()
      else videoRef.current.play()
      setIsPlaying(!isPlaying)
    }
  }

  // Automatic transcription using client-side Whisper
  const handleTranscribe = async () => {
    if (!videoFile) {
      setTranscribeError('Please upload a video file first. YouTube/Vimeo URLs cannot be transcribed directly.')
      return
    }

    setIsTranscribing(true)
    setTranscribeError('')

    try {
      const transcription = await transcribe(videoFile)
      setFormData(prev => ({ ...prev, summary: transcription }))
    } catch (error) {
      setTranscribeError(error instanceof Error ? error.message : 'Failed to transcribe video')
    } finally {
      setIsTranscribing(false)
    }
  }

  // Refine transcription with AI
  const handleRefine = async () => {
    if (!formData.summary || formData.summary.trim().length < 20) {
      setRefineError('Please add more content to refine (at least 20 characters)')
      return
    }
    setIsRefining(true)
    setRefineError('')
    try {
      const response = await fetch('/api/refine-transcription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcription: formData.summary }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to refine')
      setFormData(prev => ({ ...prev, title: data.title || prev.title, summary: data.transcription || prev.summary }))
      setSentimentData({ positive: data.sentiment.positive, neutral: data.sentiment.neutral, negative: data.sentiment.negative, overallSentiment: data.overallSentiment })
    } catch (error) {
      setRefineError(error instanceof Error ? error.message : 'Failed to refine')
    } finally {
      setIsRefining(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      // Upload video to Vercel Blob storage if file exists
      let uploadedVideoUrl = formData.videoUrl
      if (videoFile) {
        const formDataUpload = new FormData()
        formDataUpload.append('file', videoFile)
        formDataUpload.append('folder', 'tv-video')
        
        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          body: formDataUpload,
        })
        
        if (uploadRes.ok) {
          const { url } = await uploadRes.json()
          uploadedVideoUrl = url
        }
      }

      const response = await fetch('/api/tv-stories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title, content: formData.summary, summary: formData.summary,
          presenters: formData.presenters, videoUrl: uploadedVideoUrl,
          videoTitle: formData.videoTitle, keywords: formData.keywords, date: formData.dateAired,
          stationId: formData.stationId || null, programId: formData.programId || null,
          industryId: formData.industryId || null, subIndustryIds: selectedSubIndustries,
          sentimentPositive: sentimentData.positive, sentimentNeutral: sentimentData.neutral,
          sentimentNegative: sentimentData.negative, overallSentiment: sentimentData.overallSentiment,
        }),
      })
      if (!response.ok) throw new Error('Failed to create story')
      router.push('/media/tv')
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
          <button onClick={() => router.push('/media/tv')} className="flex items-center gap-2 text-orange-100 hover:text-white mb-3 transition-colors">
            <ArrowLeft className="h-4 w-4" />Back to Stories
          </button>
          <h1 className="text-2xl font-bold">New TV Story</h1>
          <p className="text-orange-100 text-sm mt-1">Add a new TV story to the media monitoring system</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Story Title - FIRST */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <Label htmlFor="title" className="text-gray-700 font-medium">Story Title</Label>
          <Input id="title" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className="mt-1 h-12 text-lg" placeholder="Title will be auto-generated when you click Refine, or enter manually" required />
        </div>

        {/* Channel & Details Section - SECOND */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="font-semibold text-gray-800 mb-4">Channel & Broadcast Details</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="station" className="text-gray-700">Channel</Label>
              <select id="station" className="w-full h-11 mt-1 rounded-lg border border-gray-200 px-3 bg-white" value={formData.stationId} onChange={(e) => setFormData({ ...formData, stationId: e.target.value, programId: '' })}>
                <option value="">Select channel</option>
                {stations.map(station => (<option key={station.id} value={station.id}>{station.name} {station.channel && `(${station.channel})`}</option>))}
              </select>
            </div>
            <div>
              <Label htmlFor="presenters" className="text-gray-700">Presenter(s)</Label>
              <Input id="presenters" value={formData.presenters} onChange={(e) => setFormData({ ...formData, presenters: e.target.value })} placeholder="Presenter names" className="mt-1 h-11" />
            </div>
            <div>
              <Label htmlFor="program" className="text-gray-700">Show/Program</Label>
              <select id="program" className="w-full h-11 mt-1 rounded-lg border border-gray-200 px-3 bg-white" value={formData.programId} onChange={(e) => setFormData({ ...formData, programId: e.target.value })}>
                <option value="">Select Program</option>
                {filteredPrograms.map(program => (<option key={program.id} value={program.id}>{program.name}</option>))}
              </select>
            </div>
            <div>
              <Label htmlFor="dateAired" className="text-gray-700">Date Aired</Label>
              <Input id="dateAired" type="date" value={formData.dateAired} onChange={(e) => setFormData({ ...formData, dateAired: e.target.value })} className="mt-1 h-11" required />
            </div>
          </div>
        </div>

        {/* Video Upload/URL Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 bg-purple-100 rounded-lg"><Video className="h-5 w-5 text-purple-600" /></div>
            <div>
              <h2 className="font-semibold text-gray-800">Video Source</h2>
              <p className="text-sm text-gray-500">Paste a YouTube/Vimeo URL or upload a video file</p>
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <Label htmlFor="videoUrl" className="text-gray-700">Video URL (YouTube or Vimeo)</Label>
              <Input id="videoUrl" value={formData.videoUrl} onChange={(e) => setFormData({ ...formData, videoUrl: e.target.value })} placeholder="https://youtube.com/watch?v=... or https://vimeo.com/..." className="mt-1 h-11" />
            </div>
            {embedUrl && (
              <div className="aspect-video rounded-lg overflow-hidden bg-black">
                <iframe src={embedUrl} className="w-full h-full" allowFullScreen allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" />
              </div>
            )}
            <div className="flex items-center gap-4">
              <div className="flex-1 border-t border-gray-200" /><span className="text-sm text-gray-400">OR</span><div className="flex-1 border-t border-gray-200" />
            </div>
            <input ref={videoInputRef} type="file" accept="video/*" onChange={handleVideoSelect} className="hidden" />
            {!videoFile ? (
              <button type="button" onClick={() => videoInputRef.current?.click()} className="w-full h-32 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center gap-2 hover:border-purple-400 hover:bg-purple-50 transition-colors">
                <Upload className="h-8 w-8 text-gray-400" /><span className="text-sm text-gray-500">Click to upload video file</span><span className="text-xs text-gray-400">MP4, MOV, AVI up to 500MB</span>
              </button>
            ) : (
              <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center"><Video className="h-5 w-5 text-purple-600" /></div>
                    <div><p className="font-medium text-gray-900 text-sm">{videoFile.name}</p><p className="text-xs text-gray-500">{(videoFile.size / (1024 * 1024)).toFixed(2)} MB</p></div>
                  </div>
                  <button type="button" onClick={handleRemoveVideo} className="p-1.5 hover:bg-gray-200 rounded-full"><X className="h-4 w-4 text-gray-500" /></button>
                </div>
                {videoPreviewUrl && (
                  <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
                    <video ref={videoRef} src={videoPreviewUrl} onEnded={() => setIsPlaying(false)} className="w-full h-full" />
                    <button type="button" onClick={togglePlay} className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/40 transition-colors">
                      {isPlaying ? <Pause className="h-12 w-12 text-white" /> : <Play className="h-12 w-12 text-white" />}
                    </button>
                  </div>
                )}
              </div>
            )}
            <div>
              <Label htmlFor="videoTitle" className="text-gray-700">Video Title</Label>
              <Input id="videoTitle" value={formData.videoTitle} onChange={(e) => setFormData({ ...formData, videoTitle: e.target.value })} placeholder="Enter video title" className="mt-1 h-11" />
            </div>
          </div>
        </div>

        {/* Transcription & Refine Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-green-100 rounded-lg"><FileText className="h-5 w-5 text-green-600" /></div>
              <div><h2 className="font-semibold text-gray-800">Transcription</h2><p className="text-sm text-gray-500">Auto-transcribe video or type manually</p></div>
            </div>
            <div className="flex gap-2">
              <Button type="button" onClick={handleTranscribe} disabled={isTranscribing || !videoFile} variant="outline" className="flex items-center gap-2 text-green-600 border-green-200 hover:bg-green-50">
                {isTranscribing ? (<><Loader2 className="h-4 w-4 animate-spin" />{transcriptionProgress.message || 'Transcribing...'}</>) : (<><Mic className="h-4 w-4" />Transcribe</>)}
              </Button>
              <Button type="button" onClick={handleRefine} disabled={isRefining || !formData.summary} variant="outline" className="flex items-center gap-2 text-purple-600 border-purple-200 hover:bg-purple-50">
                {isRefining ? (<><Loader2 className="h-4 w-4 animate-spin" />Refining...</>) : (<><Wand2 className="h-4 w-4" />Refine</>)}
              </Button>
            </div>
          </div>
          {isTranscribing && (
            <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-2 text-blue-700 text-sm mb-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                {transcriptionProgress.message || 'Processing...'}
              </div>
              {transcriptionProgress.status === 'loading-model' && (
                <div className="w-full bg-blue-200 rounded-full h-2">
                  <div className="bg-blue-600 h-2 rounded-full transition-all duration-300" style={{ width: `${transcriptionProgress.modelProgress}%` }} />
                </div>
              )}
              {transcriptionProgress.status === 'transcribing' && (
                <div className="w-full bg-green-200 rounded-full h-2">
                  <div className="bg-green-600 h-2 rounded-full transition-all duration-300" style={{ width: `${transcriptionProgress.transcriptionProgress}%` }} />
                </div>
              )}
              {transcriptionProgress.status === 'loading-model' && transcriptionProgress.modelProgress === 0 && (
                <p className="text-xs text-blue-600 mt-1">First time loading the AI model - this may take a minute...</p>
              )}
            </div>
          )}
          {transcribeError && <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">{transcribeError}</div>}
          {refineError && <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">{refineError}</div>}
          <textarea className="w-full min-h-[150px] rounded-lg border border-gray-200 p-3 resize-y" value={formData.summary} onChange={(e) => setFormData({ ...formData, summary: e.target.value })} placeholder="Upload a video and click 'Transcribe' to auto-transcribe, or type/paste content here. Then click 'Refine' to fix errors and generate title + sentiment." />
        </div>

        {/* Sentiment Analysis */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <Label className="text-gray-700 font-medium block mb-4">Sentiment Analysis</Label>
          <SentimentDisplay positive={sentimentData.positive} neutral={sentimentData.neutral} negative={sentimentData.negative} overallSentiment={sentimentData.overallSentiment} isLoading={isRefining} onSentimentChange={(data) => setSentimentData(data)} />
        </div>

        {/* Keywords */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <Label htmlFor="keywords" className="text-gray-700 font-medium">Keywords</Label>
          <Input id="keywords" className="mt-1 h-11" value={formData.keywords} onChange={(e) => setFormData({ ...formData, keywords: e.target.value })} placeholder="politics, economy, sports..." />
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
          <Button type="button" variant="outline" onClick={() => router.push('/media/tv')}>Cancel</Button>
          <Button type="submit" className="bg-orange-500 hover:bg-orange-600 text-white" disabled={isSubmitting}>
            {isSubmitting ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving...</>) : 'Save Story'}
          </Button>
        </div>
      </form>
    </div>
  )
}
