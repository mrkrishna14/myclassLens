'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Play, Pause, Volume2, VolumeX, Settings, Maximize, Minimize } from 'lucide-react'
import BoundingBoxDrawer from './BoundingBoxDrawer'
import InteractionLog from './InteractionLog'
import CaptionDisplay from './CaptionDisplay'
import AccessibilityPanel from './AccessibilityPanel'
import QuestionPanel from './QuestionPanel'
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
  videoUrl: string
  videoFile: File
  captionLanguage: string
  targetLanguage: string
}

export default function VideoPlayer({
  videoUrl,
  videoFile,
  captionLanguage,
  targetLanguage,
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
  const [showBoundingBox, setShowBoundingBox] = useState(false)
  const [boundingBox, setBoundingBox] = useState<{ x: number; y: number; width: number; height: number } | null>(null)
  const [showQuestionPanel, setShowQuestionPanel] = useState(false)
  const [interactions, setInteractions] = useState<Interaction[]>([])
  const [currentCaption, setCurrentCaption] = useState('')
  const [transcript, setTranscript] = useState<Array<{ start: number; end: number; text: string }>>([])
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [showAccessibility, setShowAccessibility] = useState(false)
  const [playbackRate, setPlaybackRate] = useState(1)
  const [captionSize, setCaptionSize] = useState<'small' | 'medium' | 'large'>('medium')
  const [showAnswerPopup, setShowAnswerPopup] = useState(false)
  const [currentAnswer, setCurrentAnswer] = useState({ question: '', answer: '' })

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const updateTime = () => setCurrentTime(video.currentTime)
    const updateDuration = () => setDuration(video.duration)
    const handlePlay = () => {
      setIsPlaying(true)
      setIsPaused(false)
    }
    const handlePause = () => {
      setIsPlaying(false)
      setIsPaused(true)
    }

    video.addEventListener('timeupdate', updateTime)
    video.addEventListener('loadedmetadata', updateDuration)
    video.addEventListener('play', handlePlay)
    video.addEventListener('pause', handlePause)

    return () => {
      video.removeEventListener('timeupdate', updateTime)
      video.removeEventListener('loadedmetadata', updateDuration)
      video.removeEventListener('play', handlePlay)
      video.removeEventListener('pause', handlePause)
    }
  }, [])

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = playbackRate
    }
  }, [playbackRate])

  // Transcribe video on load
  useEffect(() => {
    const transcribeVideo = async () => {
      if (!videoFile || isTranscribing) return
      
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

    if (videoFile && duration > 0) {
      transcribeVideo()
    }
  }, [videoFile, captionLanguage, duration])

  // Update captions based on current time
  useEffect(() => {
    if (transcript.length === 0) {
      console.log('No transcript segments available yet')
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
  }, [transcript, currentCaption])

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

  const handlePauseForQuestion = () => {
    if (videoRef.current && isPlaying) {
      videoRef.current.pause()
    }
    setShowBoundingBox(true)
  }

  const handleBoundingBoxComplete = (box: { x: number; y: number; width: number; height: number }) => {
    setBoundingBox(box)
    setShowBoundingBox(false)
    setShowQuestionPanel(true)
  }

  const handleQuestionSubmit = async (question: string) => {
    if (!boundingBox || !videoRef.current || !containerRef.current) return

    const video = videoRef.current
    const container = containerRef.current
    
    // Get container and video element positions
    const containerRect = container.getBoundingClientRect()
    const videoRect = video.getBoundingClientRect()
    
    // Calculate video offset within container (for letterboxing/pillarboxing)
    const videoOffsetX = videoRect.left - containerRect.left
    const videoOffsetY = videoRect.top - containerRect.top
    
    // Get the video element's display dimensions (actual rendered size)
    const videoDisplayWidth = videoRect.width
    const videoDisplayHeight = videoRect.height
    
    // Get the video's actual dimensions (native resolution)
    const videoActualWidth = video.videoWidth
    const videoActualHeight = video.videoHeight
    
    console.log('Container rect:', containerRect)
    console.log('Video rect:', videoRect)
    console.log('Video offset:', videoOffsetX, videoOffsetY)
    console.log('Display dimensions:', videoDisplayWidth, 'x', videoDisplayHeight)
    console.log('Actual video dimensions:', videoActualWidth, 'x', videoActualHeight)
    console.log('Bounding box (container coords):', boundingBox)
    
    // Adjust bounding box coordinates relative to video element (not container)
    const adjustedBox = {
      x: boundingBox.x - videoOffsetX,
      y: boundingBox.y - videoOffsetY,
      width: boundingBox.width,
      height: boundingBox.height
    }
    
    console.log('Adjusted box (video display coords):', adjustedBox)
    
    // Clamp to video boundaries
    adjustedBox.x = Math.max(0, Math.min(adjustedBox.x, videoDisplayWidth))
    adjustedBox.y = Math.max(0, Math.min(adjustedBox.y, videoDisplayHeight))
    adjustedBox.width = Math.min(adjustedBox.width, videoDisplayWidth - adjustedBox.x)
    adjustedBox.height = Math.min(adjustedBox.height, videoDisplayHeight - adjustedBox.y)
    
    // Calculate scaling factors from display to actual video dimensions
    const scaleX = videoActualWidth / videoDisplayWidth
    const scaleY = videoActualHeight / videoDisplayHeight
    
    console.log('Scale factors:', scaleX, scaleY)
    
    // Scale bounding box coordinates to actual video dimensions
    const scaledBox = {
      x: adjustedBox.x * scaleX,
      y: adjustedBox.y * scaleY,
      width: adjustedBox.width * scaleX,
      height: adjustedBox.height * scaleY
    }
    
    console.log('Scaled bounding box (video native coords):', scaledBox)
    
    // Capture screenshot of the bounding box area using scaled coordinates
    const canvas = document.createElement('canvas')
    canvas.width = scaledBox.width
    canvas.height = scaledBox.height
    const ctx = canvas.getContext('2d')
    
    if (ctx) {
      ctx.drawImage(
        video,
        scaledBox.x,
        scaledBox.y,
        scaledBox.width,
        scaledBox.height,
        0,
        0,
        scaledBox.width,
        scaledBox.height
      )
    }

    const imageData = canvas.toDataURL('image/png')
    console.log('Captured image data length:', imageData.length)
    console.log('Image data prefix:', imageData.substring(0, 50))
    
    const timestamp = video.currentTime

    // Get transcript snippet from current time with context (30 seconds before and after)
    const contextWindow = 30 // seconds
    const relevantSegments = transcript.filter(
      (seg) => seg.start >= timestamp - contextWindow && seg.start <= timestamp + contextWindow
    )
    
    const transcriptSnippet = relevantSegments.length > 0
      ? relevantSegments.map(seg => seg.text).join(' ')
      : currentCaption || 'No transcript available at this moment.'
    
    console.log('Transcript context:', transcriptSnippet.substring(0, 200) + '...')
    console.log('Number of segments in context:', relevantSegments.length)

    // Call AI API
    console.log('Sending request to /api/explain...')
    console.log('Question:', question)
    console.log('Image size:', Math.round(imageData.length / 1024), 'KB')
    
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
      
      console.log('API response status:', response.status)

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
      setShowQuestionPanel(false)
      setBoundingBox(null)
      
      // Show answer popup
      setCurrentAnswer({ question, answer: data.explanation })
      setShowAnswerPopup(true)
    } catch (error) {
      console.error('Error getting explanation:', error)
      alert('Failed to get explanation. Please try again.')
    }
  }

  const handleJumpToTimestamp = (timestamp: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = timestamp
      setCurrentTime(timestamp)
    }
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
          />

          {/* Transcription Loading Indicator */}
          {isTranscribing && (
            <div className="absolute top-4 left-4 bg-black bg-opacity-75 text-white px-4 py-2 rounded-lg">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span className="text-sm">Transcribing video...</span>
              </div>
            </div>
          )}

          {/* Caption Overlay */}
          <CaptionDisplay
            caption={currentCaption}
            size={captionSize}
            className="absolute bottom-20 left-0 right-0"
          />

          {/* Bounding Box Drawer */}
          {showBoundingBox && isPaused && (
            <BoundingBoxDrawer
              onComplete={handleBoundingBoxComplete}
              onCancel={() => {
                setShowBoundingBox(false)
                setBoundingBox(null)
              }}
            />
          )}

          {/* Question Panel */}
          {showQuestionPanel && boundingBox && (
            <QuestionPanel
              onSubmit={handleQuestionSubmit}
              onCancel={() => {
                setShowQuestionPanel(false)
                setBoundingBox(null)
              }}
            />
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
                max={duration}
                step="0.1"
                value={currentTime}
                onChange={handleSeek}
                className="w-full"
              />
            </div>

            <span className="text-white text-sm">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>

            <button
              onClick={handlePauseForQuestion}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 active:bg-primary-800 transition-colors text-sm font-semibold shadow-md hover:shadow-lg"
            >
              Ask Question
            </button>

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
