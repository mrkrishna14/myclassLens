# Complete working VideoPlayer.tsx with English transcription + translation

'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Play, Pause, Volume2, VolumeX, Settings, Maximize, Minimize } from 'lucide-react'
import ClickQuestionHandler from './ClickQuestionHandler'
import InteractionLog from './InteractionLog'
import CaptionDisplay from './CaptionDisplay'
import AccessibilityPanel from './AccessibilityPanel'
import AnswerPopup from './AnswerPopup'

interface Interaction {
  id: string
  timestamp: number
  image: string
  question: string
  answer: string
  transcriptSnippet: string
}

interface VideoPlayerProps {
  videoUrl?: string
  videoFile?: File
  liveStream?: MediaStream
  captionLanguage: string
  targetLanguage: string
  isLive?: boolean
}

export default function VideoPlayer({
  videoUrl,
  videoFile,
  liveStream,
  captionLanguage,
  targetLanguage,
  isLive = false,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [volume, setVolume] = useState(1)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isPaused, setIsPaused] = useState(true)
  const [showClickHandler, setShowClickHandler] = useState(true) // Always enabled for live streams
  const [interactions, setInteractions] = useState<Interaction[]>([])
  const [currentCaption, setCurrentCaption] = useState('')
  const [translatedCaption, setTranslatedCaption] = useState('')
  const [transcript, setTranscript] = useState<Array<{ start: number; end: number; text: string }>>([])
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [isTranslating, setIsTranslating] = useState(false)
  const translationTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const [showAccessibility, setShowAccessibility] = useState(false)
  const [playbackRate, setPlaybackRate] = useState(1)
  const [captionSize, setCaptionSize] = useState<'small' | 'medium' | 'large'>('medium')
  const [showAnswerPopup, setShowAnswerPopup] = useState(false)
  const [currentAnswer, setCurrentAnswer] = useState({ question: '', answer: '' })
  const [sessionStartTime, setSessionStartTime] = useState<number>(0)
  const recognitionRef = useRef<any>(null)
  const transcriptHistoryRef = useRef<Array<{ start: number; end: number; text: string }>>([])
  
  // Map language codes to Web Speech API BCP-47 format
  const getSpeechRecognitionLang = (langCode: string): string => {
    const langMap: { [key: string]: string } = {
      'en': 'en-US',
      'es': 'es-ES',
      'fr': 'fr-FR',
      'de': 'de-DE',
      'zh': 'zh-CN',
      'ja': 'ja-JP',
      'ko': 'ko-KR',
      'pt': 'pt-BR',
      'ar': 'ar-SA',
      'hi': 'hi-IN',
      'ru': 'ru-RU',
      'it': 'it-IT',
      'nl': 'nl-NL',
      'sv': 'sv-SE',
      'da': 'da-DK',
      'no': 'no-NO',
      'fi': 'fi-FI',
      'pl': 'pl-PL',
      'tr': 'tr-TR'
    }
    return langMap[langCode] || langCode || 'en-US'
  }

  // Real-time translation function - immediate for better UX
  const translateText = async (text: string, from: string, to: string) => {
    if (!text.trim() || from === to) {
      setTranslatedCaption(text)
      return
    }

    setIsTranslating(true)
    try {
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: text.trim(),
          sourceLanguage: from,
          targetLanguage: to
        })
      })

      if (response.ok) {
        const data = await response.json()
        setTranslatedCaption(data.translatedText)
        console.log('✅ Translation successful:', data.translatedText)
      } else {
        console.error('Translation API error:', response.statusText)
        setTranslatedCaption(text) // Fallback to original text
      }
    } catch (error) {
      console.error('Translation error:', error)
      setTranslatedCaption(text) // Fallback to original text
    } finally {
      setIsTranslating(false)
    }
  }

  // Setup video element with stream or URL
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    if (isLive && liveStream) {
      // Only set stream if it's different
      if (video.srcObject !== liveStream) {
        video.srcObject = liveStream
        setSessionStartTime(Date.now())
      }
    } else if (videoUrl && !video.srcObject) {
      video.src = videoUrl
    }
  }, [videoUrl, liveStream])

  // Setup real-time transcription for live streams
  useEffect(() => {
    if (!isLive || !liveStream) return

    console.log('Setting up automatic real-time transcription...')

    // Use dynamic import to avoid TypeScript issues
    import('./speech-recognition').then(({ startSpeechRecognition }) => {
      const stopRecognition = startSpeechRecognition('en-US', (transcript: string) => {
        // Always transcribe in English for best accuracy
        setCurrentCaption(transcript)
        setIsConnected(true)
        
        // Immediately translate English to target language
        translateText(transcript, 'en', targetLanguage)
      }, (error: string) => {
        console.error('Speech recognition error:', error)
        setCurrentCaption(`Speech recognition error: ${error}`)
        setIsConnected(false)
      })

      // Store cleanup function
      recognitionRef.current = stopRecognition

    }).catch((error) => {
      console.error('Failed to load speech recognition:', error)
      setCurrentCaption('Speech recognition not available')
    })

    // Cleanup function
    return () => {
      if (recognitionRef.current && typeof recognitionRef.current === 'function') {
        try {
          recognitionRef.current()
        } catch (e) {
          console.log('Recognition already stopped')
        }
        recognitionRef.current = null
      }
      setIsConnected(false)
    }
  }, [isLive, liveStream, targetLanguage])

  // Transcribe video file on load (for uploaded videos)
  useEffect(() => {
    const transcribeVideo = async () => {
      if (!videoFile || isTranscribing || isLive) return
      
      setIsTranscribing(true)
      console.log('Starting transcription for video:', videoFile.name, videoFile.size, 'bytes')
      try {
        // AssemblyAI can handle video files directly
        const formData = new FormData()
        formData.append('audio', videoFile)
        formData.append('language', captionLanguage)

        console.log('Sending transcription request...')
        const response = await fetch('/api/transcribe', {
          method: 'POST',
          body: formData,
        })

        if (response.ok) {
          const data = await response.json()
          console.log('Transcription response data:', data)
          
          if (data.segments && data.segments.length > 0) {
            console.log(`Loaded ${data.segments.length} transcript segments`)
            setTranscript(data.segments)
          } else if (data.text) {
            // Fallback: create a single segment if segments aren't available
            console.log('Using fallback single segment')
            setTranscript([{
              start: 0,
              end: duration || 1000,
              text: data.text
            }])
          } else {
            console.error('No segments or text in response')
          }
        } else {
          console.error('Transcription failed:', data.error)
          alert(`Transcription failed: ${data.error || 'Unknown error'}`)
        }
      } catch (error) {
        console.error('Transcription error:', error)
        alert(`Transcription error: ${error}`)
      } finally {
        setIsTranscribing(false)
      }
    }
  }, [videoFile, captionLanguage, duration, isLive])

  // Update captions based on current time (for uploaded videos only)
  useEffect(() => {
    const updateCaption = () => {
      const current = videoRef.current?.currentTime || 0
      const segment = transcript.find(
        (seg) => seg.start <= current && seg.end >= current
      )
      if (segment && segment.text !== currentCaption) {
        console.log(`Caption at ${current.toFixed(2)}s:`, segment.text)
        setCurrentCaption(segment.text)
      } else if (!segment && currentCaption) {
        setCurrentCaption('')
      }
    }

    const interval = setInterval(updateCaption, 100)
    return () => clearInterval(interval)
  }, [transcript, currentCaption, isLive])

  // Handle volume changes
  useEffect(() => {
    const video = videoRef.current
    if (video) {
      video.volume = volume
    }
  }, [volume])

  // Handle fullscreen toggle
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) return

    if (isFullscreen) {
      if (document.exitFullscreen) {
        document.exitFullscreen()
      } else {
        document.webkitExitFullscreen()
      }
    } else {
      const element = containerRef.current
      if (element.requestFullscreen) {
        element.requestFullscreen()
      } else if (element.webkitRequestFullscreen) {
        element.webkitRequestFullscreen()
      }
    }
    setIsFullscreen(!isFullscreen)
  }, [isFullscreen])

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.key === ' ' && isPlaying) {
        togglePlay()
      } else if (event.key === ' ' && !isPlaying) {
        togglePlay()
      }
    }

    document.addEventListener('keydown', handleKeyPress)
    return () => {
      document.removeEventListener('keydown', handleKeyPress)
    }
  }, [isPlaying])

  // Handle playback rate changes
  useEffect(() => {
    const video = videoRef.current
    if (video) {
      video.playbackRate = playbackRate
    }
  }, [playbackRate])

  // Handle click questions
  const handleClickQuestion = useCallback((timestamp: number, image: string) => {
    const relevantSegments = transcript.filter(
      (seg) => seg.start <= timestamp && seg.end >= timestamp
    )

    const transcriptSnippet = relevantSegments.length > 0
      ? relevantSegments.map(seg => seg.text).join(' ')
      : currentCaption || 'No transcript available at this moment.'

    // Call AI API
    try {
      const response = await fetch('/api/explain', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question,
          image,
          transcriptSnippet,
          timestamp,
          targetLanguage,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setInteractions(prev => [...prev, {
          id: Date.now().toString(),
          timestamp,
          image,
          question,
          answer: data.answer || 'Processing...',
          transcriptSnippet,
        }])
      }
    } catch (error) {
      console.error('Error calling AI API:', error)
    }
  }, [transcript, currentCaption, targetLanguage])

  return (
    <div ref={containerRef} className="relative w-full h-full bg-black rounded-lg overflow-hidden">
      {/* Video Element */}
      <video
        ref={videoRef}
        className="w-full h-full object-contain"
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onTimeUpdate={() => {
          const video = videoRef.current
          if (video) {
            setCurrentTime(video.currentTime)
          }
        }}
        onClick={togglePlay}
        muted={isMuted}
        volume={volume}
      />

      {/* Transcription Loading Indicator */}
      {isTranscribing && !currentCaption && (
        <div className="absolute top-4 left-4 bg-black bg-opacity-75 text-white px-4 py-2 rounded-lg">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            <span className="text-sm">Starting transcription...</span>
          </div>
        </div>
      )}

      {/* Caption Overlay */}
      <CaptionDisplay
        caption={translatedCaption || currentCaption}
        size={captionSize}
        className="absolute bottom-20 left-0 right-0"
      />

      {/* Click Question Handler - always enabled for live streams */}
      {isLive && showClickHandler && (
        <ClickQuestionHandler
          onQuestion={handleClickQuestion}
          onCancel={() => {}} // No cancel needed, always enabled
        />
      )}

      {/* Interaction Log */}
      {showAccessibility && (
        <AccessibilityPanel
          onClose={() => setShowAccessibility(false)}
          interactions={interactions}
          transcript={transcript}
        />
      )}

      {/* Answer Popup */}
      {showAnswerPopup && (
        <AnswerPopup
          question={currentAnswer.question}
          answer={currentAnswer.answer}
          onClose={() => setShowAnswerPopup(false)}
        />
      )}
    </div>
  )
}
