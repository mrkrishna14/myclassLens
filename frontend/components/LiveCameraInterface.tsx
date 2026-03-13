'use client'

import { useState, useRef, useEffect } from 'react'
import { Camera, Video, Languages, AlertCircle, CheckCircle2 } from 'lucide-react'

interface LiveCameraInterfaceProps {
  onBack: () => Promise<void>
  onStreamStart: (stream: MediaStream) => void
  onLanguageSelection: (caption: string, target: string, ai: string) => void
  captionLanguage: string
  targetLanguage: string
  aiLanguage: string
}

const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'zh', name: 'Chinese (Mandarin)' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'ar', name: 'Arabic' },
  { code: 'hi', name: 'Hindi' },
]

export default function LiveCameraInterface({
  onBack,
  onStreamStart,
  onLanguageSelection,
  captionLanguage,
  targetLanguage,
  aiLanguage,
}: LiveCameraInterfaceProps) {
  const [showLanguageSelection, setShowLanguageSelection] = useState(false)
  const [selectedCaptionLang, setSelectedCaptionLang] = useState(captionLanguage)
  const [selectedTargetLang, setSelectedTargetLang] = useState(targetLanguage)
  const [selectedAILang, setSelectedAILang] = useState(aiLanguage)
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([])
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string>('')
  const [showSetupInstructions, setShowSetupInstructions] = useState(false)
  const [previewStream, setPreviewStream] = useState<MediaStream | null>(null)
  const previewRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    loadDevices()
  }, [])

  // Set stream to video element when language selection screen is shown
  useEffect(() => {
    if (showLanguageSelection && previewRef.current && previewStream) {
      console.log('Setting stream to video element')
      previewRef.current.srcObject = previewStream
      previewRef.current.play().catch(err => {
        console.error('Error auto-playing video:', err)
        setError('Error playing video preview. Please try again.')
      })
    }
  }, [showLanguageSelection, previewStream])

  const loadDevices = async () => {
    try {
      // Request permission first - this is required for device labels to appear
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })

      // Stop the stream immediately - we just needed it for permissions
      stream.getTracks().forEach(track => track.stop())

      // Now enumerate devices - labels should be available
      const deviceList = await navigator.mediaDevices.enumerateDevices()
      const videoDevices = deviceList.filter(device => device.kind === 'videoinput')

      console.log('Found video devices:', videoDevices.map(d => ({
        deviceId: d.deviceId,
        label: d.label,
        kind: d.kind
      })))
      // Log each device separately for easier debugging
      videoDevices.forEach((device, index) => {
        console.log(`Device ${index + 1}:`, {
          label: device.label || '(no label)',
          deviceId: device.deviceId.substring(0, 20) + '...',
          kind: device.kind
        })
      })

      setDevices(videoDevices)

      if (videoDevices.length > 0) {
        // Try to find Continuity Camera or iPhone first
        const continuityCamera = videoDevices.find(device =>
          device.label.toLowerCase().includes('iphone') ||
          device.label.toLowerCase().includes('continuity') ||
          device.label.toLowerCase().includes('camera')
        )

        setSelectedDeviceId(continuityCamera?.deviceId || videoDevices[0].deviceId)
      } else {
        setError('No cameras found. Make sure your iPhone is connected and Continuity Camera is enabled.')
      }
    } catch (err: any) {
      console.error('Error loading devices:', err)
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setError('Camera permission denied. Please allow camera access in your browser settings.')
      } else {
        setError('Unable to access camera. Please check permissions and ensure your iPhone is connected.')
      }
    }
  }

  const handleStartStream = async () => {
    if (!selectedDeviceId) {
      setError('Please select a camera device')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      const selectedDevice = devices.find(d => d.deviceId === selectedDeviceId)
      console.log('Attempting to access camera:', {
        deviceId: selectedDeviceId,
        label: selectedDevice?.label || '(no label)'
      })

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          deviceId: { exact: selectedDeviceId },
          width: { ideal: 3840 },
          height: { ideal: 2160 },
          frameRate: { ideal: 30, max: 60 },
          //resizeMode: 'none',
        },
        audio: true,
      })

      // Ask for the highest supported quality on the chosen camera track.
      const videoTrack = stream.getVideoTracks()[0]
      if (videoTrack && typeof videoTrack.getCapabilities === 'function') {
        const caps: any = videoTrack.getCapabilities()
        try {
          const bestWidth = typeof caps?.width?.max === 'number' ? caps.width.max : 3840
          const bestHeight = typeof caps?.height?.max === 'number' ? caps.height.max : 2160
          const bestFps = typeof caps?.frameRate?.max === 'number' ? Math.min(60, caps.frameRate.max) : 30
          const supportsNoResize =
            Array.isArray(caps?.resizeMode) && caps.resizeMode.includes('none')

          await videoTrack.applyConstraints({
            width: { ideal: bestWidth },
            height: { ideal: bestHeight },
            frameRate: { ideal: bestFps },
            ...(supportsNoResize ? { resizeMode: 'none' as any } : {}),
          } as MediaTrackConstraints)
        } catch (constraintError) {
          // Keep stream even if advanced constraints are not supported.
          console.warn('Could not apply max-quality track constraints:', constraintError)
        }
      }

      console.log('Stream obtained:', {
        videoTracks: stream.getVideoTracks().length,
        audioTracks: stream.getAudioTracks().length,
        videoTrackLabel: stream.getVideoTracks()[0]?.label,
        videoTrackSettings: stream.getVideoTracks()[0]?.getSettings()
      })

      // Store stream in state - will be set to video element when it renders
      setPreviewStream(stream)

      // Show language selection (this will render the video element)
      setShowLanguageSelection(true)
      setIsLoading(false)
    } catch (err: any) {
      console.error('Error accessing camera:', err)
      console.error('Error details:', {
        name: err.name,
        message: err.message,
        constraint: err.constraint
      })

      if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setError('Camera not found. Please make sure your iPhone is connected and try refreshing devices.')
      } else if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setError('Camera permission denied. Please allow camera access in your browser settings.')
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        setError('Camera is being used by another application. Please close other apps using the camera.')
      } else {
        setError(`Failed to access camera: ${err.message || 'Unknown error'}. Please try again.`)
      }
      setIsLoading(false)
    }
  }

  const handleContinue = () => {
    if (previewStream) {
      // Unlock TTS on the same user gesture so spoken captions can start immediately.
      try {
        if ('speechSynthesis' in window) {
          const unlock = new SpeechSynthesisUtterance('')
          unlock.volume = 0
          window.speechSynthesis.speak(unlock)
          window.speechSynthesis.cancel()
        }
      } catch (error) {
        // Ignore unlock errors and continue.
      }

      // For live: captionLanguage = speaking language, targetLanguage = caption translation language, aiLanguage = AI response language
      onLanguageSelection(selectedCaptionLang, selectedTargetLang, selectedAILang)
      onStreamStart(previewStream)
    } else {
      setError('No video stream available. Please try starting the camera again.')
    }
  }

  const handleStopPreview = () => {
    // Stop the stream tracks
    if (previewStream) {
      previewStream.getTracks().forEach(track => track.stop())
      setPreviewStream(null)
    }
    if (previewRef.current) {
      previewRef.current.srcObject = null
    }
    setShowLanguageSelection(false)
  }

  if (showLanguageSelection) {
    return (
      <div className="min-h-screen bg-[#0a1628] relative overflow-hidden flex items-center justify-center p-4">
        {/* Curvy divide background */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-[#0a1628]" />
          <div className="absolute inset-0 bg-[#0f2847]" />
          <svg
            className="absolute bottom-0 w-full h-1/2"
            viewBox="0 0 1440 320"
            preserveAspectRatio="none"
          >
            <path
              fill="#0a1628"
              d="M0,96L48,112C96,128,192,160,288,165.3C384,171,480,149,576,138.7C672,128,768,128,864,144C960,160,1056,192,1152,197.3C1248,203,1344,181,1392,170.7L1440,160L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"
            />
          </svg>
        </div>

        <div className="relative z-10 bg-[#2a4a7a] backdrop-blur-sm rounded-2xl shadow-2xl shadow-black/30 border border-white/15 p-8 max-w-2xl w-full">
          <div className="flex items-center gap-3 mb-4">
            <Languages className="w-8 h-8 text-blue-300" />
            <h2 className="text-2xl font-bold text-white">Select Languages</h2>
          </div>

          {previewStream && (
            <div className="mb-6 p-3 bg-emerald-500/20 border border-emerald-400/30 rounded-lg">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <p className="text-sm text-emerald-200 font-semibold">
                  Camera connected and streaming
                </p>
              </div>
            </div>
          )}

          <div className="mb-6 relative bg-black rounded-lg overflow-hidden" style={{ aspectRatio: '16/9' }}>
            <video
              ref={previewRef}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-contain"
              onLoadedMetadata={() => {
                console.log('Video metadata loaded:', {
                  videoWidth: previewRef.current?.videoWidth,
                  videoHeight: previewRef.current?.videoHeight,
                  readyState: previewRef.current?.readyState
                })
              }}
              onPlay={() => {
                console.log('Video started playing')
              }}
              onError={(e) => {
                console.error('Video error:', e)
                setError('Error loading video preview')
              }}
            />
            {!previewStream && (
              <div className="absolute inset-0 flex items-center justify-center text-white text-sm">
                Waiting for video stream...
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                💬 What language do you want captions in?
              </label>
              <select
                value={selectedTargetLang}
                onChange={(e) => setSelectedTargetLang(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-white/20 bg-white/5 text-white focus:ring-2 focus:ring-white/30 focus:border-white/40"
              >
                {LANGUAGES.map((lang) => (
                  <option key={lang.code} value={lang.code} className="bg-[#1e3a5f] text-white">
                    {lang.name}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-sm text-slate-400">
                Captions will be translated to this language in real-time
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                🤖 What language should AI explanations be in?
              </label>
              <select
                value={selectedAILang}
                onChange={(e) => setSelectedAILang(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-white/20 bg-white/5 text-white focus:ring-2 focus:ring-white/30 focus:border-white/40"
              >
                {LANGUAGES.map((lang) => (
                  <option key={lang.code} value={lang.code} className="bg-[#1e3a5f] text-white">
                    {lang.name}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-sm text-slate-400">
                When you ask questions, AI will respond in this language
              </p>
            </div>

            <div className="flex gap-4 pt-4">
              <button
                onClick={handleStopPreview}
                className="flex-1 px-6 py-3 rounded-lg border border-white/20 bg-white/5 hover:bg-white/10 transition-colors font-medium text-slate-300"
              >
                Back
              </button>
              <button
                onClick={handleContinue}
                className="flex-1 px-6 py-3 bg-white text-[#0a1628] rounded-lg hover:bg-slate-100 transition-colors font-semibold shadow-lg"
              >
                Start Live Session
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a1628] relative overflow-hidden flex items-center justify-center p-4">
      {/* Curvy divide background */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[#0a1628]" />
        <div className="absolute inset-0 bg-[#0f2847]" />
        <svg
          className="absolute bottom-0 w-full h-1/2"
          viewBox="0 0 1440 320"
          preserveAspectRatio="none"
        >
          <path
            fill="#0a1628"
            d="M0,96L48,112C96,128,192,160,288,165.3C384,171,480,149,576,138.7C672,128,768,128,864,144C960,160,1056,192,1152,197.3C1248,203,1344,181,1392,170.7L1440,160L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"
          />
        </svg>
      </div>

      <div className="relative z-10 bg-[#2a4a7a] backdrop-blur-sm rounded-2xl shadow-2xl shadow-black/30 border border-white/15 p-8 max-w-2xl w-full">
        <button
          onClick={onBack}
          className="px-4 py-2 rounded-lg border border-white/25 text-slate-300 font-medium hover:bg-white/5 hover:border-white/40 transition-colors"
        >
          Back
        </button>
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white/10 rounded-full mb-4">
            <Camera className="w-8 h-8 text-blue-300" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">ClassLens Live</h1>
          <p className="text-slate-400">
            Connect your camera for real-time lecture capture
          </p>
          <p className="text-sm text-slate-400 mt-2">
            Using Continuity Camera? Make sure your iPhone is connected and appears in Photo Booth first.
          </p>
        </div>

        {showSetupInstructions && (
          <div className="mb-6 p-4 bg-blue-500/20 border border-blue-400/30 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-blue-300 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="font-semibold text-blue-200 mb-2">iPhone Camera Setup</h3>
                <ol className="list-decimal list-inside space-y-1 text-sm text-slate-300">
                  <li>Install a camera app like <strong>EpocCam</strong> or <strong>DroidCam</strong> on your iPhone</li>
                  <li>Install the corresponding desktop app on your computer</li>
                  <li>Connect iPhone and computer to the same Wi-Fi network</li>
                  <li>Open the app on both devices and connect</li>
                  <li>Your iPhone camera will appear as a webcam option below</li>
                </ol>
                <p className="text-xs text-slate-400 mt-2">
                  <strong>Alternative:</strong> If using macOS, you can use Continuity Camera by connecting your iPhone via USB or wirelessly.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-4">
          {error && (
            <div className="p-4 bg-red-500/20 border border-red-500/30 rounded-lg">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-300" />
                <p className="text-sm text-red-200">{error}</p>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Select Camera
            </label>
            {devices.length === 0 ? (
              <div className="p-4 border border-dashed border-white/25 rounded-lg text-center">
                <p className="text-sm text-slate-400 mb-2">No cameras found</p>
                <p className="text-xs text-slate-400 mb-3">
                  Make sure your iPhone is connected via USB or wirelessly, and Continuity Camera is enabled.
                </p>
                <button
                  onClick={loadDevices}
                  className="text-sm text-blue-300 hover:text-blue-200 font-medium"
                >
                  Refresh Devices
                </button>
              </div>
            ) : (
              <select
                value={selectedDeviceId}
                onChange={(e) => setSelectedDeviceId(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-white/20 bg-white/5 text-white focus:ring-2 focus:ring-white/30 focus:border-white/40"
              >
                {devices.map((device, index) => {
                  // Better label handling for Continuity Camera
                  let label = device.label
                  if (!label || label === '') {
                    // If no label, try to identify by checking if it's likely Continuity Camera
                    label = `Camera ${index + 1}`
                  }
                  // Common Continuity Camera labels
                  if (label.toLowerCase().includes('iphone') ||
                    label.toLowerCase().includes('continuity')) {
                    label = `📱 ${label} (Continuity Camera)`
                  }
                  return (
                    <option key={device.deviceId} value={device.deviceId} className="bg-[#1e3a5f] text-white">
                      {label}
                    </option>
                  )
                })}
              </select>
            )}
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setShowSetupInstructions(!showSetupInstructions)}
              className="flex-1 px-4 py-2 rounded-lg border border-white/20 bg-white/5 hover:bg-white/10 transition-colors text-sm font-medium text-slate-300"
            >
              {showSetupInstructions ? 'Hide' : 'Show'} Setup Instructions
            </button>
            <button
              onClick={() => {
                onLanguageSelection('en', selectedTargetLang, selectedAILang)
                handleStartStream()
              }}
              disabled={isLoading || devices.length === 0}
              className="flex-1 px-6 py-4 rounded-xl bg-white text-[#0a1628] font-semibold hover:bg-slate-100 transition-all text-lg shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-[#0a1628] border-t-transparent rounded-full animate-spin"></div>
                  Connecting...
                </span>
              ) : (
                'Start Camera'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
