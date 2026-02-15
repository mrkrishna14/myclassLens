'use client'

import { useState, useRef, useEffect } from 'react'
import { Camera, Wifi, WifiOff } from 'lucide-react'

export default function RecordPage() {
  const [isStreaming, setIsStreaming] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<string>('')
  const [currentCaption, setCurrentCaption] = useState<string>('')
  const [speechStatus, setSpeechStatus] = useState<string>('Not started')
  const [captionCount, setCaptionCount] = useState(0)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const recognitionRef = useRef<any>(null)

  useEffect(() => {
    return () => {
      stopStreaming()
    }
  }, [])

  const reconnectWebSocket = () => {
    if (!streamRef.current) return
    
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const wsUrl = `${protocol}//${window.location.host}/api/stream`
    const ws = new WebSocket(wsUrl)

    ws.onopen = () => {
      console.log('WebSocket reconnected')
      setIsConnected(true)
      ws.send(JSON.stringify({ type: 'register', role: 'broadcaster' }))
    }

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data)
      if (message.type === 'registered') {
        console.log('Re-registered as broadcaster')
        if (streamRef.current) {
          startFrameCapture(ws, streamRef.current)
          startTranscription(ws)
        }
      }
    }

    ws.onerror = (error) => {
      console.error('WebSocket reconnection error:', error)
      setError('Connection error. Retrying...')
    }

    ws.onclose = (event) => {
      console.log('WebSocket closed again:', event.code)
      setIsConnected(false)
      if (isStreaming && !event.wasClean) {
        setTimeout(() => {
          if (wsRef.current?.readyState === WebSocket.CLOSED && streamRef.current) {
            reconnectWebSocket()
          }
        }, 2000)
      }
    }

    wsRef.current = ws
  }

  const startStreaming = async () => {
    try {
      setError('')
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: true
      })

      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }

      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
      const wsUrl = `${protocol}//${window.location.host}/api/stream`
      const ws = new WebSocket(wsUrl)

      ws.onopen = () => {
        console.log('WebSocket connected')
        setIsConnected(true)
        ws.send(JSON.stringify({ type: 'register', role: 'broadcaster' }))
      }

      ws.onmessage = (event) => {
        const message = JSON.parse(event.data)
        if (message.type === 'registered') {
          console.log('Registered as broadcaster')
          startFrameCapture(ws, stream)
          startTranscription(ws)
        } else if (message.type === 'error') {
          setError(message.message)
          stopStreaming()
        }
      }

      ws.onerror = (error) => {
        console.error('WebSocket error:', error)
        setError('Connection error. Retrying...')
      }

      ws.onclose = (event) => {
        console.log('WebSocket closed:', event.code, event.reason)
        setIsConnected(false)
        
        // Don't reconnect if user manually stopped streaming
        if (isStreaming && !event.wasClean) {
          console.log('Attempting to reconnect...')
          setTimeout(() => {
            if (wsRef.current?.readyState === WebSocket.CLOSED && streamRef.current) {
              reconnectWebSocket()
            }
          }, 2000)
        }
      }

      wsRef.current = ws
      setIsStreaming(true)

    } catch (err: any) {
      console.error('Error starting stream:', err)
      if (err.name === 'NotAllowedError') {
        setError('Camera permission denied. Please allow camera access.')
      } else {
        setError('Failed to access camera. Please try again.')
      }
    }
  }

  const startFrameCapture = (ws: WebSocket, stream: MediaStream) => {
    if (!canvasRef.current) {
      canvasRef.current = document.createElement('canvas')
    }
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx || !videoRef.current) return

    let isCapturing = true

    const captureFrame = () => {
      if (!isCapturing || !videoRef.current || ws.readyState !== WebSocket.OPEN) {
        console.log('Stopping frame capture:', { isCapturing, hasVideo: !!videoRef.current, wsState: ws.readyState })
        return
      }

      if (videoRef.current.videoWidth === 0 || videoRef.current.videoHeight === 0) {
        setTimeout(captureFrame, 100)
        return
      }

      canvas.width = videoRef.current.videoWidth
      canvas.height = videoRef.current.videoHeight
      ctx.drawImage(videoRef.current, 0, 0)

      canvas.toBlob((blob) => {
        if (blob && ws.readyState === WebSocket.OPEN) {
          blob.arrayBuffer().then(buffer => {
            const message = {
              type: 'frame',
              data: Array.from(new Uint8Array(buffer)),
              timestamp: Date.now()
            }
            ws.send(JSON.stringify(message))
            console.log('Sent frame:', blob.size, 'bytes')
          })
        }
        setTimeout(captureFrame, 100)
      }, 'image/jpeg', 0.8)
    }

    ws.onclose = () => {
      isCapturing = false
    }

    if (videoRef.current.readyState >= 2) {
      console.log('Starting frame capture immediately')
      captureFrame()
    } else {
      console.log('Waiting for video to load...')
      videoRef.current.onloadeddata = () => {
        console.log('Video loaded, starting frame capture')
        captureFrame()
      }
    }
  }

  const startTranscription = (ws: WebSocket) => {
    if (!streamRef.current || recognitionRef.current) {
      console.log('Cannot start transcription: no stream or already running')
      return
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    const recognition = new SpeechRecognition()
    
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-US'

    recognition.onstart = () => {
      console.log('✅ Speech recognition started')
      setSpeechStatus('✅ Active')
    }

    recognition.onresult = (event: any) => {
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

      const caption = finalTranscript || interimTranscript
      // Use wsRef.current instead of ws parameter to avoid stale reference after reconnection
      const currentWs = wsRef.current
      console.log('🎤 Caption detected:', caption.slice(0, 50), 'WS readyState:', currentWs?.readyState, 'Open?:', currentWs?.readyState === WebSocket.OPEN)
      if (caption && currentWs && currentWs.readyState === WebSocket.OPEN) {
        setCurrentCaption(caption)
        setCaptionCount(prev => prev + 1)
        const captionMsg = {
          type: 'caption',
          text: caption,
          isFinal: !!finalTranscript,
          timestamp: Date.now()
        }
        console.log('📤 Sending caption message:', captionMsg)
        try {
          currentWs.send(JSON.stringify(captionMsg))
          console.log('✅ Caption sent successfully')
        } catch (err) {
          console.error('❌ Failed to send caption:', err)
        }
      } else {
        console.log('⚠️ Caption NOT sent - empty or WS not open')
      }
    }

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error)
      setSpeechStatus(`❌ Error: ${event.error}`)
      if (event.error === 'not-allowed') {
        setError('Microphone permission denied')
      }
    }

    recognition.onend = () => {
      // Check if we should restart using wsRef.current to avoid stale closure
      const currentWs = wsRef.current
      if (currentWs && currentWs.readyState === WebSocket.OPEN && streamRef.current && recognitionRef.current) {
        try {
          setTimeout(() => {
            if (recognitionRef.current) {
              try {
                recognition.start()
                setSpeechStatus('✅ Active')
              } catch (err) {
                console.error('Failed to restart recognition:', err)
              }
            }
          }, 100) // Small delay to allow cleanup
        } catch (err) {
          console.error('Failed to restart recognition:', err)
        }
      } else {
        setSpeechStatus('⏹️ Stopped')
      }
    }

    try {
      recognition.start()
      recognitionRef.current = recognition
      setSpeechStatus('🎤 Starting...')
      console.log('Speech recognition started')
    } catch (err) {
      console.error('Failed to start speech recognition:', err)
      setSpeechStatus('❌ Failed to start')
      setError('Speech recognition failed to start')
    }
  }

  const pauseStreaming = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
      recognitionRef.current = null
    }
    setIsPaused(true)
    setSpeechStatus('⏸️ Paused')
  }

  const resumeStreaming = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      startTranscription(wsRef.current)
      setIsPaused(false)
    }
  }

  const stopStreaming = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
      recognitionRef.current = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    setIsStreaming(false)
    setIsPaused(false)
    setIsConnected(false)
    setCurrentCaption('')
    setSpeechStatus('Not started')
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-3xl font-semibold text-gray-900">Record Stream</h1>
            {isConnected ? (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 text-green-700 rounded-full">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium">Connected</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 text-gray-500 rounded-full">
                <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                <span className="text-sm font-medium">Disconnected</span>
              </div>
            )}
          </div>
          <p className="text-gray-500">Stream live video and captions to viewers</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* Video Preview */}
        <div className="w-full bg-black rounded-2xl overflow-hidden shadow-lg mb-6" style={{ aspectRatio: '16/9' }}>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-contain"
          />
        </div>

        {/* Control Buttons */}
        <div className="flex gap-3 mb-6">
          {!isStreaming ? (
            <button
              onClick={startStreaming}
              className="flex-1 bg-gray-900 hover:bg-gray-800 text-white font-medium py-4 px-6 rounded-xl transition-colors"
            >
              Start Recording
            </button>
          ) : (
            <>
              {!isPaused ? (
                <button
                  onClick={pauseStreaming}
                  className="flex-1 bg-yellow-600 hover:bg-yellow-700 text-white font-medium py-4 px-6 rounded-xl transition-colors"
                >
                  Pause
                </button>
              ) : (
                <button
                  onClick={resumeStreaming}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium py-4 px-6 rounded-xl transition-colors"
                >
                  Resume
                </button>
              )}
              <button
                onClick={stopStreaming}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-medium py-4 px-6 rounded-xl transition-colors"
              >
                Stop Recording
              </button>
            </>
          )}
        </div>

        {/* Status Info */}
        <div className="space-y-3">
          {!isStreaming && (
            <p className="text-sm text-gray-500 text-center">
              Start recording to stream video and captions to viewers
            </p>
          )}
          
          {isStreaming && (
            <div className="space-y-3">
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Speech Recognition</span>
                  <span className="text-sm text-gray-600">{speechStatus}</span>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-sm font-medium text-gray-700">Captions Sent</span>
                  <span className="text-sm text-gray-900 font-semibold">{captionCount}</span>
                </div>
              </div>
              
              {currentCaption && (
                <div className="p-4 bg-white rounded-xl border border-gray-200 shadow-sm">
                  <p className="text-xs text-gray-500 mb-2 uppercase tracking-wide">Live Caption</p>
                  <p className="text-base text-gray-900">{currentCaption}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
