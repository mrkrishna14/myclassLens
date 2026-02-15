'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Play, Pause, Maximize, Minimize, X, Sparkles } from 'lucide-react'
import BoundingBoxDrawer from './BoundingBoxDrawer'
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
  aiLanguage?: string
  isLive?: boolean
  externalCaption?: string
  disableInternalTranscription?: boolean
}

export default function VideoPlayer({
  videoUrl,
  videoFile,
  liveStream,
  captionLanguage,
  targetLanguage,
  aiLanguage,
  isLive = false,
  externalCaption = '',
  disableInternalTranscription = false,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isPaused, setIsPaused] = useState(true)
  const [showBoundingBoxDrawer, setShowBoundingBoxDrawer] = useState(false)
  const [drawnBox, setDrawnBox] = useState<{ x: number; y: number; width: number; height: number } | null>(null)
  const [showQuestionPanel, setShowQuestionPanel] = useState(false)
  const [interactions, setInteractions] = useState<Interaction[]>([])
  const [currentCaption, setCurrentCaption] = useState('')
  const [translatedCaption, setTranslatedCaption] = useState('')
  const [transcript, setTranscript] = useState<Array<{ start: number; end: number; text: string }>>([])
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [isTranslating, setIsTranslating] = useState(false)
  const [captionSize, setCaptionSize] = useState<'small' | 'medium' | 'large'>('medium')
  const [showAnswerPopup, setShowAnswerPopup] = useState(false)
  const [currentAnswer, setCurrentAnswer] = useState({ question: '', answer: '' })
  const [sessionStartTime, setSessionStartTime] = useState<number>(0)
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const transcriptHistoryRef = useRef<Array<{ start: number; end: number; text: string }>>([])
  const lastInterimTranslateAtRef = useRef(0)
  const abortTranslateRef = useRef<AbortController | null>(null)
  
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

  // Real-time translation function (only for live streams)
  const translateText = async (
    text: string,
    from: string,
    to: string,
    interruptSpeech: boolean = false
  ) => {
    console.log('🔄 translateText START:', { text: text.slice(0, 30), from, to, isLive })
    
    // Only translate for live streams when languages differ
    if (!isLive) {
      console.log('⚠️ Not translating: not live')
      setTranslatedCaption(text)
      return
    }
    if (!text.trim()) {
      console.log('⚠️ Not translating: empty text')
      return
    }
    if (from === to) {
      console.log('⚠️ Not translating: same language')
      setTranslatedCaption(text)
      return
    }

    console.log('✅ Conditions met, calling translation API...')
    setIsTranslating(true)
    try {
      if (abortTranslateRef.current) {
        abortTranslateRef.current.abort()
      }
      abortTranslateRef.current = new AbortController()
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text, sourceLanguage: from, targetLanguage: to }),
        signal: abortTranslateRef.current.signal,
      })

      if (response.ok) {
        const data = await response.json()
        console.log('✅ Translation success:', data.translatedText?.slice(0, 50))
        setTranslatedCaption(data.translatedText)
      } else {
        console.error('❌ Translation API error:', response.statusText)
        setTranslatedCaption(text) // Fallback to original text
      }
    } catch (error) {
      if ((error as any)?.name === 'AbortError') {
        console.log('⚠️ Translation aborted')
        return
      }
      console.error('❌ Translation error:', error)
      setTranslatedCaption(text) // Fallback to original text
    } finally {
      setIsTranslating(false)
    }
  }


  // Setup video element with stream or URL (only run when stream/URL changes)
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    if (isLive && liveStream) {
      // Only set stream if it's different
      if (video.srcObject !== liveStream) {
        video.srcObject = liveStream
        setSessionStartTime(Date.now())
      }
      // Only play if not already playing
      if (video.paused) {
        video.play().catch(err => {
          console.error('Error playing video:', err)
        })
      }
      setIsPlaying(true)
      setIsPaused(false)
    } else if (videoUrl && !isLive) {
      video.srcObject = null
      video.src = videoUrl
    }
  }, [isLive, liveStream, videoUrl]) // Removed sessionStartTime and currentTime from deps

  // Time tracking and event listeners (separate effect)
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const updateTime = () => {
      if (isLive && sessionStartTime > 0) {
        // For live streams, calculate elapsed time
        const elapsed = (Date.now() - sessionStartTime) / 1000
        setCurrentTime(elapsed)
        setDuration(elapsed) // Duration increases as stream continues
      } else if (!isLive) {
        setCurrentTime(video.currentTime)
      }
    }
    
    const updateDuration = () => {
      if (!isLive) {
        setDuration(video.duration)
      }
    }
    
    const handlePlay = () => {
      setIsPlaying(true)
      setIsPaused(false)
    }
    
    const handlePause = () => {
      setIsPlaying(false)
      setIsPaused(true)
    }

    const timeInterval = setInterval(updateTime, 500) // Further reduced frequency to reduce lag
    video.addEventListener('loadedmetadata', updateDuration)
    video.addEventListener('play', handlePlay)
    video.addEventListener('pause', handlePause)

    return () => {
      clearInterval(timeInterval)
      video.removeEventListener('loadedmetadata', updateDuration)
      video.removeEventListener('play', handlePlay)
      video.removeEventListener('pause', handlePause)
    }
  }, [isLive, sessionStartTime]) // Only depend on isLive and sessionStartTime


  // Track fullscreen state changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
    }
  }, [])

  // Use external caption when provided (phone always sends English)
  useEffect(() => {
    if (externalCaption) {
      console.log('📝 External caption:', externalCaption.slice(0, 50))
      console.log('🌍 Target language:', targetLanguage, 'isLive:', isLive)
      setCurrentCaption(externalCaption)
      // Phone always transcribes in English, translate to target language
      if (targetLanguage !== 'en') {
        console.log('🔄 Calling translateText from en to', targetLanguage)
        translateText(externalCaption, 'en', targetLanguage)
      } else {
        // English target, just set the caption
        console.log('✅ No translation needed (English)')
        setTranslatedCaption(externalCaption)
      }
    }
  }, [externalCaption, targetLanguage])

  // Start transcription for live streams
  useEffect(() => {
    if (!isLive || !liveStream || disableInternalTranscription) {
      setIsTranscribing(false)
      return
    }

    // Wait a bit for stream to be fully ready
    const startTranscription = () => {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      if (!SpeechRecognition) {
        console.warn('Web Speech API not supported. Real-time transcription unavailable.')
        setCurrentCaption('Real-time transcription not supported in this browser')
        setIsTranscribing(false)
        return
      }

      console.log('Starting real-time transcription...')
      const recognition = new SpeechRecognition()
      recognition.continuous = true
      recognition.interimResults = true
      recognition.maxAlternatives = 1
      
      // Use proper BCP-47 language code for Web Speech API
      const speechLang = getSpeechRecognitionLang(captionLanguage)
      recognition.lang = speechLang
      console.log('🎤 Transcription language set to:', speechLang, '(from:', captionLanguage, ')')
      
      // Optimize for speed and accuracy
      recognition.serviceURI = 'builtin:speech/dictation' // Use built-in for faster response

      let segmentStartTime = sessionStartTime > 0 ? sessionStartTime : Date.now()

      // Optimize for real-time performance - reduce throttling
      let lastUpdateTime = 0
      const updateThrottle = 50 // Update every 50ms for near real-time response
      
      recognition.onresult = (event: any) => {
        const now = Date.now()
        const lastResult = event.results[event.results.length - 1]
        const isFinal = lastResult?.isFinal
        
        // Process all results quickly, only throttle if too frequent
        if (now - lastUpdateTime < updateThrottle && !isFinal) {
          return
        }
        lastUpdateTime = now
        
        let interimTranscript = ''
        let finalTranscript = ''

        // Process all results from this event
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript
          if (event.results[i].isFinal) {
            finalTranscript += transcript + ' '
          } else {
            interimTranscript += transcript
          }
        }

        // Show interim results immediately for real-time feel
        if (interimTranscript.trim()) {
          const interimText = interimTranscript.trim()
          setCurrentCaption(interimText)
          // Translate/speak interim text on a throttle to approximate word-by-word
          const interimThrottleMs = 2000
          if (now - lastInterimTranslateAtRef.current >= interimThrottleMs) {
            lastInterimTranslateAtRef.current = now
            translateText(interimText, captionLanguage, targetLanguage)
          }
        }
        
        // Process final results
        if (finalTranscript.trim()) {
          const finalText = finalTranscript.trim()
          setCurrentCaption(finalText)
          // Only translate final results to reduce API calls and avoid rate limiting
          // Only update caption translation; speaking is driven by translatedCaption delta effect
          translateText(finalText, captionLanguage, targetLanguage)
          
          // Store final transcript segment
          const segmentEndTime = Date.now()
          const currentSessionStart = sessionStartTime > 0 ? sessionStartTime : segmentStartTime
          const startSeconds = (segmentStartTime - currentSessionStart) / 1000
          const endSeconds = (segmentEndTime - currentSessionStart) / 1000
          
          const newSegment = {
            start: Math.max(0, startSeconds),
            end: Math.max(0, endSeconds),
            text: finalText
          }
          
          transcriptHistoryRef.current.push(newSegment)
          setTranscript(prev => [...transcriptHistoryRef.current])
          segmentStartTime = segmentEndTime
        }
      }

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error)
        if (event.error === 'no-speech') {
          // This is normal, just continue - don't show error
          return
        }
        if (event.error === 'not-allowed') {
          setCurrentCaption('⚠️ Microphone permission denied. Please allow microphone access in browser settings.')
          setIsTranscribing(false)
          return
        }
        if (event.error === 'audio-capture') {
          setCurrentCaption('⚠️ No microphone found. Please check your audio settings.')
          setIsTranscribing(false)
          return
        }
        if (event.error !== 'aborted' && event.error !== 'network') {
          console.warn('Transcription error:', event.error)
          // Don't show error message for minor issues
        }
      }

      recognition.onstart = () => {
        console.log('✅ Speech recognition started successfully')
        setIsTranscribing(true)
        // Clear any error messages when recognition starts
        setCurrentCaption((prev) => {
          if (prev.startsWith('⚠️') || prev.includes('Error') || prev.includes('permission')) {
            return ''
          }
          return prev
        })
      }

      recognition.onend = () => {
        console.log('Speech recognition ended')
        // Restart recognition if stream is still active
        if (isLive && liveStream && liveStream.active) {
          setTimeout(() => {
            try {
              recognition.start()
            } catch (e: any) {
              if (e.name !== 'InvalidStateError') {
                console.log('Recognition restart error:', e)
              }
            }
          }, 100)
        } else {
          setIsTranscribing(false)
        }
      }

      // Start recognition - Web Speech API uses system microphone
      // For Continuity Camera, audio should come through Mac's microphone input
      // Check if audio track exists in stream
      const audioTracks = liveStream.getAudioTracks()
      console.log('Audio tracks in stream:', audioTracks.length)
      if (audioTracks.length > 0) {
        console.log('Audio track label:', audioTracks[0].label)
        console.log('Audio track enabled:', audioTracks[0].enabled)
        console.log('Audio track muted:', audioTracks[0].muted)
        // Ensure audio track is enabled
        audioTracks[0].enabled = true
      } else {
        console.warn('No audio tracks found in stream!')
        setCurrentCaption('No audio detected in stream. Please check your microphone settings.')
      }
      
      try {
        recognition.start()
        recognitionRef.current = recognition
        console.log('Speech recognition initiated')
      } catch (err: any) {
        console.error('Error starting recognition:', err)
        if (err.name === 'NotAllowedError') {
          setCurrentCaption('Microphone permission denied. Please allow microphone access in browser settings.')
        } else {
          setCurrentCaption('Error starting transcription. Please check microphone permissions.')
        }
        setIsTranscribing(false)
      }
    }

    // Small delay to ensure stream is ready
    const timeout = setTimeout(startTranscription, 300)

    return () => {
      clearTimeout(timeout)
      console.log('Cleaning up speech recognition')
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop()
        } catch (e) {
          // Ignore errors when stopping
        }
        recognitionRef.current = null
      }
      setIsTranscribing(false)
    }
  }, [isLive, liveStream, captionLanguage, sessionStartTime]) // Removed currentCaption from deps to prevent re-renders

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

        console.log('Transcription response status:', response.status)
        const data = await response.json()
        console.log('Transcription response data:', data)

        if (response.ok) {
          // Store transcript segments for time-synced captions
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
        setCurrentCaption('Transcription unavailable')
      } finally {
        setIsTranscribing(false)
      }
    }

    if (videoFile && duration > 0 && !isLive) {
      transcribeVideo()
    }
  }, [videoFile, captionLanguage, duration, isLive])

  // Update captions based on current time (for uploaded videos only)
  useEffect(() => {
    if (isLive || transcript.length === 0) {
      return
    }

    console.log(`Transcript loaded with ${transcript.length} segments`)

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

    // Update immediately
    updateCaption()
    
    const interval = setInterval(updateCaption, 100)
    return () => clearInterval(interval)
  }, [transcript, currentCaption, isLive])

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause()
      } else {
        videoRef.current.play()
      }
    }
  }


  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isLive) return // Can't seek in live streams
    const newTime = parseFloat(e.target.value)
    if (videoRef.current) {
      videoRef.current.currentTime = newTime
      setCurrentTime(newTime)
    }
  }

  const toggleFullscreen = async () => {
    if (!containerRef.current) return

    if (!isFullscreen) {
      try {
        await containerRef.current.requestFullscreen()
        setIsFullscreen(true)
      } catch (err) {
        console.error('Failed to enter fullscreen:', err)
      }
    } else {
      try {
        if (document.fullscreenElement) {
          await document.exitFullscreen()
        }
        setIsFullscreen(false)
      } catch (err) {
        console.error('Failed to exit fullscreen:', err)
      }
    }
  }

  // Double-click is always enabled, no button needed

  const handleBoxQuestion = async (box: { x: number; y: number; width: number; height: number }, question: string) => {
    if (!videoRef.current || !containerRef.current) return

    const video = videoRef.current
    const container = containerRef.current
    
    // Get container and video element positions
    const containerRect = container.getBoundingClientRect()
    const videoRect = video.getBoundingClientRect()
    
    // Calculate video offset within container
    const videoOffsetX = videoRect.left - containerRect.left
    const videoOffsetY = videoRect.top - containerRect.top
    
    // Get dimensions
    const videoDisplayWidth = videoRect.width
    const videoDisplayHeight = videoRect.height
    const videoActualWidth = video.videoWidth
    const videoActualHeight = video.videoHeight
    
    // Calculate center of the bounding box
    const boxCenterX = box.x + box.width / 2
    const boxCenterY = box.y + box.height / 2
    
    // Adjust box center position relative to video element
    const adjustedX = boxCenterX - videoOffsetX
    const adjustedY = boxCenterY - videoOffsetY
    
    // Clamp to video boundaries
    const clampedX = Math.max(0, Math.min(adjustedX, videoDisplayWidth))
    const clampedY = Math.max(0, Math.min(adjustedY, videoDisplayHeight))
    
    // Calculate scaling factors
    const scaleX = videoActualWidth / videoDisplayWidth
    const scaleY = videoActualHeight / videoDisplayHeight
    
    // Scale box center position to actual video dimensions
    const scaledX = clampedX * scaleX
    const scaledY = clampedY * scaleY
    
    // Calculate the box dimensions in actual video coordinates
    const scaledBoxWidth = box.width * scaleX
    const scaledBoxHeight = box.height * scaleY
    
    // Calculate the box position in actual video coordinates
    const scaledBoxX = Math.max(0, Math.min((box.x - videoOffsetX) * scaleX, videoActualWidth - scaledBoxWidth))
    const scaledBoxY = Math.max(0, Math.min((box.y - videoOffsetY) * scaleY, videoActualHeight - scaledBoxHeight))
    
    // Capture screenshot of the exact bounding box area
    const canvas = document.createElement('canvas')
    canvas.width = scaledBoxWidth
    canvas.height = scaledBoxHeight
    const ctx = canvas.getContext('2d')
    
    if (ctx) {
      ctx.drawImage(
        video,
        scaledBoxX,
        scaledBoxY,
        scaledBoxWidth,
        scaledBoxHeight,
        0,
        0,
        scaledBoxWidth,
        scaledBoxHeight
      )
    }

    const imageData = canvas.toDataURL('image/png')
    
    const timestamp = isLive ? currentTime : video.currentTime

    // Get transcript snippet from current time with context
    const contextWindow = 30 // seconds
    const relevantSegments = transcript.filter(
      (seg) => seg.start >= timestamp - contextWindow && seg.start <= timestamp + contextWindow
    )
    
    const transcriptSnippet = relevantSegments.length > 0
      ? relevantSegments.map(seg => seg.text).join(' ')
      : currentCaption || 'No transcript available at this moment.'

    // Call AI API
    try {
      const response = await fetch('/api/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: imageData,
          question,
          transcriptSnippet,
          timestamp,
          targetLanguage: aiLanguage || targetLanguage,
        }),
      })

      const data = await response.json()
      
      if (data.error) {
        throw new Error(data.error)
      }

      const newInteraction: Interaction = {
        id: Date.now().toString(),
        timestamp,
        image: imageData,
        question,
        answer: data.explanation,
        transcriptSnippet,
      }

      setInteractions([...interactions, newInteraction])
      setShowBoundingBoxDrawer(true)
      setDrawnBox(null)
      
      // Show answer popup
      setCurrentAnswer({ question, answer: data.explanation })
      setShowAnswerPopup(true)
    } catch (error) {
      console.error('Error getting explanation:', error)
      alert('Failed to get explanation. Please try again.')
    }
  }

  const handleJumpToTimestamp = (timestamp: number) => {
    if (isLive || !videoRef.current) return // Can't jump in live streams
      videoRef.current.currentTime = timestamp
      setCurrentTime(timestamp)
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="flex h-screen bg-gray-900">
      {/* Main Video Area */}
      <div className="flex-1 flex flex-col">
        <div
          ref={containerRef}
          className="relative flex-1 bg-black flex items-center justify-center"
        >
          <video
            ref={videoRef}
            src={videoUrl}
            className="max-w-full max-h-full"
            onClick={togglePlay}
            autoPlay={isLive}
            playsInline
            muted={isLive}
            onLoadedMetadata={() => {
              if (isLive && videoRef.current) {
                console.log('Live video metadata loaded')
              }
            }}
            onCanPlay={() => {
              if (isLive && videoRef.current && videoRef.current.paused) {
                videoRef.current.play().catch(err => {
                  console.error('Auto-play prevented:', err)
                })
              }
            }}
          />

          {/* Transcription Loading Indicator - only show if actually transcribing */}
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
            caption={isLive ? (translatedCaption || currentCaption) : currentCaption}
            size={captionSize}
            className="absolute bottom-20 left-0 right-0"
          />

          {/* Box Question Handler - always enabled for live streams */}
          {isLive && showBoundingBoxDrawer && (
            <BoundingBoxDrawer
              onComplete={(box) => {
                setDrawnBox(box)
                setShowBoundingBoxDrawer(false)
                setShowQuestionPanel(true)
              }}
              onCancel={() => {
                setShowBoundingBoxDrawer(false)
              }}
            />
          )}

          {/* Question Panel */}
          {showQuestionPanel && drawnBox && (
            <div
              className="absolute bg-white rounded-xl shadow-2xl p-5 z-20 min-w-[300px] max-w-sm border border-gray-200 transform transition-all duration-200 backdrop-blur-xl"
              style={{
                left: `${Math.min(drawnBox.x + 20, window.innerWidth - 320)}px`,
                top: `${Math.min(drawnBox.y + 20, window.innerHeight - 280)}px`,
              }}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                  <h3 className="text-base font-semibold text-gray-900">Ask about this</h3>
                </div>
                <button
                  onClick={() => {
                    setShowQuestionPanel(false)
                    setDrawnBox(null)
                    setShowBoundingBoxDrawer(true)
                  }}
                  className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4 text-gray-600" />
                </button>
              </div>

              <div className="space-y-3">
                <button
                  onClick={() => {
                    handleBoxQuestion(drawnBox, 'Explain this')
                    setShowQuestionPanel(false)
                    setDrawnBox(null)
                  }}
                  className="w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 font-semibold flex items-center justify-center gap-2 shadow-md hover:shadow-lg transform hover:scale-105"
                >
                  <Sparkles className="w-4 h-4" />
                  Explain this
                </button>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-3 bg-white text-gray-500 font-medium">or ask anything</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <input
                    type="text"
                    id="custom-question-input"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && (e.target as HTMLInputElement).value.trim()) {
                        handleBoxQuestion(drawnBox, (e.target as HTMLInputElement).value.trim())
                        setShowQuestionPanel(false)
                        setDrawnBox(null)
                      }
                    }}
                    placeholder="What do you want to know?"
                    className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-sm"
                    autoFocus
                  />
                  <button
                    onClick={() => {
                      const input = document.getElementById('custom-question-input') as HTMLInputElement
                      if (input && input.value.trim()) {
                        handleBoxQuestion(drawnBox, input.value.trim())
                        setShowQuestionPanel(false)
                        setDrawnBox(null)
                      }
                    }}
                    className="w-full px-4 py-2.5 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-all duration-200 font-medium"
                  >
                    Ask
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Hint bubble for box drawing */}
          {isLive && (
            <div className="absolute top-4 right-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-5 py-3 rounded-xl shadow-2xl z-30 border border-blue-400 backdrop-blur-sm transform transition-all duration-300 hover:scale-105">
              <p className="text-sm font-semibold flex items-center gap-2">
                <span className="text-lg">✨</span>
                Draw a box to ask questions
              </p>
            </div>
          )}

          {/* Answer Popup - positioned absolutely to show in fullscreen */}
          {showAnswerPopup && (
            <AnswerPopup
              question={currentAnswer.question}
              answer={currentAnswer.answer}
              onClose={() => setShowAnswerPopup(false)}
            />
          )}

          {/* Video Controls - positioned absolutely to show in fullscreen */}
          <div className="absolute bottom-0 left-0 right-0 bg-gray-800 p-4">
          <div className="flex items-center gap-4 mb-2">
            <button
              onClick={togglePlay}
              className="p-2 hover:bg-gray-700 rounded transition-colors"
            >
              {isPlaying ? (
                <Pause className="w-5 h-5 text-white" />
              ) : (
                <Play className="w-5 h-5 text-white" />
              )}
            </button>

            {isLive && (
              <button
                onClick={() => setShowBoundingBoxDrawer(!showBoundingBoxDrawer)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  showBoundingBoxDrawer
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                Draw Box
              </button>
            )}

            <div className="flex-1">
              <input
                type="range"
                min="0"
                max={duration || 100}
                step="0.1"
                value={currentTime}
                onChange={handleSeek}
                disabled={isLive}
                className="w-full disabled:opacity-50"
              />
            </div>

            <span className="text-white text-sm">
              {isLive ? (
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                  LIVE {formatTime(currentTime)}
                </span>
              ) : (
                `${formatTime(currentTime)} / ${formatTime(duration)}`
              )}
            </span>

            <button
              onClick={toggleFullscreen}
              className="p-2 hover:bg-gray-700 rounded transition-colors"
            >
              {isFullscreen ? (
                <Minimize className="w-5 h-5 text-white" />
              ) : (
                <Maximize className="w-5 h-5 text-white" />
              )}
            </button>
          </div>
          </div>
        </div>
      </div>

      {/* Interaction Log Sidebar */}
      <InteractionLog
        interactions={interactions}
        onJumpToTimestamp={handleJumpToTimestamp}
        currentTime={currentTime}
      />
    </div>
  )
}
