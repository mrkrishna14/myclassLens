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
  const [transcript, setTranscript] = useState<Array<{ start: number; end: number; text: string }>>([])
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [showAccessibility, setShowAccessibility] = useState(false)
  const [playbackRate, setPlaybackRate] = useState(1)
  const [captionSize, setCaptionSize] = useState<'small' | 'medium' | 'large'>('medium')
  const [showAnswerPopup, setShowAnswerPopup] = useState(false)
  const [currentAnswer, setCurrentAnswer] = useState({ question: '', answer: '' })
  const [sessionStartTime, setSessionStartTime] = useState<number>(0)
  const recognitionRef = useRef<SpeechRecognition | null>(null)
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
    }
    return langMap[langCode] || langCode || 'en-US'
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

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = playbackRate
    }
  }, [playbackRate])

  // Real-time transcription for live streams using Web Speech API
  useEffect(() => {
    if (!isLive || !liveStream) {
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
      
      // Use proper BCP-47 language code for Web Speech API
      const speechLang = getSpeechRecognitionLang(captionLanguage)
      recognition.lang = speechLang
      console.log('Transcription language set to:', speechLang, '(from:', captionLanguage, ')')

      let segmentStartTime = sessionStartTime > 0 ? sessionStartTime : Date.now()

      // Throttle caption updates to reduce lag
      let lastUpdateTime = 0
      const updateThrottle = 200 // Update at most every 200ms to reduce lag
      
      recognition.onresult = (event: any) => {
        const now = Date.now()
        const lastResult = event.results[event.results.length - 1]
        const isFinal = lastResult?.isFinal
        
        // Always process final results, throttle interim results
        if (!isFinal && now - lastUpdateTime < updateThrottle) {
          return
        }
        lastUpdateTime = now
        
        let interimTranscript = ''
        let finalTranscript = ''

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript
          if (event.results[i].isFinal) {
            finalTranscript += transcript + ' '
          } else {
            interimTranscript += transcript
          }
        }

        // Update current caption with interim or final results
        // Show interim results immediately for real-time feel
        if (interimTranscript) {
          setCurrentCaption(interimTranscript)
        }
        
        // When we have final results, update and store
        if (finalTranscript) {
          const finalText = finalTranscript.trim()
          setCurrentCaption(finalText)
          
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
          // Use functional update to avoid dependency issues
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

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted
      setIsMuted(!isMuted)
    }
  }

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value)
    if (videoRef.current) {
      videoRef.current.volume = newVolume
      setVolume(newVolume)
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

  const toggleFullscreen = () => {
    if (!containerRef.current) return

    if (!isFullscreen) {
      containerRef.current.requestFullscreen()
      setIsFullscreen(true)
    } else {
      document.exitFullscreen()
      setIsFullscreen(false)
    }
  }

  // Double-click is always enabled, no button needed

  const handleClickQuestion = async (clickPos: { x: number; y: number }, question: string) => {
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
    
    // Adjust click position relative to video element
    const adjustedX = clickPos.x - videoOffsetX
    const adjustedY = clickPos.y - videoOffsetY
    
    // Clamp to video boundaries
    const clampedX = Math.max(0, Math.min(adjustedX, videoDisplayWidth))
    const clampedY = Math.max(0, Math.min(adjustedY, videoDisplayHeight))
    
    // Calculate scaling factors
    const scaleX = videoActualWidth / videoDisplayWidth
    const scaleY = videoActualHeight / videoDisplayHeight
    
    // Scale click position to actual video dimensions
    const scaledX = clampedX * scaleX
    const scaledY = clampedY * scaleY
    
    // Capture a region around the click point (e.g., 400x400 pixels)
    const captureSize = 400
    const captureWidth = Math.min(captureSize, videoActualWidth)
    const captureHeight = Math.min(captureSize, videoActualHeight)
    
    // Center the capture around the click point
    const captureX = Math.max(0, Math.min(scaledX - captureWidth / 2, videoActualWidth - captureWidth))
    const captureY = Math.max(0, Math.min(scaledY - captureHeight / 2, videoActualHeight - captureHeight))
    
    // Capture screenshot of the area around click point
    const canvas = document.createElement('canvas')
    canvas.width = captureWidth
    canvas.height = captureHeight
    const ctx = canvas.getContext('2d')
    
    if (ctx) {
      ctx.drawImage(
        video,
        captureX,
        captureY,
        captureWidth,
        captureHeight,
        0,
        0,
        captureWidth,
        captureHeight
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
          targetLanguage,
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
      setShowClickHandler(false)
      
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
            muted={isLive && isMuted}
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
            caption={currentCaption}
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

          {/* Hint bubble for double-click */}
          {isLive && (
            <div className="absolute top-4 right-4 bg-gradient-to-r from-primary-600 to-primary-700 text-white px-5 py-3 rounded-lg shadow-xl z-30 border-2 border-primary-400">
              <p className="text-sm font-semibold flex items-center gap-2">
                <span className="text-lg">💡</span>
                Double-click anywhere to ask questions
              </p>
            </div>
          )}
        </div>

        {/* Video Controls */}
        <div className="bg-gray-800 p-4">
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

            <button
              onClick={toggleMute}
              className="p-2 hover:bg-gray-700 rounded transition-colors"
            >
              {isMuted ? (
                <VolumeX className="w-5 h-5 text-white" />
              ) : (
                <Volume2 className="w-5 h-5 text-white" />
              )}
            </button>

            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={volume}
              onChange={handleVolumeChange}
              className="w-24"
            />

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
              onClick={() => setShowAccessibility(!showAccessibility)}
              className="p-2 hover:bg-gray-700 rounded transition-colors"
            >
              <Settings className="w-5 h-5 text-white" />
            </button>

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

        {/* Accessibility Panel */}
        {showAccessibility && (
          <AccessibilityPanel
            playbackRate={playbackRate}
            onPlaybackRateChange={setPlaybackRate}
            captionSize={captionSize}
            onCaptionSizeChange={setCaptionSize}
            onClose={() => setShowAccessibility(false)}
          />
        )}
      </div>

      {/* Interaction Log Sidebar */}
      <InteractionLog
        interactions={interactions}
        onJumpToTimestamp={handleJumpToTimestamp}
        currentTime={currentTime}
      />

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
