'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Play, Pause, Volume2, VolumeX, Settings, Maximize, Minimize } from 'lucide-react'
import BoundingBoxDrawer from './BoundingBoxDrawer'
import InteractionLog from './InteractionLog'
import CaptionDisplay from './CaptionDisplay'
import AccessibilityPanel from './AccessibilityPanel'
import QuestionPanel from './QuestionPanel'

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
      try {
        // OpenAI Whisper can handle video files directly
        const formData = new FormData()
        formData.append('audio', videoFile)
        formData.append('language', captionLanguage)

        const response = await fetch('/api/transcribe', {
          method: 'POST',
          body: formData,
        })

        if (response.ok) {
          const data = await response.json()
          // Store transcript segments for time-synced captions
          if (data.segments) {
            setTranscript(data.segments)
          } else if (data.text) {
            // Fallback: create a single segment if segments aren't available
            setTranscript([{
              start: 0,
              end: duration || 1000,
              text: data.text
            }])
          }
        }
      } catch (error) {
        console.error('Transcription error:', error)
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
    if (transcript.length === 0) return

    const updateCaption = () => {
      const current = videoRef.current?.currentTime || 0
      const segment = transcript.find(
        (seg) => seg.start <= current && seg.end >= current
      )
      setCurrentCaption(segment?.text || '')
    }

    const interval = setInterval(updateCaption, 100)
    return () => clearInterval(interval)
  }, [transcript])

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
    if (!boundingBox || !videoRef.current) return

    // Capture screenshot of the bounding box area
    const canvas = document.createElement('canvas')
    const video = videoRef.current
    canvas.width = boundingBox.width
    canvas.height = boundingBox.height
    const ctx = canvas.getContext('2d')
    
    if (ctx) {
      ctx.drawImage(
        video,
        boundingBox.x,
        boundingBox.y,
        boundingBox.width,
        boundingBox.height,
        0,
        0,
        boundingBox.width,
        boundingBox.height
      )
    }

    const imageData = canvas.toDataURL('image/png')
    const timestamp = video.currentTime

    // Get transcript snippet from current time
    const currentSegment = transcript.find(
      (seg) => seg.start <= timestamp && seg.end >= timestamp
    )
    const transcriptSnippet = currentSegment?.text || currentCaption || 'No transcript available at this moment.'

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
              className="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700 transition-colors text-sm"
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
    </div>
  )
}
