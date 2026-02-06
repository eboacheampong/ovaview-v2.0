'use client'

import { useState, useCallback, useRef, useEffect } from 'react'

type TranscriptionStatus = 'idle' | 'loading-model' | 'transcribing' | 'complete' | 'error'

interface TranscriptionProgress {
  status: TranscriptionStatus
  modelProgress: number
  transcriptionProgress: number
  message: string
}

interface UseWhisperTranscriptionReturn {
  transcribe: (file: File) => Promise<string>
  progress: TranscriptionProgress
  isReady: boolean
  error: string | null
  cancel: () => void
}

export function useWhisperTranscription(): UseWhisperTranscriptionReturn {
  const [progress, setProgress] = useState<TranscriptionProgress>({
    status: 'idle',
    modelProgress: 0,
    transcriptionProgress: 0,
    message: '',
  })
  const [error, setError] = useState<string | null>(null)
  const [isReady, setIsReady] = useState(false)
  const workerRef = useRef<Worker | null>(null)
  const resolveRef = useRef<((value: string) => void) | null>(null)
  const rejectRef = useRef<((reason: Error) => void) | null>(null)

  // Initialize worker on mount
  useEffect(() => {
    if (typeof window === 'undefined') return

    // Create worker
    const worker = new Worker('/whisper-worker.js', { type: 'module' })
    workerRef.current = worker

    // Handle messages from worker
    worker.onmessage = (event) => {
      const { type, status, progress: prog, message, stage, transcription, error: err } = event.data

      switch (type) {
        case 'status':
          setProgress(prev => ({ ...prev, status: status === 'loading' ? 'loading-model' : prev.status, message }))
          break

        case 'progress':
          if (stage === 'model') {
            setProgress({
              status: 'loading-model',
              modelProgress: prog,
              transcriptionProgress: 0,
              message,
            })
          } else if (stage === 'transcription') {
            setProgress({
              status: 'transcribing',
              modelProgress: 100,
              transcriptionProgress: prog,
              message,
            })
          }
          break

        case 'ready':
          setIsReady(true)
          setProgress(prev => ({ ...prev, modelProgress: 100, message: 'Model ready!' }))
          break

        case 'result':
          setProgress({
            status: 'complete',
            modelProgress: 100,
            transcriptionProgress: 100,
            message: 'Transcription complete!',
          })
          if (resolveRef.current) {
            resolveRef.current(transcription)
            resolveRef.current = null
            rejectRef.current = null
          }
          break

        case 'error':
          setError(err)
          setProgress(prev => ({ ...prev, status: 'error', message: err }))
          if (rejectRef.current) {
            rejectRef.current(new Error(err))
            resolveRef.current = null
            rejectRef.current = null
          }
          break
      }
    }

    worker.onerror = (err) => {
      console.error('Worker error:', err)
      setError('Worker failed to load')
      if (rejectRef.current) {
        rejectRef.current(new Error('Worker failed'))
        resolveRef.current = null
        rejectRef.current = null
      }
    }

    // Preload the model
    worker.postMessage({ type: 'load' })

    return () => {
      worker.terminate()
      workerRef.current = null
    }
  }, [])

  const transcribe = useCallback(async (file: File): Promise<string> => {
    setError(null)

    if (!workerRef.current) {
      throw new Error('Transcription worker not initialized')
    }

    setProgress({
      status: 'transcribing',
      modelProgress: isReady ? 100 : 0,
      transcriptionProgress: 0,
      message: 'Preparing audio...',
    })

    try {
      // Convert file to audio data
      const audioData = await fileToAudioData(file)

      setProgress(prev => ({
        ...prev,
        transcriptionProgress: 5,
        message: 'Processing audio...',
      }))

      // Create promise to wait for worker result
      const result = await new Promise<string>((resolve, reject) => {
        resolveRef.current = resolve
        rejectRef.current = reject

        // Send audio data to worker (transfer the buffer for efficiency)
        workerRef.current!.postMessage(
          { type: 'transcribe', audioData: audioData.buffer },
          [audioData.buffer]
        )
      })

      return result
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Transcription failed'
      setError(errorMessage)
      setProgress(prev => ({ ...prev, status: 'error', message: errorMessage }))
      throw err
    }
  }, [isReady])

  const cancel = useCallback(() => {
    // Can't really cancel a worker mid-task, but we can ignore the result
    resolveRef.current = null
    rejectRef.current = null
    setProgress({
      status: 'idle',
      modelProgress: isReady ? 100 : 0,
      transcriptionProgress: 0,
      message: 'Cancelled',
    })
  }, [isReady])

  return {
    transcribe,
    progress,
    isReady,
    error,
    cancel,
  }
}

/**
 * Convert a File to audio data suitable for Whisper (Float32Array at 16kHz)
 */
async function fileToAudioData(file: File): Promise<Float32Array> {
  const arrayBuffer = await file.arrayBuffer()

  // Create audio context with 16kHz sample rate
  const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
  const audioContext = new AudioContextClass({ sampleRate: 16000 })

  try {
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)

    // Mix to mono
    let audioData: Float32Array

    if (audioBuffer.numberOfChannels === 1) {
      audioData = new Float32Array(audioBuffer.getChannelData(0))
    } else {
      const length = audioBuffer.length
      audioData = new Float32Array(length)
      const numChannels = audioBuffer.numberOfChannels

      for (let ch = 0; ch < numChannels; ch++) {
        const channelData = audioBuffer.getChannelData(ch)
        for (let i = 0; i < length; i++) {
          audioData[i] += channelData[i] / numChannels
        }
      }
    }

    // Resample if needed
    if (audioBuffer.sampleRate !== 16000) {
      audioData = resample(audioData, audioBuffer.sampleRate, 16000)
    }

    return audioData
  } finally {
    await audioContext.close()
  }
}

function resample(data: Float32Array, fromRate: number, toRate: number): Float32Array {
  if (fromRate === toRate) return data

  const ratio = fromRate / toRate
  const newLength = Math.round(data.length / ratio)
  const result = new Float32Array(newLength)

  for (let i = 0; i < newLength; i++) {
    const srcIndex = i * ratio
    const srcIndexFloor = Math.floor(srcIndex)
    const srcIndexCeil = Math.min(srcIndexFloor + 1, data.length - 1)
    const t = srcIndex - srcIndexFloor
    result[i] = data[srcIndexFloor] * (1 - t) + data[srcIndexCeil] * t
  }

  return result
}
