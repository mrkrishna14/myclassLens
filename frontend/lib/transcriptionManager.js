const { AssemblyAI } = require('assemblyai')

class TranscriptionManager {
  constructor() {
    this.client = null
    this.transcriber = null
    this.isTranscribing = false
    this.captionCallback = null
  }

  async initialize(apiKey, onCaption) {
    if (!apiKey) {
      console.error('AssemblyAI API key not provided')
      return false
    }

    this.client = new AssemblyAI({ apiKey })
    this.captionCallback = onCaption
    return true
  }

  async startTranscription(sampleRate = 16000) {
    if (!this.client) {
      console.error('Transcription client not initialized')
      return false
    }

    try {
      this.transcriber = this.client.realtime.transcriber({
        sampleRate,
        encoding: 'pcm_s16le',
      })

      this.transcriber.on('open', () => {
        console.log('Transcription session opened')
        this.isTranscribing = true
      })

      this.transcriber.on('error', (error) => {
        console.error('Transcription error:', error)
      })

      this.transcriber.on('close', () => {
        console.log('Transcription session closed')
        this.isTranscribing = false
      })

      this.transcriber.on('transcript', (transcript) => {
        if (!transcript.text) return

        const caption = {
          text: transcript.text,
          isFinal: transcript.message_type === 'FinalTranscript',
          timestamp: Date.now(),
        }

        if (this.captionCallback) {
          this.captionCallback(caption)
        }
      })

      await this.transcriber.connect()
      return true
    } catch (error) {
      console.error('Failed to start transcription:', error)
      return false
    }
  }

  sendAudio(audioData) {
    if (this.transcriber && this.isTranscribing) {
      this.transcriber.sendAudio(audioData)
    }
  }

  async stop() {
    if (this.transcriber) {
      await this.transcriber.close()
      this.transcriber = null
      this.isTranscribing = false
    }
  }
}

module.exports = { TranscriptionManager }
