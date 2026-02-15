'use client'

import { useState, useRef, useEffect } from 'react'
import VideoPlayer from '@/components/VideoPlayer'
import { ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'

const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'zh', name: 'Chinese' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'ar', name: 'Arabic' },
  { code: 'hi', name: 'Hindi' },
]

export default function LiveViewerPage() {
  const router = useRouter()
  const [liveStream, setLiveStream] = useState<MediaStream | null>(null)
  
  // Get language settings from URL params (initialize with defaults)
  const [selectedCaptionLang, setSelectedCaptionLang] = useState('en')
  const [selectedTargetLang, setSelectedTargetLang] = useState('en')
  const [selectedAILang, setSelectedAILang] = useState('en')

  // Read URL params after mount on client side
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const captionLang = params.get('captionLang') || 'en'
      const aiLang = params.get('aiLang') || 'en'
      console.log('🌍 URL params loaded:', { captionLang, aiLang })
      setSelectedCaptionLang(captionLang)
      setSelectedTargetLang(captionLang)
      setSelectedAILang(aiLang)
    }
  }, [])
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState('')
  const [currentCaption, setCurrentCaption] = useState('')
  const [showSettings, setShowSettings] = useState(false)
  const [captionsEnabled, setCaptionsEnabled] = useState(true)
  const wsRef = useRef<WebSocket | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isConnectingRef = useRef(false)
  const pendingFrameRef = useRef<number[] | null>(null)
  const isRenderingRef = useRef(false)

  useEffect(() => {
    connectToStream()
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      if (wsRef.current) {
        wsRef.current.close()
        wsRef.current = null
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }
    }
  }, [])

  const connectToStream = async () => {
    if (isConnectingRef.current) {
      console.log('Already connecting, skipping...')
      return
    }
    
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      console.log('Already connected')
      return
    }

    try {
      isConnectingRef.current = true
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
      const wsUrl = `${protocol}//${window.location.host}/api/stream`
      console.log('Connecting to:', wsUrl)
      const ws = new WebSocket(wsUrl)

      ws.onopen = () => {
        console.log('WebSocket connected')
        isConnectingRef.current = false
        setIsConnected(true)
        setError('')
        ws.send(JSON.stringify({ type: 'register', role: 'viewer' }))
      }

      ws.onmessage = async (event) => {
        try {
          console.log('Received WebSocket message, type:', typeof event.data, event.data instanceof Blob ? `Blob(${event.data.size})` : '')
          
          let message
          if (typeof event.data === 'string') {
            message = JSON.parse(event.data)
          } else if (event.data instanceof Blob) {
            const text = await event.data.text()
            message = JSON.parse(text)
          } else {
            console.log('Unknown message type:', typeof event.data)
            return
          }
          
          console.log('Parsed message type:', message.type)
          
          if (message.type === 'registered') {
            console.log('Registered as viewer')
          } else if (message.type === 'transcript-history') {
            console.log('Received transcript history:', message.history?.length, 'items')
            // Store transcript history in VideoPlayer for AI context
            // The VideoPlayer will use this when user asks questions
          } else if (message.type === 'frame') {
            // Store latest frame, drop old ones to prevent buffering
            pendingFrameRef.current = message.data
            if (!isRenderingRef.current) {
              renderLatestFrame()
            }
          } else if (message.type === 'caption') {
            console.log('Received caption:', message.text, 'isFinal:', message.isFinal)
            // Only use final captions to avoid translation being aborted by rapid interim updates
            if (message.isFinal) {
              setCurrentCaption(message.text)
            }
          } else if (message.type === 'broadcaster-disconnected') {
            setError('Broadcaster disconnected')
          } else {
            console.log('Unknown message type:', message.type)
          }
        } catch (err) {
          console.error('Error processing message:', err)
        }
      }

      ws.onerror = (error) => {
        console.error('WebSocket error:', error)
        setError('Connection error. Retrying...')
      }

      ws.onclose = (event) => {
        console.log('WebSocket closed:', event.code, event.reason)
        isConnectingRef.current = false
        setIsConnected(false)
        wsRef.current = null
        
        if (!event.wasClean) {
          setError('Connection lost. Reconnecting...')
        }
        
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current)
        }
        
        reconnectTimeoutRef.current = setTimeout(() => {
          console.log('Attempting to reconnect...')
          connectToStream()
        }, 2000)
      }

      wsRef.current = ws
    } catch (err) {
      console.error('Connection error:', err)
      isConnectingRef.current = false
      setError('Failed to connect to stream.')
      
      reconnectTimeoutRef.current = setTimeout(() => {
        connectToStream()
      }, 2000)
    }
  }

  const renderLatestFrame = () => {
    if (!pendingFrameRef.current || !canvasRef.current) return
    
    isRenderingRef.current = true
    const data = pendingFrameRef.current
    pendingFrameRef.current = null

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      isRenderingRef.current = false
      return
    }

    const uint8Array = new Uint8Array(data)
    const blob = new Blob([uint8Array], { type: 'image/jpeg' })
    const url = URL.createObjectURL(blob)

    const img = new Image()
    img.onload = () => {
      canvas.width = img.width
      canvas.height = img.height
      ctx.drawImage(img, 0, 0)
      URL.revokeObjectURL(url)
      isRenderingRef.current = false
      
      // Create MediaStream from canvas on first frame
      if (!streamRef.current && canvas.captureStream) {
        const stream = canvas.captureStream(5)
        streamRef.current = stream
        setLiveStream(stream)
      }
      
      // Immediately render next frame if one arrived while rendering
      if (pendingFrameRef.current) {
        renderLatestFrame()
      }
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      isRenderingRef.current = false
    }
    img.src = url
  }


  return (
    <div className="min-h-screen bg-white">
      <canvas ref={canvasRef} className="absolute -left-[9999px]" />
      
      {!liveStream ? (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-gray-200 border-t-gray-900 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-xl text-gray-900 font-semibold mb-2">
              {isConnected ? 'Waiting for video stream' : 'Connecting to stream'}
            </p>
            <p className="text-sm text-gray-500">
              Make sure the broadcaster is streaming
            </p>
            {error && (
              <div className="mt-6 px-6 py-3 bg-red-50 border border-red-200 rounded-xl max-w-md mx-auto">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}
          </div>
        </div>
      ) : (
      
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={() => {
                // Clean up WebSocket connection before leaving
                if (reconnectTimeoutRef.current) {
                  clearTimeout(reconnectTimeoutRef.current)
                }
                if (wsRef.current) {
                  wsRef.current.close()
                  wsRef.current = null
                }
                if (streamRef.current) {
                  streamRef.current.getTracks().forEach(track => track.stop())
                }
                router.push('/')
              }}
              className="flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm">Back</span>
            </button>
            
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 text-green-700 rounded-full">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium">Live</span>
              </div>
              
              <button
                onClick={() => setCaptionsEnabled(!captionsEnabled)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  captionsEnabled 
                    ? 'bg-gray-900 text-white' 
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                Captions
              </button>
            </div>
          </div>
          <h1 className="text-3xl font-semibold text-gray-900">Live Stream</h1>
        </div>

        {/* Video Player */}
        <div>
          <VideoPlayer
            liveStream={liveStream}
            captionLanguage={selectedCaptionLang}
            targetLanguage={selectedTargetLang}
            aiLanguage={selectedAILang}
            isLive={true}
            externalCaption={captionsEnabled ? currentCaption : ''}
            disableInternalTranscription={true}
          />
        </div>
      </div>
      )}
    </div>
  )
}
