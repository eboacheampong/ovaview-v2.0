// Web Worker for Whisper transcription
// This runs in a separate thread so it doesn't block the UI

import { pipeline, env } from 'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.1';

// Configure for browser
env.allowLocalModels = false;
env.useBrowserCache = true;

let transcriber = null;

// Handle messages from main thread
self.onmessage = async (event) => {
  const { type, audioData } = event.data;

  if (type === 'load') {
    await loadModel();
  } else if (type === 'transcribe') {
    await transcribe(audioData);
  }
};

async function loadModel() {
  try {
    self.postMessage({ type: 'status', status: 'loading', message: 'Loading Whisper model...' });

    transcriber = await pipeline(
      'automatic-speech-recognition',
      'Xenova/whisper-tiny.en',
      {
        progress_callback: (progress) => {
          if (progress.status === 'progress' && progress.progress !== undefined) {
            self.postMessage({
              type: 'progress',
              stage: 'model',
              progress: Math.round(progress.progress),
              message: `Downloading model: ${Math.round(progress.progress)}%`
            });
          } else if (progress.status === 'initiate') {
            self.postMessage({
              type: 'progress',
              stage: 'model',
              progress: 0,
              message: `Loading ${progress.file || 'model'}...`
            });
          } else if (progress.status === 'done') {
            self.postMessage({
              type: 'progress',
              stage: 'model',
              progress: 100,
              message: 'Model loaded!'
            });
          }
        }
      }
    );

    self.postMessage({ type: 'ready' });
  } catch (error) {
    self.postMessage({ type: 'error', error: error.message });
  }
}

async function transcribe(audioData) {
  try {
    if (!transcriber) {
      await loadModel();
    }

    // Convert the transferred ArrayBuffer back to Float32Array
    const float32Audio = new Float32Array(audioData);
    
    // Calculate audio duration for progress estimation
    const sampleRate = 16000;
    const audioDuration = float32Audio.length / sampleRate;
    const chunkLength = 30; // seconds per chunk
    const totalChunks = Math.ceil(audioDuration / chunkLength);
    let processedChunks = 0;

    self.postMessage({
      type: 'progress',
      stage: 'transcription',
      progress: 0,
      message: `Transcribing ${Math.round(audioDuration)}s of audio...`
    });

    const result = await transcriber(float32Audio, {
      chunk_length_s: chunkLength,
      stride_length_s: 5,
      return_timestamps: false,
      callback_function: (item) => {
        // This is called for each chunk processed
        if (item.hasOwnProperty('text')) {
          processedChunks++;
          const progress = Math.min(Math.round((processedChunks / totalChunks) * 100), 99);
          self.postMessage({
            type: 'progress',
            stage: 'transcription',
            progress: progress,
            message: `Transcribing: ${progress}%`
          });
        }
      },
      chunk_callback: (chunk) => {
        // Alternative progress tracking via chunks
        processedChunks++;
        const progress = Math.min(Math.round((processedChunks / totalChunks) * 100), 99);
        self.postMessage({
          type: 'progress',
          stage: 'transcription',
          progress: progress,
          message: `Processing chunk ${processedChunks}/${totalChunks}...`
        });
      }
    });

    self.postMessage({
      type: 'progress',
      stage: 'transcription',
      progress: 100,
      message: 'Transcription complete!'
    });

    self.postMessage({
      type: 'result',
      transcription: result.text || ''
    });
  } catch (error) {
    self.postMessage({ type: 'error', error: error.message });
  }
}
