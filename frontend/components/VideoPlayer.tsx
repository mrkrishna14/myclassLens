'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import Image from 'next/image'
import QRCode from 'qrcode'
import { Play, Pause, Volume2, VolumeX, Settings, Maximize, Minimize, X, Sparkles } from 'lucide-react'
import BoundingBoxDrawer from './BoundingBoxDrawer'
import InteractionLog from './InteractionLog'
import CaptionDisplay from './CaptionDisplay'
import AccessibilityPanel from './AccessibilityPanel'

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
  sessionRole?: 'host' | 'viewer' | null
  sessionShareUrl?: string
  sessionStatusMessage?: string
  onLiveCaptionBroadcast?: (caption: string) => void
  incomingSharedCaption?: string
  disableLocalTranscription?: boolean
  onTargetLanguageChange?: (language: string) => void
  onLiveViewportBroadcast?: (viewport: {
    translateX: number
    translateY: number
    zoom: number
    autoFollowEnabled: boolean
    autoFollowStatus: 'off' | 'face' | 'motion' | 'unsupported'
  }) => void
  incomingLiveViewport?: {
    translateX: number
    translateY: number
    zoom: number
    autoFollowEnabled: boolean
    autoFollowStatus: 'off' | 'face' | 'motion' | 'unsupported'
  }
}

export default function VideoPlayer({
  videoUrl,
  videoFile,
  liveStream,
  captionLanguage,
  targetLanguage,
  aiLanguage,
  isLive = false,
  sessionRole = null,
  sessionShareUrl,
  sessionStatusMessage,
  onLiveCaptionBroadcast,
  incomingSharedCaption,
  disableLocalTranscription = false,
  onTargetLanguageChange,
  onLiveViewportBroadcast,
  incomingLiveViewport,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(() => isLive && sessionRole === 'viewer')
  const [volume, setVolume] = useState(1)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isPaused, setIsPaused] = useState(true)
  const [showBoundingBoxDrawer, setShowBoundingBoxDrawer] = useState(true) // Always enabled for live streams
  const [drawnBox, setDrawnBox] = useState<{ x: number; y: number; width: number; height: number } | null>(null)
  const [showQuestionPanel, setShowQuestionPanel] = useState(false)
  const [interactions, setInteractions] = useState<Interaction[]>([])
  const [currentCaption, setCurrentCaption] = useState('')
  const [translatedCaption, setTranslatedCaption] = useState('')
  const [transcript, setTranscript] = useState<Array<{ start: number; end: number; text: string }>>([])
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [isTranslating, setIsTranslating] = useState(false)
  const [showAccessibility, setShowAccessibility] = useState(false)
  const [playbackRate, setPlaybackRate] = useState(1)
  const [captionSize, setCaptionSize] = useState<'small' | 'medium' | 'large'>('medium')
  const [autoFollowEnabled, setAutoFollowEnabled] = useState(true)
  const [autoFollowStatus, setAutoFollowStatus] = useState<'off' | 'face' | 'motion' | 'unsupported'>('off')
  const [followPoint, setFollowPoint] = useState({ x: 50, y: 50 })
  const [shareLinkCopied, setShareLinkCopied] = useState(false)
  const [sessionQrCodeDataUrl, setSessionQrCodeDataUrl] = useState('')
  const [sessionQrCodeError, setSessionQrCodeError] = useState(false)
  const [showTtsEnablePrompt, setShowTtsEnablePrompt] = useState(false)
  const [liveLayout, setLiveLayout] = useState({
    containerWidth: 0,
    containerHeight: 0,
    videoWidth: 0,
    videoHeight: 0,
  })
  const [sessionStartTime, setSessionStartTime] = useState<number>(0)
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const transcriptHistoryRef = useRef<Array<{ start: number; end: number; text: string }>>([])
  const trackingIntervalRef = useRef<number | null>(null)
  const isTrackingFrameRef = useRef(false)
  const followPointRef = useRef({ x: 50, y: 50 })
  const faceDetectorRef = useRef<any>(null)
  const motionCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const previousMotionFrameRef = useRef<Uint8ClampedArray | null>(null)
  const ttsUnlockedRef = useRef(false)
  const lastSpokenTextRef = useRef('')
  const lastInterimTranslateAtRef = useRef(0)
  const lastInterimSourceRef = useRef('')
  const lastFinalSourceRef = useRef('')
  const translationCacheRef = useRef<Record<string, string>>({})
  const isTranslationInFlightRef = useRef(false)
  const pendingTranslationRef = useRef<{
    text: string
    from: string
    to: string
    interruptSpeech: boolean
    speak: boolean
    requestTimeMs: number
  } | null>(null)
  const [ttsVoicesReady, setTtsVoicesReady] = useState(false)
  const pendingSpeechRef = useRef<{ text: string; language: string; interrupt: boolean } | null>(null)
  const lastTranslatedCaptionRef = useRef('')
  const speechQueueRef = useRef<Array<{ text: string; language: string }>>([])
  const isQueueSpeakingRef = useRef(false)
  const recentSpeechKeysRef = useRef<Map<string, number>>(new Map())
  const lastQueuedSpeechKeyRef = useRef('')
  const lastDeltaKeyRef = useRef('')
  const lastDeltaAtRef = useRef(0)
  const deltaBufferRef = useRef('')
  const deltaFlushTimerRef = useRef<number | null>(null)
  const lastDeltaFlushAtRef = useRef(0)
  const answerTypingTimerRef = useRef<number | null>(null)
  const shareCopiedTimeoutRef = useRef<number | null>(null)
  const lastBroadcastCaptionRef = useRef('')
  const lastIncomingCaptionRef = useRef('')
  const lastViewportBroadcastRef = useRef('')
  const viewerCaptionLanguages = [
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

  const clampNumber = useCallback((value: number, min: number, max: number) => {
    return Math.min(max, Math.max(min, value))
  }, [])

  const normalizeSpeechKey = (text: string) => {
    return text
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim()
  }

  const clearAnswerTypingTimer = () => {
    if (answerTypingTimerRef.current) {
      window.clearInterval(answerTypingTimerRef.current)
      answerTypingTimerRef.current = null
    }
  }

  useEffect(() => {
    let cancelled = false

    const createQrCode = async () => {
      if (!sessionShareUrl || sessionRole !== 'host') {
        setSessionQrCodeDataUrl('')
        setSessionQrCodeError(false)
        return
      }

      try {
        const qrDataUrl = await QRCode.toDataURL(sessionShareUrl, {
          width: 172,
          margin: 1,
          color: {
            dark: '#111827',
            light: '#ffffff',
          },
        })

        if (!cancelled) {
          setSessionQrCodeDataUrl(qrDataUrl)
          setSessionQrCodeError(false)
        }
      } catch (error) {
        console.error('Failed to generate QR code:', error)
        if (!cancelled) {
          setSessionQrCodeDataUrl('')
          setSessionQrCodeError(true)
        }
      }
    }

    void createQrCode()
    return () => {
      cancelled = true
    }
  }, [sessionShareUrl, sessionRole])

  useEffect(() => {
    if (isLive && sessionRole === 'viewer') {
      setIsMuted(true)
    }
  }, [isLive, sessionRole])

  const streamAnswerToPanel = (interactionId: string, fullAnswer: string) => {
    clearAnswerTypingTimer()

    const chunks = fullAnswer.match(/\S+\s*/g) || [fullAnswer]
    let index = 0

    answerTypingTimerRef.current = window.setInterval(() => {
      index += 1
      const partial = chunks.slice(0, index).join('')
      setInteractions((prev) =>
        prev.map((interaction) =>
          interaction.id === interactionId ? { ...interaction, answer: partial } : interaction
        )
      )

      if (index >= chunks.length) {
        clearAnswerTypingTimer()
      }
    }, 30)
  }

  const copyShareLink = async () => {
    if (!sessionShareUrl) return
    try {
      await navigator.clipboard.writeText(sessionShareUrl)
      setShareLinkCopied(true)
      if (shareCopiedTimeoutRef.current) {
        window.clearTimeout(shareCopiedTimeoutRef.current)
      }
      shareCopiedTimeoutRef.current = window.setTimeout(() => {
        setShareLinkCopied(false)
      }, 1600)
    } catch (error) {
      console.error('Failed to copy session link:', error)
    }
  }

  const updateFollowPoint = useCallback((targetX: number, _targetY: number) => {
    const previous = followPointRef.current

    // Keep tracking mostly horizontal for classroom board walks.
    const horizontalBoost = targetX >= 50 ? 1.2 : 1.08
    const adjustedTargetX = clampNumber(50 + (targetX - 50) * horizontalBoost, 0, 100)
    const adjustedTargetY = 50

    const rawDeltaX = adjustedTargetX - previous.x
    const rawDeltaY = adjustedTargetY - previous.y

    // Larger deadzone removes small shake from detection noise.
    const deltaX = Math.abs(rawDeltaX) < 1.1 ? 0 : rawDeltaX
    const deltaY = Math.abs(rawDeltaY) < 2 ? 0 : rawDeltaY

    const smoothingX = 0.36
    const smoothingY = 0.08
    const maxStepX = 5.4
    const maxStepY = 0.5

    const nextX = clampNumber(previous.x + clampNumber(deltaX * smoothingX, -maxStepX, maxStepX), 1, 99)
    const nextY = clampNumber(previous.y + clampNumber(deltaY * smoothingY, -maxStepY, maxStepY), 46, 54)
    followPointRef.current = { x: nextX, y: nextY }
    setFollowPoint({ x: nextX, y: nextY })
  }, [clampNumber])

  const detectMotionTarget = useCallback((video: HTMLVideoElement): { x: number; y: number } | null => {
    if (!motionCanvasRef.current) {
      motionCanvasRef.current = document.createElement('canvas')
      motionCanvasRef.current.width = 192
      motionCanvasRef.current.height = 108
    }

    const canvas = motionCanvasRef.current
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) return null

    const width = canvas.width
    const height = canvas.height
    ctx.drawImage(video, 0, 0, width, height)
    const imageData = ctx.getImageData(0, 0, width, height).data

    const currentFrame = new Uint8ClampedArray(width * height)
    for (let i = 0, pixel = 0; i < imageData.length; i += 4, pixel++) {
      currentFrame[pixel] = Math.round(
        imageData[i] * 0.299 + imageData[i + 1] * 0.587 + imageData[i + 2] * 0.114
      )
    }

    const previousFrame = previousMotionFrameRef.current
    previousMotionFrameRef.current = currentFrame
    if (!previousFrame) return null

    const threshold = 22
    let changedPixels = 0
    let sumX = 0

    for (let i = 0; i < currentFrame.length; i++) {
      if (Math.abs(currentFrame[i] - previousFrame[i]) > threshold) {
        changedPixels++
        const x = i % width
        sumX += x
      }
    }

    const minChangedRatio = 0.008
    if (changedPixels < width * height * minChangedRatio) return null

    const centroidX = (sumX / changedPixels / width) * 100
    const centerX = centroidX * 0.78 + followPointRef.current.x * 0.22
    const centerY = 50
    return { x: centerX, y: centerY }
  }, [])

  const measureLiveLayout = useCallback(() => {
    const container = containerRef.current
    const video = videoRef.current
    if (!container || !video) return

    const containerRect = container.getBoundingClientRect()
    const containerWidth = containerRect.width
    const containerHeight = containerRect.height
    const videoWidth = video.videoWidth || 0
    const videoHeight = video.videoHeight || 0

    setLiveLayout((prev) => {
      if (
        prev.containerWidth === containerWidth &&
        prev.containerHeight === containerHeight &&
        prev.videoWidth === videoWidth &&
        prev.videoHeight === videoHeight
      ) {
        return prev
      }
      return {
        containerWidth,
        containerHeight,
        videoWidth,
        videoHeight,
      }
    })
  }, [])

  // Map language codes to Web Speech API BCP-47 format
  const getSpeechRecognitionLang = (langCode: string): string => {
    const langMap: { [key: string]: string } = {
      'en': 'en-US',
      'es': 'es-ES',
      'fr': 'fr-FR',
      'de': 'de-DE',
      'zh': 'zh-CN', // Map straight to Mandarin
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
  const lastTranslationRequestMsRef = useRef<number>(0)
  const translateText = async (
    text: string,
    from: string,
    to: string,
    interruptSpeech: boolean = false,
    speak: boolean = true
  ) => {
    const normalizedText = text.trim()
    // Only translate for live streams when languages differ
    if (!isLive || !normalizedText || from === to) {
      setTranslatedCaption(normalizedText)
      if (speak) {
        speakText(normalizedText, getSpeechRecognitionLang(to), interruptSpeech)
      }
      return
    }

    const cacheKey = `${from}:${to}:${normalizedText.toLowerCase()}`
    const cached = translationCacheRef.current[cacheKey]
    if (cached) {
      setTranslatedCaption(cached)
      if (speak) {
        speakText(cached, getSpeechRecognitionLang(to), interruptSpeech)
      }
      return
    }

    const requestTimeMs = Date.now()
    lastTranslationRequestMsRef.current = requestTimeMs
    const request = { text: normalizedText, from, to, interruptSpeech, speak, requestTimeMs }

    // Coalesce requests while one is in flight so translation updates don't get starved.
    if (isTranslationInFlightRef.current) {
      pendingTranslationRef.current = request
      return
    }

    isTranslationInFlightRef.current = true
    setIsTranslating(true)

    let activeRequest: typeof request | null = request
    while (activeRequest) {
      try {
        const response = await fetch('/api/translate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            text: activeRequest.text,
            sourceLanguage: activeRequest.from,
            targetLanguage: activeRequest.to,
          }),
        })

        let translated = activeRequest.text
        if (response.ok) {
          const data = await response.json()
          translated = (data.translatedText || activeRequest.text).trim()
        } else {
          console.error('Translation API error:', response.statusText)
        }

        translationCacheRef.current[
          `${activeRequest.from}:${activeRequest.to}:${activeRequest.text.toLowerCase()}`
        ] = translated

        // ONLY apply the UI update if this was the latest request made
        if (activeRequest.requestTimeMs >= lastTranslationRequestMsRef.current) {
          setTranslatedCaption(translated)
          if (activeRequest.speak) {
            speakText(translated, getSpeechRecognitionLang(activeRequest.to), activeRequest.interruptSpeech)
          }
        }
      } catch (error) {
        console.error('Translation error:', error)
        if (activeRequest.requestTimeMs >= lastTranslationRequestMsRef.current) {
          setTranslatedCaption(activeRequest.text)
          if (activeRequest.speak) {
            speakText(activeRequest.text, getSpeechRecognitionLang(activeRequest.to), activeRequest.interruptSpeech)
          }
        }
      }

      const queued = pendingTranslationRef.current
      pendingTranslationRef.current = null
      activeRequest = queued
    }

    isTranslationInFlightRef.current = false
    setIsTranslating(false)
  }

  // Text-to-Speech function using Web Speech Synthesis API
  const speakText = (text: string, language: string, interrupt: boolean = false) => {
    if (document.visibilityState === 'hidden') return
    if (!text.trim()) return
    const normalized = text.trim()
    if (normalized === lastSpokenTextRef.current) return

    if (!ttsUnlockedRef.current) {
      // If a gesture happened before this component mounted, this probe can unlock TTS now.
      try {
        const probe = new SpeechSynthesisUtterance('')
        probe.volume = 0
        speechSynthesis.speak(probe)
        speechSynthesis.cancel()
        ttsUnlockedRef.current = true
      } catch {
        // Ignore and keep pending until the next user gesture.
      }
    }

    if (!ttsUnlockedRef.current) {
      pendingSpeechRef.current = { text: normalized, language, interrupt }
      if (isLive && disableLocalTranscription) {
        setShowTtsEnablePrompt(true)
      }
      return
    }

    // Avoid canceling too aggressively (Chrome can end up never speaking)
    if (speechSynthesis.speaking) {
      if (!interrupt) return
      speechSynthesis.cancel()
    }

    const utterance = new SpeechSynthesisUtterance(normalized)
    utterance.lang = language
    utterance.rate = 1
    utterance.pitch = 1
    utterance.volume = 1

    utterance.onstart = () => {
      console.log('🔊 TTS start', { language, text: normalized.slice(0, 80) })
    }
    utterance.onend = () => {
      console.log('🔊 TTS end')
    }
    utterance.onerror = (e) => {
      console.error('🔊 TTS error', e)
    }

    // Find a voice that matches the language
    const voices = speechSynthesis.getVoices()
    const matchingVoice = voices.find(voice => voice.lang.startsWith(language.split('-')[0]))
    if (matchingVoice) {
      utterance.voice = matchingVoice
    }

    speechSynthesis.speak(utterance)
    lastSpokenTextRef.current = normalized
  }

  const enqueueSpeech = (text: string, language: string) => {
    const normalized = text.trim()
    if (!normalized) return
    const key = normalizeSpeechKey(normalized)
    if (!key) return

    const now = Date.now()
    for (const [existingKey, timestamp] of Array.from(recentSpeechKeysRef.current.entries())) {
      if (now - timestamp > 8000) {
        recentSpeechKeysRef.current.delete(existingKey)
      }
    }

    const lastSeenAt = recentSpeechKeysRef.current.get(key)
    if (lastQueuedSpeechKeyRef.current === key) return
    if (lastSeenAt && now - lastSeenAt < 4500) return

    // "I" => "i", to prevent macOS TTS from sometimes reading it as "Capital I".
    // We only swap it in the local speech queue variable, NOT the actual visual `text` variable
    let textToSpeak = text.replace(/\bI\b/g, 'i')

    speechQueueRef.current.push({ text: textToSpeak, language })
    speakNextFromQueue()
    recentSpeechKeysRef.current.set(key, now)
    lastQueuedSpeechKeyRef.current = key
  }

  const splitIntoSpeechChunks = (text: string, maxWordsPerChunk: number = 4): string[] => {
    const cleaned = text.trim()
    if (!cleaned) return []

    const chunks: string[] = []
    const sentences = cleaned
      .replace(/\s+/g, ' ')
      .split(/(?<=[.!?…。！？])\s+/)
      .filter(Boolean)

    for (const sentence of sentences) {
      const words = sentence.trim().split(/\s+/).filter(Boolean)
      if (words.length <= maxWordsPerChunk) {
        chunks.push(sentence.trim())
        continue
      }

      for (let i = 0; i < words.length; i += maxWordsPerChunk) {
        chunks.push(words.slice(i, i + maxWordsPerChunk).join(' '))
      }
    }

    return chunks
  }

  const speakNextFromQueue = () => {
    if (isQueueSpeakingRef.current) return
    if (!ttsUnlockedRef.current) return
    if (document.visibilityState === 'hidden') return

    const next = speechQueueRef.current.shift()
    if (!next) return

    isQueueSpeakingRef.current = true
    const utterance = new SpeechSynthesisUtterance(next.text)
    utterance.lang = next.language

    // Dynamically adjust the speech rate based on how backed up the queue is
    // so the TTS naturally speeds up when the speaker talks very quickly
    const queueLength = speechQueueRef.current.length
    const dynamicRate = Math.min(1.0 + (queueLength * 0.1), 1.75) // Base 1.0x, max 1.75x

    utterance.rate = dynamicRate
    utterance.pitch = 1
    utterance.volume = 1

    const voices = speechSynthesis.getVoices()

    // Attempt exact BCP-47 match first (e.g. 'zh-CN'), then fallback to language prefix (e.g. 'zh')
    const matchingVoice =
      voices.find(voice => voice.lang.replace('_', '-') === next.language) ||
      voices.find(voice => voice.lang.startsWith(next.language.split('-')[0]))

    if (matchingVoice) {
      utterance.voice = matchingVoice
    }

    utterance.onend = () => {
      isQueueSpeakingRef.current = false
      if (speechQueueRef.current.length === 0) {
        lastQueuedSpeechKeyRef.current = ''
      }
      speakNextFromQueue()
    }
    utterance.onerror = () => {
      isQueueSpeakingRef.current = false
      if (speechQueueRef.current.length === 0) {
        lastQueuedSpeechKeyRef.current = ''
      }
      speakNextFromQueue()
    }

    speechSynthesis.speak(utterance)
  }

  const flushDeltaBuffer = (language: string) => {
    const buffered = deltaBufferRef.current.trim()
    if (!buffered) return

    deltaBufferRef.current = ''
    lastDeltaFlushAtRef.current = Date.now()
    const chunks = splitIntoSpeechChunks(buffered, 4)
    for (const chunk of chunks) {
      enqueueSpeech(chunk, language)
    }
    speakNextFromQueue()
  }

  const computeDelta = (prev: string, next: string) => {
    const p = prev.trim()
    const n = next.trim()
    if (!p) return n
    if (!n) return ''
    if (n === p) return ''
    if (n.startsWith(p)) {
      return n.slice(p.length).trim()
    }

    // Fallback: compute common prefix length
    const minLen = Math.min(p.length, n.length)
    let i = 0
    while (i < minLen && p[i] === n[i]) i++
    return n.slice(i).trim()
  }

  const unlockTts = () => {
    if (ttsUnlockedRef.current) return
    try {
      const u = new SpeechSynthesisUtterance('')
      u.volume = 0
      speechSynthesis.speak(u)
      speechSynthesis.cancel()
      ttsUnlockedRef.current = true
      setShowTtsEnablePrompt(false)

      if (pendingSpeechRef.current) {
        const pending = pendingSpeechRef.current
        pendingSpeechRef.current = null
        speakText(pending.text, pending.language, pending.interrupt)
      }

      speakNextFromQueue()
    } catch (e) {
      // ignore
    }
  }

  // Chrome often requires a user gesture before speech will play.
  // Unlock on the first pointer/keyboard gesture anywhere on the page.
  useEffect(() => {
    const handleFirstGesture = () => unlockTts()
    window.addEventListener('pointerdown', handleFirstGesture, { once: true })
    window.addEventListener('keydown', handleFirstGesture, { once: true })
    return () => {
      window.removeEventListener('pointerdown', handleFirstGesture)
      window.removeEventListener('keydown', handleFirstGesture)
    }
  }, [])

  // Speak translated captions in (near) real-time by speaking only the delta since the last translated caption.
  useEffect(() => {
    const next = (translatedCaption || '').trim()
    if (!next) return

    const prev = lastTranslatedCaptionRef.current
    const delta = computeDelta(prev, next)
    lastTranslatedCaptionRef.current = next

    if (!delta) return

    const now = Date.now()
    const deltaKey = normalizeSpeechKey(delta)
    if (deltaKey && deltaKey === lastDeltaKeyRef.current && now - lastDeltaAtRef.current < 2500) {
      return
    }
    lastDeltaKeyRef.current = deltaKey
    lastDeltaAtRef.current = now

    const lang = getSpeechRecognitionLang(targetLanguage)

    // We add a debounce to all languages to give the speech-to-text / translation API 
    // time to construct the grammar boundary (e.g. "what happens is" vs "what happens") 
    // without prematurely locking the speech synth and firing duplicates.
    const isTranslating = captionLanguage !== targetLanguage
    const maxLatencyMs = isTranslating ? 2500 : 1200
    const debounceMs = isTranslating ? 600 : 450

    // Add delta to buffer and flush in small chunks for speech pacing.
    deltaBufferRef.current = `${deltaBufferRef.current} ${delta}`.trim()

    const endsWithPunctuation = /[.!?…。！？]$/.test(delta)
    const bufferWordCount = deltaBufferRef.current.split(/\s+/).filter(Boolean).length
    const bufferLongEnough = bufferWordCount >= (isTranslating ? 8 : 4)
    const exceededMaxLatency = lastDeltaFlushAtRef.current > 0 && now - lastDeltaFlushAtRef.current >= maxLatencyMs

    if (endsWithPunctuation || bufferLongEnough || exceededMaxLatency) {
      if (deltaFlushTimerRef.current) {
        window.clearTimeout(deltaFlushTimerRef.current)
        deltaFlushTimerRef.current = null
      }
      flushDeltaBuffer(lang)
      return
    }

    if (deltaFlushTimerRef.current) {
      window.clearTimeout(deltaFlushTimerRef.current)
    }
    deltaFlushTimerRef.current = window.setTimeout(() => {
      deltaFlushTimerRef.current = null
      flushDeltaBuffer(lang)
    }, debounceMs)
  }, [translatedCaption, targetLanguage, captionLanguage])

  // When the viewer switches languages mid-stream, reset speech state so that
  // computeDelta doesn't compare old-language text against new-language text
  // (which would produce garbage deltas or silence).
  useEffect(() => {
    lastTranslatedCaptionRef.current = ''
    deltaBufferRef.current = ''
    lastDeltaKeyRef.current = ''
    lastDeltaAtRef.current = 0
    lastDeltaFlushAtRef.current = 0
    recentSpeechKeysRef.current.clear()
    lastQueuedSpeechKeyRef.current = ''
    speechQueueRef.current = []
    if (deltaFlushTimerRef.current) {
      window.clearTimeout(deltaFlushTimerRef.current)
      deltaFlushTimerRef.current = null
    }
    // Cancel any in-progress speech so the old language doesn't keep talking
    try { speechSynthesis.cancel() } catch (_) { }
    isQueueSpeakingRef.current = false
  }, [targetLanguage])

  // Ensure voices are loaded (some browsers load them async)
  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return

    const synth = window.speechSynthesis
    const loadVoices = () => {
      const voices = synth.getVoices()
      if (voices && voices.length > 0) {
        setTtsVoicesReady(true)
      }
    }

    loadVoices()
    synth.addEventListener('voiceschanged', loadVoices)
    return () => {
      synth.removeEventListener('voiceschanged', loadVoices)
    }
  }, [])

  useEffect(() => {
    if (!onLiveCaptionBroadcast || !isLive || disableLocalTranscription) return
    const normalized = currentCaption.trim()
    if (!normalized || normalized === lastBroadcastCaptionRef.current) return

    lastBroadcastCaptionRef.current = normalized
    onLiveCaptionBroadcast(normalized)
  }, [currentCaption, disableLocalTranscription, isLive, onLiveCaptionBroadcast])

  useEffect(() => {
    if (!isLive || !disableLocalTranscription) return
    // Reset speech delta state when entering viewer mode to avoid skipping first spoken caption.
    lastTranslatedCaptionRef.current = ''
    lastDeltaKeyRef.current = ''
    lastDeltaAtRef.current = 0
    deltaBufferRef.current = ''
    lastIncomingCaptionRef.current = ''
  }, [isLive, disableLocalTranscription])

  useEffect(() => {
    if (!disableLocalTranscription || !isLive) return

    const normalized = (incomingSharedCaption || '').trim()
    if (!normalized || normalized === lastIncomingCaptionRef.current) return

    // Attempt TTS unlock as soon as shared captions start arriving on viewer devices.
    unlockTts()
    if (!ttsUnlockedRef.current) {
      setShowTtsEnablePrompt(true)
    }

    lastIncomingCaptionRef.current = normalized
    setCurrentCaption(normalized)

    if (captionLanguage === targetLanguage) {
      setTranslatedCaption(normalized)
      return
    }

    // We do NOT want to instantly read the entire translated sentence aloud.
    // The previous useEffect block specifically monitors `translatedCaption`
    // and calculates chronological DELTAS for the TTS synth. Setting this to `true`
    // completely bypasses delta chunking and stutters the entire history.
    translateText(normalized, captionLanguage, targetLanguage, false, false)
  }, [
    incomingSharedCaption,
    disableLocalTranscription,
    isLive,
    captionLanguage,
    targetLanguage,
  ])

  useEffect(() => {
    return () => {
      clearAnswerTypingTimer()
      if (shareCopiedTimeoutRef.current) {
        window.clearTimeout(shareCopiedTimeoutRef.current)
        shareCopiedTimeoutRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    if (!isLive) return

    const onResize = () => measureLiveLayout()
    onResize()
    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('resize', onResize)
    }
  }, [isLive, measureLiveLayout])

  // Auto-follow framing for live camera: track the speaker and keep them centered.
  useEffect(() => {
    if (trackingIntervalRef.current) {
      window.clearInterval(trackingIntervalRef.current)
      trackingIntervalRef.current = null
    }
    isTrackingFrameRef.current = false
    previousMotionFrameRef.current = null

    if (!isLive || !liveStream || sessionRole !== 'host' || !autoFollowEnabled) {
      setAutoFollowStatus('off')
      const center = { x: 50, y: 50 }
      followPointRef.current = center
      setFollowPoint(center)
      return
    }

    const video = videoRef.current
    if (!video) return

    let cancelled = false
    let canUseMotion = false

    try {
      canUseMotion = !!document.createElement('canvas').getContext('2d')
    } catch (error) {
      canUseMotion = false
    }

    const FaceDetectorCtor = (window as any).FaceDetector
    faceDetectorRef.current = null

    if (FaceDetectorCtor) {
      try {
        faceDetectorRef.current = new FaceDetectorCtor({
          fastMode: true,
          maxDetectedFaces: 1,
        })
        setAutoFollowStatus('face')
      } catch (error) {
        console.warn('FaceDetector unavailable, falling back to motion tracking')
        setAutoFollowStatus(canUseMotion ? 'motion' : 'unsupported')
      }
    } else {
      setAutoFollowStatus(canUseMotion ? 'motion' : 'unsupported')
    }

    if (!faceDetectorRef.current && !canUseMotion) {
      return
    }

    trackingIntervalRef.current = window.setInterval(async () => {
      if (cancelled || isTrackingFrameRef.current) return

      const activeVideo = videoRef.current
      if (!activeVideo || activeVideo.readyState < 2 || !activeVideo.videoWidth || !activeVideo.videoHeight) {
        return
      }

      isTrackingFrameRef.current = true
      try {
        let foundTarget = false

        if (faceDetectorRef.current) {
          const faces = await faceDetectorRef.current.detect(activeVideo)
          if (faces?.length) {
            const face = faces[0].boundingBox
            const targetX = ((face.x + face.width / 2) / activeVideo.videoWidth) * 100
            const targetY = ((face.y + face.height * 0.5) / activeVideo.videoHeight) * 100
            updateFollowPoint(targetX, targetY)
            foundTarget = true
          }
        }

        if (!foundTarget && canUseMotion) {
          const motionTarget = detectMotionTarget(activeVideo)
          if (motionTarget) {
            updateFollowPoint(motionTarget.x, motionTarget.y)
          }
        }
      } catch (error) {
        console.warn('Auto-follow tracking error:', error)
      } finally {
        isTrackingFrameRef.current = false
      }
    }, 70)

    return () => {
      cancelled = true
      if (trackingIntervalRef.current) {
        window.clearInterval(trackingIntervalRef.current)
        trackingIntervalRef.current = null
      }
      isTrackingFrameRef.current = false
      previousMotionFrameRef.current = null
    }
  }, [isLive, liveStream, autoFollowEnabled, detectMotionTarget, updateFollowPoint, sessionRole])

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
    if (!isLive || !liveStream || disableLocalTranscription) {
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
          const interimThrottleMs = 450
          if (
            interimText !== lastInterimSourceRef.current &&
            now - lastInterimTranslateAtRef.current >= interimThrottleMs
          ) {
            lastInterimSourceRef.current = interimText
            lastInterimTranslateAtRef.current = now
            translateText(interimText, captionLanguage, targetLanguage, false, false)
          }
        }

        // Process final results
        if (finalTranscript.trim()) {
          const finalText = finalTranscript.trim()
          setCurrentCaption(finalText)
          // Only translate final results to reduce API calls and avoid rate limiting
          // Only update caption translation; speaking is driven by translatedCaption delta effect
          if (finalText !== lastFinalSourceRef.current) {
            lastFinalSourceRef.current = finalText
            lastInterimSourceRef.current = ''
            translateText(finalText, captionLanguage, targetLanguage, true, false)
          }

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
        unlockTts()
        lastInterimSourceRef.current = ''
        lastFinalSourceRef.current = ''
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
  }, [isLive, liveStream, captionLanguage, sessionStartTime, disableLocalTranscription]) // Removed currentCaption from deps to prevent re-renders

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
      unlockTts()
      if (isPlaying) {
        videoRef.current.pause()
      } else {
        videoRef.current.play()
      }
    }
  }

  const toggleMute = () => {
    if (videoRef.current) {
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
          targetLanguage: targetLanguage,
        }),
      })

      const data = await response.json()

      if (data.error) {
        throw new Error(data.error)
      }

      const interactionId = Date.now().toString()
      const finalExplanation = (data.explanation || '').trim()

      const newInteraction: Interaction = {
        id: interactionId,
        timestamp,
        image: imageData,
        question,
        answer: '',
        transcriptSnippet,
      }

      setInteractions((prev) => [...prev, newInteraction])
      setShowBoundingBoxDrawer(true)
      setDrawnBox(null)
      streamAnswerToPanel(interactionId, finalExplanation)
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

  const hasLiveFrame =
    liveLayout.videoWidth > 0 &&
    liveLayout.videoHeight > 0 &&
    liveLayout.containerWidth > 0 &&
    liveLayout.containerHeight > 0
  const horizontalEdge = Math.abs(followPoint.x - 50) / 50
  const targetZoom = 1.75 + horizontalEdge * 0.28
  const liveZoom =
    isLive && autoFollowEnabled && autoFollowStatus !== 'unsupported' && hasLiveFrame ? targetZoom : 1
  const containerRatio =
    liveLayout.containerHeight > 0 ? liveLayout.containerWidth / liveLayout.containerHeight : 0
  const videoRatio = liveLayout.videoHeight > 0 ? liveLayout.videoWidth / liveLayout.videoHeight : 0
  let displayWidth = 0
  let displayHeight = 0
  if (containerRatio > 0 && videoRatio > 0) {
    // Live camera is rendered with object-cover, so the video must always fill the container.
    if (videoRatio > containerRatio) {
      displayHeight = liveLayout.containerHeight
      displayWidth = liveLayout.containerHeight * videoRatio
    } else {
      displayWidth = liveLayout.containerWidth
      displayHeight = liveLayout.containerWidth / videoRatio
    }
  }
  const sourceToDisplayX = displayWidth > 0 ? liveLayout.videoWidth / displayWidth : 1
  const sourceToDisplayY = displayHeight > 0 ? liveLayout.videoHeight / displayHeight : 1
  const sourceDetailRatio = Math.min(sourceToDisplayX, sourceToDisplayY)
  const maxQualityZoom = clampNumber(1 + Math.max(0, sourceDetailRatio - 1) * 1.12, 1.25, 2.05)
  const effectiveLiveZoom = Math.min(liveZoom, maxQualityZoom)
  const scaledWidth = displayWidth * effectiveLiveZoom
  const scaledHeight = displayHeight * effectiveLiveZoom
  const maxPanX = Math.max(0, (scaledWidth - liveLayout.containerWidth) / 2)
  const maxPanY = Math.max(0, (scaledHeight - liveLayout.containerHeight) / 2)
  const maxPanPercentX = displayWidth > 0 ? (maxPanX / displayWidth) * 100 : 0
  const maxPanPercentY = displayHeight > 0 ? (maxPanY / displayHeight) * 100 : 0
  const panGainX = 1.65
  const panGainY = 0.95
  const liveTranslateX =
    effectiveLiveZoom > 1
      ? clampNumber(((50 - followPoint.x) / 50) * maxPanPercentX * panGainX, -maxPanPercentX, maxPanPercentX)
      : 0
  const liveTranslateY =
    effectiveLiveZoom > 1
      ? clampNumber(((50 - followPoint.y) / 50) * maxPanPercentY * panGainY, -maxPanPercentY, maxPanPercentY)
      : 0
  const hasIncomingViewport =
    sessionRole === 'viewer' &&
    !!incomingLiveViewport &&
    Number.isFinite(incomingLiveViewport.translateX) &&
    Number.isFinite(incomingLiveViewport.translateY) &&
    Number.isFinite(incomingLiveViewport.zoom)
  const renderedTranslateX = hasIncomingViewport ? incomingLiveViewport.translateX : liveTranslateX
  const renderedTranslateY = hasIncomingViewport ? incomingLiveViewport.translateY : liveTranslateY
  const renderedZoom = hasIncomingViewport ? incomingLiveViewport.zoom : effectiveLiveZoom
  const renderedAutoFollowEnabled = hasIncomingViewport
    ? incomingLiveViewport.autoFollowEnabled
    : autoFollowEnabled
  const renderedAutoFollowStatus = hasIncomingViewport
    ? incomingLiveViewport.autoFollowStatus
    : autoFollowStatus

  useEffect(() => {
    if (!isLive || sessionRole !== 'host' || !onLiveViewportBroadcast) return

    const payload = {
      translateX: Number(renderedTranslateX.toFixed(2)),
      translateY: Number(renderedTranslateY.toFixed(2)),
      zoom: Number(renderedZoom.toFixed(4)),
      autoFollowEnabled,
      autoFollowStatus,
    }
    const serialized = JSON.stringify(payload)
    if (serialized === lastViewportBroadcastRef.current) return

    lastViewportBroadcastRef.current = serialized
    onLiveViewportBroadcast(payload)
  }, [
    isLive,
    sessionRole,
    onLiveViewportBroadcast,
    renderedTranslateX,
    renderedTranslateY,
    renderedZoom,
    autoFollowEnabled,
    autoFollowStatus,
  ])

  return (
    <div className="flex h-screen bg-gray-900">
      {/* Main Video Area */}
      <div className="flex-1 flex flex-col">
        <div
          ref={containerRef}
          className="relative flex-1 bg-black flex items-center justify-center overflow-hidden"
        >
          <video
            ref={videoRef}
            src={videoUrl}
            className={
              isLive
                ? 'absolute inset-0 w-full h-full object-cover transition-transform duration-180 ease-out will-change-transform'
                : 'max-w-full max-h-full'
            }
            style={
              isLive
                ? {
                  transform: `translate3d(${renderedTranslateX}%, ${renderedTranslateY}%, 0) scale(${renderedZoom})`,
                  transformOrigin: 'center center',
                }
                : undefined
            }
            onClick={() => {
              unlockTts()
              togglePlay()
            }}
            autoPlay={isLive}
            playsInline
            muted={isLive ? sessionRole === 'host' || isMuted : isMuted}
            onLoadedMetadata={() => {
              if (isLive && videoRef.current) {
                console.log('Live video metadata loaded')
                measureLiveLayout()
              }
            }}
            onCanPlay={() => {
              if (isLive && videoRef.current && videoRef.current.paused) {
                videoRef.current.play().catch(err => {
                  console.error('Auto-play prevented:', err)
                })
              }
              if (isLive) {
                measureLiveLayout()
              }
            }}
          />

          {isLive && sessionRole === 'host' && (
            <div className="absolute top-4 left-4 z-30 flex flex-col gap-2">
              <button
                onClick={() => setAutoFollowEnabled((prev) => !prev)}
                className="bg-black/70 text-white text-xs px-3 py-2 rounded-lg border border-white/20 hover:bg-black/80 transition-colors"
              >
                {autoFollowEnabled ? 'Auto Follow: ON' : 'Auto Follow: OFF'}
              </button>
              {autoFollowEnabled && autoFollowStatus !== 'off' && (
                <div className="bg-black/60 text-white/90 text-[11px] px-3 py-1.5 rounded-lg border border-white/10">
                  {autoFollowStatus === 'face' && 'Tracking: Face'}
                  {autoFollowStatus === 'motion' && 'Tracking: Motion'}
                  {autoFollowStatus === 'unsupported' && 'Tracking unavailable in this browser'}
                </div>
              )}
            </div>
          )}

          {isLive && sessionRole === 'viewer' && (
            <div className="absolute top-4 left-4 z-30 flex flex-col gap-2">
              <div className="bg-black/70 text-white text-xs px-3 py-2 rounded-lg border border-white/20">
                {renderedAutoFollowEnabled ? 'Host Auto Follow: ON' : 'Host Auto Follow: OFF'}
              </div>
              {renderedAutoFollowEnabled && renderedAutoFollowStatus !== 'off' && (
                <div className="bg-black/60 text-white/90 text-[11px] px-3 py-1.5 rounded-lg border border-white/10">
                  {renderedAutoFollowStatus === 'face' && 'Tracking: Face'}
                  {renderedAutoFollowStatus === 'motion' && 'Tracking: Motion'}
                  {renderedAutoFollowStatus === 'unsupported' && 'Tracking unavailable in this browser'}
                </div>
              )}
            </div>
          )}

          {isLive && sessionRole === 'host' && sessionShareUrl && (
            <div className="absolute top-4 right-4 z-30 max-w-sm bg-black/75 text-white rounded-xl border border-white/15 p-3 backdrop-blur">
              <p className="text-[11px] uppercase tracking-wide text-white/70 mb-1">Classroom link</p>
              <div className="mb-2 rounded-lg bg-white p-2">
                {sessionQrCodeDataUrl ? (
                  <Image
                    src={sessionQrCodeDataUrl}
                    alt="QR code for joining the live classroom session"
                    width={144}
                    height={144}
                    unoptimized
                    className="w-36 h-36 object-contain mx-auto"
                  />
                ) : (
                  <div className="w-36 h-36 flex items-center justify-center text-xs text-gray-600 text-center mx-auto px-2">
                    {sessionQrCodeError ? 'QR unavailable' : 'Generating QR...'}
                  </div>
                )}
              </div>
              <p className="text-[11px] text-white/80 mb-2">Scan to join from any device on the same network.</p>
              <p className="text-xs break-all text-white/95">{sessionShareUrl}</p>
              <button
                onClick={copyShareLink}
                className="mt-2 w-full rounded-md bg-white/15 hover:bg-white/25 text-xs font-semibold py-1.5 transition-colors"
              >
                {shareLinkCopied ? 'Copied' : 'Copy link'}
              </button>
            </div>
          )}

          {isLive && sessionStatusMessage && (
            <div className="absolute top-20 left-4 z-30 max-w-sm bg-black/70 text-white text-xs px-3 py-2 rounded-lg border border-white/15">
              {sessionStatusMessage}
            </div>
          )}

          {isLive && sessionRole === 'viewer' && onTargetLanguageChange && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 w-[min(92vw,420px)] bg-black/75 text-white rounded-xl border border-white/20 p-3 backdrop-blur">
              <label className="block text-[12px] font-semibold tracking-wide text-white/90 mb-2">
                Caption language for this viewer
              </label>
              <select
                value={targetLanguage}
                onChange={(event) => onTargetLanguageChange(event.target.value)}
                className="w-full rounded-lg border border-white/30 bg-white text-gray-900 px-4 py-3 text-base font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-label="Caption language for this viewer"
              >
                {viewerCaptionLanguages.map((language) => (
                  <option key={language.code} value={language.code}>
                    {language.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Transcription Loading Indicator - only show if actually transcribing */}
          {isTranscribing && !currentCaption && (
            <div className="absolute top-32 left-4 bg-black bg-opacity-75 text-white px-4 py-2 rounded-lg">
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

          {isLive && disableLocalTranscription && showTtsEnablePrompt && (
            <button
              onClick={() => {
                unlockTts()
                if (ttsUnlockedRef.current) {
                  setShowTtsEnablePrompt(false)
                }
              }}
              className="absolute bottom-36 left-1/2 -translate-x-1/2 z-40 px-4 py-2 rounded-lg bg-black/75 text-white text-sm font-semibold border border-white/20 hover:bg-black/85 transition-colors"
            >
              Tap to enable spoken captions
            </button>
          )}

          {/* Box Question Handler - always enabled for live streams */}
          {isLive && showBoundingBoxDrawer && (
            <BoundingBoxDrawer
              onComplete={(box) => {
                setDrawnBox(box)
                setShowQuestionPanel(true)
              }}
              onCancel={() => {
                setShowQuestionPanel(false)
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
                    className="w-full px-5 py-3.5 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-base font-medium placeholder:text-gray-500 bg-gray-50 focus:bg-white"
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
                    className="w-full px-5 py-3.5 bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition-all duration-200 text-base font-semibold"
                  >
                    Ask
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Hint bubble for box drawing */}
          {isLive && (
            <div
              className="absolute bottom-28 right-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-5 py-3 rounded-xl shadow-2xl z-30 border border-blue-400 backdrop-blur-sm transform transition-all duration-300 hover:scale-105"
            >
              <p className="text-sm font-semibold flex items-center gap-2">
                <span className="text-lg">✨</span>
                Draw a box to ask questions
              </p>
            </div>
          )}
        </div>

        {/* Video Controls */}
        <div className="bg-gray-800 p-4">
          <div className="flex items-center gap-4 mb-2">
            {!isLive && (
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
            )}

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
    </div>
  )
}
