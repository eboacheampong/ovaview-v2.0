'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SentimentDisplay } from '@/components/ui/sentiment-display'
import { KeywordInput } from '@/components/ui/keyword-input'
import { useWhisperTranscription } from '@/hooks/use-whisper-transcription'
import { ChevronRight, ChevronLeft, Play, Pause, Loader2, ArrowLeft, Upload, X, Music, Wand2, FileText, Mic }from 'lucide-react'

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

export default function AddRadioStoryPage() {
  const router = useRouter()
  const audioRef = useRef<HTMLAudioElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { transcribe, progress: transcriptionProgress, isReady: whisperReady } = useWhisperTranscription()
  
  const [stations, setStations] = useState<Station[]>([])
  const [industries, setIndustries] = useState<Industry[]>([])
  const [availableKeywords, setAvailableKeywords] = useState<Keyword[]>([])
  const [formData, setFormData] = useState({
    title: '',
    stationId: '',
    presenters: '',
    programId: '',
    dateAired: '',
    summary: '',
    keywords: '',
    audioTitle: '',
    audioUrl: '',
    industryId: '',
  })
  const [sentimentData, setSentimentData] = useState<{
    positive: number | null
    neutral: number | null
    negative: number | null
    overallSentiment: 'positive' | 'neutral' | 'negative' | null
  }>({ positive: null, neutral: null, negative: null, overallSentiment: null })
  const [audioFile, setAudioFile] = useState<File | null>(null)
  const [audioPreviewUrl, setAudioPreviewUrl] = useState<string | null>(null)
  const [selectedSubIndustries, setSelectedSubIndustries] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isRefining, setIsRefining] = useState(false)
  const [refineError, setRefineError] = useState('')
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [transcribeError, setTranscribeError] = useState('')

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [stationRes, indRes, keywordRes] = await Promise.all([
          fetch('/api/radio-stations'),
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
    return () => { if (audioPreviewUrl) URL.revokeObjectURL(audioPreviewUrl) }
  }, [audioPreviewUrl])

  const selectedStation = stations.find(s => s.id === formData.stationId)
  const filteredPrograms = selectedStation?.programs || []
  const selectedIndustry = industries.find(i => i.id === formData.industryId)
  const availableSubIndustries = selectedIndustry?.subIndustries.filter(s => !selectedSubIndustries.includes(s.id)) || []
  const selectedSubIndustryObjects = selectedIndustry?.subIndustries.filter(s => selectedSubIndustries.includes(s.id)) || []

  const handleAudioSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (!file.type.startsWith('audio/')) { alert('Please select an audio file'); return }
      if (file.size > 50 * 1024 * 1024) { alert('Audio file must be less than 50MB'); return }
      setAudioFile(file)
      if (audioPreviewUrl) URL.revokeObjectURL(audioPreviewUrl)
      setAudioPreviewUrl(URL.createObjectURL(file))
      if (!formData.audioTitle) setFormData(prev => ({ ...prev, audioTitle: file.name.replace(/\.[^/.]+$/, '') }))
    }
  }

  const handleRemoveAudio = () => {
    setAudioFile(null)
    if (audioPreviewUrl) { URL.revokeObjectURL(audioPreviewUrl); setAudioPreviewUrl(null) }
    if (fileInputRef.current) fileInputRef.current.value = ''
    setIsPlaying(false)
  }

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) audioRef.current.pause()
      else audioRef.current.play()
      setIsPlaying(!isPlaying)
    }
  }

  // Automatic transcription using client-side Whisper
  const handleTranscribe = async () => {
    if (!audioFile) {
      setTranscribeError('Please upload an audio file first')
      return
    }

    setIsTranscribing(true)
    setTranscribeError('')

    try {
      const transcription = await transcribe(audioFile)
      setFormData(prev => ({ ...prev, summary: transcription }))
    } catch (error) {
      setTranscribeError(error instanceof Error ? error.message : 'Failed to transcribe audio')
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
      
      // Update form with AI suggestions
      setFormData(prev => ({ 
        ...prev, 
        title: data.title || prev.title, 
        summary: data.transcription || prev.summary,
        industryId: data.suggestedIndustryId || prev.industryId,
        keywords: data.suggestedKeywords?.length > 0 ? data.suggestedKeywords.join(', ') : prev.keywords,
      }))
      
      // Update sub-industries if industry was suggested
      if (data.suggestedSubIndustryIds?.length > 0) {
        setSelectedSubIndustries(data.suggestedSubIndustryIds)
      }
      
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
      // Upload audio to Vercel Blob storage if file exists
      let uploadedAudioUrl = formData.audioUrl
      if (audioFile) {
        const formDataUpload = new FormData()
        formDataUpload.append('file', audioFile)
        formDataUpload.append('folder', 'radio-audio')
        
        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          body: formDataUpload,
        })
        
        if (uploadRes.ok) {
          const { url } = await uploadRes.json()
          uploadedAudioUrl = url
        }
      }

      const response = await fetch('/api/radio-stories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title, content: formData.summary, summary: formData.summary,
          presenters: formData.presenters, keywords: formData.keywords,
          audioUrl: uploadedAudioUrl, audioTitle: formData.audioTitle || null,
          date: formData.dateAired, stationId: formData.stationId || null,
          programId: formData.programId || null, industryId: formData.industryId || null,
          subIndustryIds: selectedSubIndustries, sentimentPositive: sentimentData.positive,
          sentimentNeutral: sentimentData.neutral, sentimentNegative: sentimentData.negative,
          overallSentiment: sentimentData.overallSentiment,
        }),
      })
      if (!response.ok) throw new Error('Failed to create story')
      router.push('/media/radio')
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
          <button onClick={() => router.push('/media/radio')} className="flex items-center gap-2 text-orange-100 hover:text-white mb-3 transition-colors">
            <ArrowLeft className="h-4 w-4" />Back to Stories
          </button>
          <h1 className="text-2xl font-bold">New Radio Story</h1>
          <p className="text-orange-100 text-sm mt-1">Add a new radio story to the media monitoring system</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Story Title - FIRST */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <Label htmlFor="title" className="text-gray-700 font-medium">Story Title</Label>
          <Input id="title" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className="mt-1 h-12 text-lg" placeholder="Title will be auto-generated when you click Refine, or enter manually" required />
        </div>

        {/* Station & Details Section - SECOND */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="font-semibold text-gray-800 mb-4">Station & Broadcast Details</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="station" className="text-gray-700">Station</Label>
              <select id="station" className="w-full h-11 mt-1 rounded-lg border border-gray-200 px-3 bg-white" value={formData.stationId} onChange={(e) => setFormData({ ...formData, stationId: e.target.value, programId: '' })}>
                <option value="">Select station</option>
                {stations.map(station => (<option key={station.id} value={station.id}>{station.name} {station.frequency && `(${station.frequency})`}</option>))}
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

        {/* Audio Upload Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 bg-purple-100 rounded-lg"><Music className="h-5 w-5 text-purple-600" /></div>
            <div>
              <h2 className="font-semibold text-gray-800">Audio Source</h2>
              <p className="text-sm text-gray-500">Upload an audio file or paste a URL</p>
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <Label htmlFor="audioUrl" className="text-gray-700">Audio URL (optional)</Label>
              <Input id="audioUrl" value={formData.audioUrl} onChange={(e) => setFormData({ ...formData, audioUrl: e.target.value })} placeholder="https://example.com/audio.mp3" className="mt-1 h-11" />
            </div>
            <div className="flex items-center gap-4">
              <div className="flex-1 border-t border-gray-200" /><span className="text-sm text-gray-400">OR</span><div className="flex-1 border-t border-gray-200" />
            </div>
            <input ref={fileInputRef} type="file" accept="audio/*" onChange={handleAudioSelect} className="hidden" />
            {!audioFile ? (
              <button type="button" onClick={() => fileInputRef.current?.click()} className="w-full h-32 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center gap-2 hover:border-purple-400 hover:bg-purple-50 transition-colors">
                <Upload className="h-8 w-8 text-gray-400" /><span className="text-sm text-gray-500">Click to upload audio file</span><span className="text-xs text-gray-400">MP3, WAV, M4A up to 50MB</span>
              </button>
            ) : (
              <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center"><Music className="h-5 w-5 text-purple-600" /></div>
                    <div><p className="font-medium text-gray-900 text-sm">{audioFile.name}</p><p className="text-xs text-gray-500">{(audioFile.size / (1024 * 1024)).toFixed(2)} MB</p></div>
                  </div>
                  <button type="button" onClick={handleRemoveAudio} className="p-1.5 hover:bg-gray-200 rounded-full"><X className="h-4 w-4 text-gray-500" /></button>
                </div>
                {audioPreviewUrl && (
                  <div className="flex items-center gap-3 bg-white rounded-lg p-3 border border-gray-200">
                    <button type="button" onClick={togglePlay} className="w-10 h-10 bg-purple-500 hover:bg-purple-600 rounded-full flex items-center justify-center text-white">
                      {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
                    </button>
                    <audio ref={audioRef} src={audioPreviewUrl} onEnded={() => setIsPlaying(false)} className="flex-1" controls />
                  </div>
                )}
              </div>
            )}
            <div>
              <Label htmlFor="audioTitle" className="text-gray-700">Audio Title</Label>
              <Input id="audioTitle" value={formData.audioTitle} onChange={(e) => setFormData({ ...formData, audioTitle: e.target.value })} placeholder="Enter audio clip title" className="mt-1 h-11" />
            </div>
          </div>
        </div>

        {/* Transcription & Refine Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-green-100 rounded-lg"><FileText className="h-5 w-5 text-green-600" /></div>
              <div><h2 className="font-semibold text-gray-800">Transcription</h2><p className="text-sm text-gray-500">Auto-transcribe audio or type manually</p></div>
            </div>
            <div className="flex gap-2">
              <Button type="button" onClick={handleTranscribe} disabled={isTranscribing || !audioFile} variant="outline" className="flex items-center gap-2 text-green-600 border-green-200 hover:bg-green-50">
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
          <textarea className="w-full min-h-[150px] rounded-lg border border-gray-200 p-3 resize-y" value={formData.summary} onChange={(e) => setFormData({ ...formData, summary: e.target.value })} placeholder="Upload an audio file and click 'Transcribe' to auto-transcribe, or type/paste content here. Then click 'Refine' to fix errors and generate title + sentiment." />
        </div>

        {/* Sentiment Analysis */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <Label className="text-gray-700 font-medium block mb-4">Sentiment Analysis</Label>
          <SentimentDisplay positive={sentimentData.positive} neutral={sentimentData.neutral} negative={sentimentData.negative} overallSentiment={sentimentData.overallSentiment} isLoading={isRefining} onSentimentChange={(data) => setSentimentData(data)} />
        </div>

        {/* Keywords */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <Label htmlFor="keywords" className="text-gray-700 font-medium">Keywords</Label>
          <KeywordInput
            value={formData.keywords}
            onChange={(value) => setFormData({ ...formData, keywords: value })}
            availableKeywords={availableKeywords}
            placeholder="Type to search keywords..."
            className="mt-1"
          />
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
          <Button type="button" variant="outline" onClick={() => router.push('/media/radio')}>Cancel</Button>
          <Button type="submit" className="bg-orange-500 hover:bg-orange-600 text-white" disabled={isSubmitting}>
            {isSubmitting ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving...</>) : 'Save Story'}
          </Button>
        </div>
      </form>
    </div>
  )
}
