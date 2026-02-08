'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RichTextEditor } from '@/components/ui/rich-text-editor'
import { SentimentDisplay } from '@/components/ui/sentiment-display'
import { KeywordInput } from '@/components/ui/keyword-input'
import { useWhisperTranscription } from '@/hooks/use-whisper-transcription'
import { Video, ChevronRight, ChevronLeft, Loader2, Upload, X, Play, Pause, FileText, Mic, Tv, Calendar, User, Sparkles, Wand2 } from 'lucide-react'

interface Station {
  id: string
  name: string
  location?: string
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

export default function AddTVStoryPage() {
  const router = useRouter()
  const videoInputRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const { transcribe, progress: transcriptionProgress } = useWhisperTranscription()

  const [stations, setStations] = useState<Station[]>([])
  const [industries, setIndustries] = useState<Industry[]>([])
  const [availableKeywords, setAvailableKeywords] = useState<Keyword[]>([])
  const [formData, setFormData] = useState({
    title: '',
    stationId: '',
    presenters: '',
    programId: '',
    dateAired: '',
    content: '',
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
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analyzeError, setAnalyzeError] = useState('')
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [transcribeError, setTranscribeError] = useState('')

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [stationRes, indRes, keywordRes] = await Promise.all([
          fetch('/api/tv-stations'),
          fetch('/api/industries'),
          fetch('/api/keywords'),
        ])
        if (stationRes.ok) setStations(await stationRes.json())
        if (indRes.ok) setIndustries(await indRes.json())
        if (keywordRes.ok) setAvailableKeywords(await keywordRes.json())
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

  const handleTranscribe = async () => {
    if (!videoFile) {
      setTranscribeError('Please upload a video file first. YouTube/Vimeo URLs cannot be transcribed directly.')
      return
    }
    setIsTranscribing(true)
    setTranscribeError('')
    try {
      const transcription = await transcribe(videoFile)
      setFormData(prev => ({ ...prev, content: transcription }))
    } catch (error) {
      setTranscribeError(error instanceof Error ? error.message : 'Failed to transcribe video')
    } finally {
      setIsTranscribing(false)
    }
  }

  const handleAnalyze = async () => {
    if (!formData.content || formData.content.trim().length < 20) {
      setAnalyzeError('Please add content first (at least 20 characters)')
      return
    }
    setIsAnalyzing(true)
    setAnalyzeError('')
    try {
      const response = await fetch('/api/refine-transcription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcription: formData.content }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to analyze')
      
      setFormData(prev => ({ 
        ...prev, 
        title: data.title || prev.title,
        content: data.transcription || prev.content,
        summary: data.summary || prev.summary,
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
      let uploadedVideoUrl = formData.videoUrl
      if (videoFile) {
        const formDataUpload = new FormData()
        formDataUpload.append('file', videoFile)
        formDataUpload.append('folder', 'tv-video')
        const uploadRes = await fetch('/api/upload', { method: 'POST', body: formDataUpload })
        if (uploadRes.ok) {
          const { url } = await uploadRes.json()
          uploadedVideoUrl = url
        }
      }

      const response = await fetch('/api/tv-stories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title,
          content: formData.content,
          summary: formData.summary,
          presenters: formData.presenters,
          videoUrl: uploadedVideoUrl,
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
          <h1 className="text-2xl font-bold">New TV Story</h1>
          <p className="text-orange-100 text-sm mt-1">Add a new TV story to the media monitoring system</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="max-w-4xl mx-auto p-6 space-y-8">
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
              <Label htmlFor="videoUrl" className="text-gray-600 text-sm">Video URL (YouTube or Vimeo)</Label>
              <Input id="videoUrl" value={formData.videoUrl} onChange={(e) => setFormData({ ...formData, videoUrl: e.target.value })} placeholder="https://youtube.com/watch?v=..." className="mt-1 h-11" />
            </div>
            {embedUrl && (
              <div className="aspect-video rounded-lg overflow-hidden bg-black">
                <iframe src={embedUrl} className="w-full h-full" allowFullScreen />
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
              <Label htmlFor="videoTitle" className="text-gray-600 text-sm">Video Title</Label>
              <Input id="videoTitle" value={formData.videoTitle} onChange={(e) => setFormData({ ...formData, videoTitle: e.target.value })} placeholder="Enter video title" className="mt-1 h-11" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 bg-blue-100 rounded-lg"><FileText className="h-5 w-5 text-blue-600" /></div>
            <Label htmlFor="title" className="font-semibold text-gray-800">Story Title</Label>
          </div>
          <Input id="title" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} placeholder="Enter story title or let AI generate it" className="h-12 text-lg" required />
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-green-100 rounded-lg"><FileText className="h-5 w-5 text-green-600" /></div>
              <div><h2 className="font-semibold text-gray-800">Story Content</h2><p className="text-sm text-gray-500">Transcribe video or type content manually</p></div>
            </div>
            <Button type="button" onClick={handleTranscribe} disabled={isTranscribing || !videoFile} variant="outline" className="flex items-center gap-2 text-green-600 border-green-200 hover:bg-green-50">
              {isTranscribing ? (<><Loader2 className="h-4 w-4 animate-spin" />{transcriptionProgress.message || 'Transcribing...'}</>) : (<><Mic className="h-4 w-4" />Speech to Text</>)}
            </Button>
          </div>
          {isTranscribing && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-2 text-blue-700 text-sm mb-2"><Loader2 className="h-4 w-4 animate-spin" />{transcriptionProgress.message || 'Processing...'}</div>
              {transcriptionProgress.status === 'loading-model' && (<div className="w-full bg-blue-200 rounded-full h-2"><div className="bg-blue-600 h-2 rounded-full transition-all duration-300" style={{ width: `${transcriptionProgress.modelProgress}%` }} /></div>)}
              {transcriptionProgress.status === 'transcribing' && (<div className="w-full bg-green-200 rounded-full h-2"><div className="bg-green-600 h-2 rounded-full transition-all duration-300" style={{ width: `${transcriptionProgress.transcriptionProgress}%` }} /></div>)}
            </div>
          )}
          {transcribeError && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">{transcribeError}</div>}
          <RichTextEditor value={formData.content} onChange={(html) => setFormData({ ...formData, content: html })} className="min-h-[300px]" />
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-purple-100 rounded-lg"><Sparkles className="h-5 w-5 text-purple-600" /></div>
              <div><h2 className="font-semibold text-gray-800">Story Summary</h2><p className="text-sm text-gray-500">AI-generated summary and analysis</p></div>
            </div>
            <Button type="button" onClick={handleAnalyze} disabled={isAnalyzing || !formData.content} variant="outline" className="flex items-center gap-2 text-purple-600 border-purple-200 hover:bg-purple-50">
              {isAnalyzing ? (<><Loader2 className="h-4 w-4 animate-spin" />Analyzing...</>) : (<><Wand2 className="h-4 w-4" />Analyze with AI</>)}
            </Button>
          </div>
          {analyzeError && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">{analyzeError}</div>}
          <textarea className="w-full min-h-[120px] rounded-lg border border-gray-200 p-4 resize-y focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all" value={formData.summary} onChange={(e) => setFormData({ ...formData, summary: e.target.value })} placeholder="Click 'Analyze with AI' to generate a summary, or write your own..." />
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <Label className="font-semibold text-gray-800 block mb-4">Sentiment Analysis</Label>
          <SentimentDisplay positive={sentimentData.positive} neutral={sentimentData.neutral} negative={sentimentData.negative} overallSentiment={sentimentData.overallSentiment} isLoading={isAnalyzing} onSentimentChange={(data) => setSentimentData(data)} />
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="font-semibold text-gray-800 mb-4">Broadcast Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="station" className="text-gray-600 flex items-center gap-2 mb-2"><Tv className="h-4 w-4" />TV Station</Label>
              <select id="station" className="w-full h-11 rounded-lg border border-gray-200 px-3 bg-white focus:ring-2 focus:ring-orange-500 focus:border-transparent" value={formData.stationId} onChange={(e) => setFormData({ ...formData, stationId: e.target.value, programId: '' })}>
                <option value="">Select station</option>
                {stations.map(station => (<option key={station.id} value={station.id}>{station.name} {station.location && `(${station.location})`}</option>))}
              </select>
            </div>
            <div>
              <Label htmlFor="program" className="text-gray-600 mb-2 block">Program/Show</Label>
              <select id="program" className="w-full h-11 rounded-lg border border-gray-200 px-3 bg-white focus:ring-2 focus:ring-orange-500 focus:border-transparent" value={formData.programId} onChange={(e) => setFormData({ ...formData, programId: e.target.value })}>
                <option value="">Select program</option>
                {filteredPrograms.map(program => (<option key={program.id} value={program.id}>{program.name}</option>))}
              </select>
            </div>
            <div>
              <Label htmlFor="presenters" className="text-gray-600 flex items-center gap-2 mb-2"><User className="h-4 w-4" />Presenter(s)</Label>
              <Input id="presenters" value={formData.presenters} onChange={(e) => setFormData({ ...formData, presenters: e.target.value })} placeholder="Presenter names" className="h-11" />
            </div>
            <div>
              <Label htmlFor="dateAired" className="text-gray-600 flex items-center gap-2 mb-2"><Calendar className="h-4 w-4" />Date Aired</Label>
              <Input id="dateAired" type="date" value={formData.dateAired} onChange={(e) => setFormData({ ...formData, dateAired: e.target.value })} className="h-11" required />
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="keywords" className="text-gray-600 mb-2 block">Keywords</Label>
              <KeywordInput value={formData.keywords} onChange={(value) => setFormData({ ...formData, keywords: value })} availableKeywords={availableKeywords} placeholder="Type to search keywords..." />
            </div>
          </div>
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
                    availableSubIndustries.map(s => (<div key={s.id} className="px-4 py-3 hover:bg-white cursor-pointer flex justify-between items-center border-b border-gray-100 last:border-0 transition-colors" onClick={() => setSelectedSubIndustries([...selectedSubIndustries, s.id])}><span className="text-gray-700">{s.name}</span><ChevronRight className="h-4 w-4 text-gray-400" /></div>))
                  )}
                </div>
              </div>
              <div>
                <Label className="text-gray-600 text-center block mb-3">Selected Sub-industries</Label>
                <div className="border border-gray-200 rounded-lg h-48 overflow-y-auto bg-orange-50">
                  {selectedSubIndustryObjects.length === 0 ? (<p className="text-gray-400 text-sm text-center py-4">Click to add sub-industries</p>) : (
                    selectedSubIndustryObjects.map(s => (<div key={s.id} className="px-4 py-3 hover:bg-orange-100 cursor-pointer flex justify-between items-center border-b border-orange-100 last:border-0 transition-colors" onClick={() => setSelectedSubIndustries(selectedSubIndustries.filter(x => x !== s.id))}><ChevronLeft className="h-4 w-4 text-orange-400" /><span className="text-gray-700">{s.name}</span></div>))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

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
