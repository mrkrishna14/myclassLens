'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import VideoPlayer from '@/components/VideoPlayer'
import UploadInterface from '@/components/UploadInterface'
import LiveCameraInterface from '@/components/LiveCameraInterface'

type Mode = 'select' | 'upload' | 'live' | 'join' | 'playing'
type SessionRole = 'host' | 'viewer' | null
type LiveSignalType = 'offer' | 'answer' | 'ice-candidate' | 'caption' | 'viewport' | 'session-ended'

interface SessionMessage {
  id: string
  type: LiveSignalType
  fromParticipantId: string
  payload: any
  createdAt: number
}

interface CreateSessionResponse {
  sessionId: string
  participantId: string
  hostParticipantId: string
  metadata: {
    captionLanguage: string
    targetLanguage: string
    aiLanguage: string
    createdAt: number
  }
  shareUrl: string
  fallbackUrl: string
}

interface JoinSessionResponse {
  sessionId: string
  participantId: string
  hostParticipantId: string
  metadata: {
    captionLanguage: string
    targetLanguage: string
    aiLanguage: string
    createdAt: number
  }
}

interface OfferSignalPayload {
  description: RTCSessionDescriptionInit
  attemptId?: number
}

interface AnswerSignalPayload {
  description: RTCSessionDescriptionInit
  attemptId?: number
}

interface IceSignalPayload {
  candidate: RTCIceCandidateInit
  attemptId?: number
}

interface ViewportSignalPayload {
  translateX: number
  translateY: number
  zoom: number
  autoFollowEnabled: boolean
  autoFollowStatus: 'off' | 'face' | 'motion' | 'unsupported'
}

interface PendingHostCandidate {
  candidate: RTCIceCandidateInit
  attemptId?: number
}

interface SignalResponse {
  ok: boolean
  delivered: number
}

interface ViewerDiagnostics {
  attemptId: number
  answerReceived: boolean
  localIceCount: number
  remoteIceCount: number
  connectionState: RTCPeerConnectionState | 'unknown'
  iceConnectionState: RTCIceConnectionState | 'unknown'
}

const VIEWER_CONNECT_TIMEOUT_MS = 25000
const HOST_VIDEO_MAX_BITRATE_BPS = 6_000_000
const HOST_VIDEO_MAX_FPS = 30

const parseServerUrls = (value: string | undefined) =>
  (value || '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)

const parseIceServersFromJson = (rawValue: string | undefined): RTCIceServer[] => {
  if (!rawValue) return []

  try {
    const parsed = JSON.parse(rawValue) as unknown
    const asList = Array.isArray(parsed) ? parsed : [parsed]
    return asList
      .filter((entry): entry is RTCIceServer => {
        if (!entry || typeof entry !== 'object') return false
        const candidate = entry as { urls?: unknown }
        return (
          typeof candidate.urls === 'string' ||
          (Array.isArray(candidate.urls) && candidate.urls.length > 0)
        )
      })
      .map((entry) => ({ ...entry }))
  } catch (error) {
    console.warn('Failed to parse NEXT_PUBLIC_ICE_SERVERS_JSON:', error)
    return []
  }
}

const buildRtcConfiguration = (): RTCConfiguration => {
  const defaultStun: RTCIceServer = { urls: 'stun:stun.l.google.com:19302' }
  const jsonIceServers = parseIceServersFromJson(process.env.NEXT_PUBLIC_ICE_SERVERS_JSON)
  const configuredStunUrls = parseServerUrls(process.env.NEXT_PUBLIC_STUN_URLS)
  const configuredIceServers: RTCIceServer[] = []

  if (configuredStunUrls.length > 0) {
    configuredIceServers.push({
      urls: configuredStunUrls.length === 1 ? configuredStunUrls[0] : configuredStunUrls,
    })
  }

  const iceServers = [
    defaultStun,
    ...jsonIceServers,
    ...configuredIceServers,
  ]

  const uniqueIceServers = iceServers.filter((server, index, list) => {
    const serialized = JSON.stringify(server)
    return list.findIndex((candidate) => JSON.stringify(candidate) === serialized) === index
  })

  return {
    iceServers: uniqueIceServers.length > 0 ? uniqueIceServers : [defaultStun],
  }
}

const RTC_CONFIGURATION: RTCConfiguration = buildRtcConfiguration()

const optimizeOutgoingTrack = (track: MediaStreamTrack) => {
  if (track.kind === 'video') {
    try {
      track.contentHint = 'detail'
    } catch {
      // Some browsers may not allow setting contentHint.
    }
  }
}

const tuneSenderForQuality = async (sender: RTCRtpSender, trackKind: 'audio' | 'video') => {
  if (trackKind !== 'video') return
  if (typeof sender.getParameters !== 'function' || typeof sender.setParameters !== 'function') return

  try {
    const params = sender.getParameters()
    const currentEncodings =
      Array.isArray(params.encodings) && params.encodings.length > 0 ? params.encodings : [{}]
    const nextEncodings = currentEncodings.map((encoding) => ({
      ...encoding,
      maxBitrate:
        typeof encoding.maxBitrate === 'number'
          ? Math.max(encoding.maxBitrate, HOST_VIDEO_MAX_BITRATE_BPS)
          : HOST_VIDEO_MAX_BITRATE_BPS,
      maxFramerate:
        typeof encoding.maxFramerate === 'number'
          ? Math.max(encoding.maxFramerate, HOST_VIDEO_MAX_FPS)
          : HOST_VIDEO_MAX_FPS,
      scaleResolutionDownBy: 1,
    }))

    await sender.setParameters({
      ...params,
      encodings: nextEncodings,
    })
  } catch (error) {
    console.warn('Could not tune outgoing sender quality:', error)
  }
}

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

const parseSessionInput = (value: string) => {
  const trimmed = value.trim()
  if (!trimmed) return ''

  try {
    const parsed = new URL(trimmed)
    const querySession = parsed.searchParams.get('session')
    if (querySession) return querySession.trim()

    const pathParts = parsed.pathname.split('/').filter(Boolean)
    return pathParts[pathParts.length - 1] || ''
  } catch {
    return trimmed
  }
}

const parseOfferSignalPayload = (payload: unknown): OfferSignalPayload => {
  const maybeObject = payload as { description?: unknown; attemptId?: unknown } | null
  if (
    maybeObject &&
    typeof maybeObject === 'object' &&
    maybeObject.description &&
    typeof maybeObject.description === 'object'
  ) {
    return {
      description: maybeObject.description as RTCSessionDescriptionInit,
      attemptId:
        typeof maybeObject.attemptId === 'number' && Number.isFinite(maybeObject.attemptId)
          ? maybeObject.attemptId
          : undefined,
    }
  }
  return { description: payload as RTCSessionDescriptionInit }
}

const parseAnswerSignalPayload = (payload: unknown): AnswerSignalPayload => {
  const maybeObject = payload as { description?: unknown; attemptId?: unknown } | null
  if (
    maybeObject &&
    typeof maybeObject === 'object' &&
    maybeObject.description &&
    typeof maybeObject.description === 'object'
  ) {
    return {
      description: maybeObject.description as RTCSessionDescriptionInit,
      attemptId:
        typeof maybeObject.attemptId === 'number' && Number.isFinite(maybeObject.attemptId)
          ? maybeObject.attemptId
          : undefined,
    }
  }
  return { description: payload as RTCSessionDescriptionInit }
}

const parseIceSignalPayload = (payload: unknown): IceSignalPayload => {
  const maybeObject = payload as { candidate?: unknown; attemptId?: unknown } | null
  if (
    maybeObject &&
    typeof maybeObject === 'object' &&
    maybeObject.candidate &&
    typeof maybeObject.candidate === 'object'
  ) {
    return {
      candidate: maybeObject.candidate as RTCIceCandidateInit,
      attemptId:
        typeof maybeObject.attemptId === 'number' && Number.isFinite(maybeObject.attemptId)
          ? maybeObject.attemptId
          : undefined,
    }
  }
  return { candidate: payload as RTCIceCandidateInit }
}

const parseViewportSignalPayload = (payload: unknown): ViewportSignalPayload | null => {
  const maybeObject = payload as Partial<ViewportSignalPayload> | null
  if (!maybeObject || typeof maybeObject !== 'object') return null

  const { translateX, translateY, zoom, autoFollowEnabled, autoFollowStatus } = maybeObject
  const validStatus =
    autoFollowStatus === 'off' ||
    autoFollowStatus === 'face' ||
    autoFollowStatus === 'motion' ||
    autoFollowStatus === 'unsupported'

  if (
    typeof translateX !== 'number' ||
    !Number.isFinite(translateX) ||
    typeof translateY !== 'number' ||
    !Number.isFinite(translateY) ||
    typeof zoom !== 'number' ||
    !Number.isFinite(zoom) ||
    typeof autoFollowEnabled !== 'boolean' ||
    !validStatus
  ) {
    return null
  }

  return {
    translateX,
    translateY,
    zoom,
    autoFollowEnabled,
    autoFollowStatus,
  }
}

export default function Home() {
  const searchParams = useSearchParams()
  const [mode, setMode] = useState<Mode>('select')
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [liveStream, setLiveStream] = useState<MediaStream | null>(null)
  const [captionLanguage, setCaptionLanguage] = useState<string>('en')
  const [targetLanguage, setTargetLanguage] = useState<string>('en')
  const [aiLanguage, setAiLanguage] = useState<string>('en')
  const [sessionRole, setSessionRole] = useState<SessionRole>(null)
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)
  const [participantId, setParticipantId] = useState<string | null>(null)
  const [hostParticipantId, setHostParticipantId] = useState<string | null>(null)
  const [sessionShareUrl, setSessionShareUrl] = useState<string>('')
  const [fallbackShareUrl, setFallbackShareUrl] = useState<string>('')
  const [pendingJoinSession, setPendingJoinSession] = useState<string>('')
  const [sessionError, setSessionError] = useState<string>('')
  const [sessionStatusMessage, setSessionStatusMessage] = useState<string>('')
  const [isJoiningSession, setIsJoiningSession] = useState(false)
  const [incomingSharedCaption, setIncomingSharedCaption] = useState('')
  const [incomingLiveViewport, setIncomingLiveViewport] = useState<ViewportSignalPayload | null>(null)

  const hostPeerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map())
  const viewerPeerRef = useRef<RTCPeerConnection | null>(null)
  const pendingHostCandidatesRef = useRef<Map<string, PendingHostCandidate[]>>(new Map())
  const pendingViewerCandidatesRef = useRef<RTCIceCandidateInit[]>([])
  const lastBroadcastCaptionRef = useRef('')
  const lastBroadcastViewportRef = useRef('')

  const hostStreamRef = useRef<MediaStream | null>(null)
  const sessionRoleRef = useRef<SessionRole>(null)
  const activeSessionIdRef = useRef<string | null>(null)
  const participantIdRef = useRef<string | null>(null)
  const autoJoinAttemptRef = useRef<string | null>(null)
  const viewerConnectTimeoutRef = useRef<number | null>(null)
  const viewerConnectionAttemptRef = useRef(0)
  const hostViewerAttemptMapRef = useRef<Map<string, number>>(new Map())
  const viewerIceErrorRef = useRef('')
  const viewerDiagnosticsRef = useRef<ViewerDiagnostics>({
    attemptId: 0,
    answerReceived: false,
    localIceCount: 0,
    remoteIceCount: 0,
    connectionState: 'unknown',
    iceConnectionState: 'unknown',
  })

  useEffect(() => {
    hostStreamRef.current = liveStream
  }, [liveStream])

  useEffect(() => {
    sessionRoleRef.current = sessionRole
  }, [sessionRole])

  useEffect(() => {
    activeSessionIdRef.current = activeSessionId
  }, [activeSessionId])

  useEffect(() => {
    participantIdRef.current = participantId
  }, [participantId])

  useEffect(() => {
    const handleBeforeUnload = () => {
      const sessionId = activeSessionIdRef.current
      const currentParticipantId = participantIdRef.current
      if (!sessionId || !currentParticipantId) return

      const payload = JSON.stringify({
        action: 'leave',
        sessionId,
        participantId: currentParticipantId,
      })
      const blob = new Blob([payload], { type: 'application/json' })
      navigator.sendBeacon('/api/live-session', blob)
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [])

  const sessionRequest = useCallback(async <T,>(payload: Record<string, unknown>) => {
    const response = await fetch('/api/live-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    const data = await response.json().catch(() => ({}))
    if (!response.ok) {
      const errorMessage =
        typeof data.error === 'string' ? data.error : 'Session request failed'
      throw new Error(errorMessage)
    }

    return data as T
  }, [])

  const closeAllPeerConnections = useCallback(() => {
    if (viewerConnectTimeoutRef.current !== null) {
      window.clearTimeout(viewerConnectTimeoutRef.current)
      viewerConnectTimeoutRef.current = null
    }

    hostPeerConnectionsRef.current.forEach((pc) => {
      try {
        pc.close()
      } catch {
        // Ignore close errors.
      }
    })
    hostPeerConnectionsRef.current.clear()
    hostViewerAttemptMapRef.current.clear()

    if (viewerPeerRef.current) {
      try {
        viewerPeerRef.current.close()
      } catch {
        // Ignore close errors.
      }
      viewerPeerRef.current = null
    }

    pendingHostCandidatesRef.current.clear()
    pendingViewerCandidatesRef.current = []
  }, [])

  const leaveActiveSession = useCallback(async () => {
    const sessionId = activeSessionIdRef.current
    const currentParticipantId = participantIdRef.current

    if (sessionId && currentParticipantId) {
      try {
        await sessionRequest({
          action: 'leave',
          sessionId,
          participantId: currentParticipantId,
        })
      } catch {
        // Ignore network errors during cleanup.
      }
    }

    closeAllPeerConnections()
    setSessionRole(null)
    setActiveSessionId(null)
    setParticipantId(null)
    setHostParticipantId(null)
    setSessionShareUrl('')
    setFallbackShareUrl('')
    setIncomingSharedCaption('')
    setIncomingLiveViewport(null)
    setSessionError('')
    setSessionStatusMessage('')
    lastBroadcastCaptionRef.current = ''
    lastBroadcastViewportRef.current = ''
  }, [closeAllPeerConnections, sessionRequest])

  const sendSignal = useCallback(
    async (type: LiveSignalType, payload: unknown, toParticipantId?: string) => {
      const sessionId = activeSessionIdRef.current
      const fromParticipantId = participantIdRef.current
      if (!sessionId || !fromParticipantId) return

      try {
        await sessionRequest({
          action: 'signal',
          sessionId,
          fromParticipantId,
          toParticipantId,
          type,
          payload,
        })
      } catch (error) {
        console.error('Failed to send session signal:', error)
      }
    },
    [sessionRequest]
  )

  const createHostPeerConnection = useCallback(
    (viewerId: string, forceRestart: boolean = false) => {
      const existing = hostPeerConnectionsRef.current.get(viewerId)
      if (existing && !forceRestart) return existing

      if (existing) {
        try {
          existing.close()
        } catch {
          // Ignore close errors.
        }
        hostPeerConnectionsRef.current.delete(viewerId)
      }

      const pc = new RTCPeerConnection(RTC_CONFIGURATION)
      hostPeerConnectionsRef.current.set(viewerId, pc)

      const stream = hostStreamRef.current
      if (stream) {
        for (const track of stream.getTracks()) {
          optimizeOutgoingTrack(track)
          const sender = pc.addTrack(track, stream)
          void tuneSenderForQuality(sender, track.kind as 'audio' | 'video')
        }
      }

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          const attemptId = hostViewerAttemptMapRef.current.get(viewerId)
          void sendSignal(
            'ice-candidate',
            {
              candidate: event.candidate.toJSON(),
              attemptId,
            } satisfies IceSignalPayload,
            viewerId
          )
        }
      }

      pc.onconnectionstatechange = () => {
        if (
          pc.connectionState === 'failed' ||
          pc.connectionState === 'closed' ||
          pc.connectionState === 'disconnected'
        ) {
          hostPeerConnectionsRef.current.delete(viewerId)
          hostViewerAttemptMapRef.current.delete(viewerId)
          try {
            pc.close()
          } catch {
            // Ignore close errors.
          }
        }
      }

      return pc
    },
    [sendSignal]
  )

  const startViewerPeerConnection = useCallback(
    async (sessionId: string, viewerId: string, hostId: string) => {
      closeAllPeerConnections()
      setSessionError('')

      const runViewerAttempt = async (rtcConfiguration: RTCConfiguration, isRetry: boolean) => {
        closeAllPeerConnections()
        viewerConnectionAttemptRef.current += 1
        const attemptId = viewerConnectionAttemptRef.current
        viewerIceErrorRef.current = ''
        viewerDiagnosticsRef.current = {
          attemptId,
          answerReceived: false,
          localIceCount: 0,
          remoteIceCount: 0,
          connectionState: 'new',
          iceConnectionState: 'new',
        }

        setSessionStatusMessage(
          isRetry
            ? 'Retrying classroom connection with local network path...'
            : 'Connecting to teacher stream...'
        )

        const pc = new RTCPeerConnection(rtcConfiguration)
        viewerPeerRef.current = pc
        pendingViewerCandidatesRef.current = []
        let hasConnected = false
        let timeoutTriggered = false

        // Explicit recvonly transceivers improve Safari/iOS interoperability.
        // Relying on offerToReceive* can produce empty/unstable offers on some browsers.
        pc.addTransceiver('audio', { direction: 'recvonly' })
        pc.addTransceiver('video', { direction: 'recvonly' })

        viewerConnectTimeoutRef.current = window.setTimeout(() => {
          if (viewerPeerRef.current !== pc || hasConnected) return
          timeoutTriggered = true
          try {
            pc.close()
          } catch {
            // Ignore close errors.
          }

          setSessionStatusMessage('')
          const diag = viewerDiagnosticsRef.current
          const iceHint = viewerIceErrorRef.current ? ` (${viewerIceErrorRef.current})` : ''
          if (!diag.answerReceived) {
            setSessionError(
              'Teacher did not answer the connection request. Keep the host stream page open and retry.'
            )
            return
          }
          if (diag.localIceCount === 0 && diag.remoteIceCount === 0) {
            setSessionError(
              `Connected to signaling but no ICE candidates were exchanged. STUN/network path may be blocked${iceHint}`
            )
            return
          }
          setSessionError(
            `Could not connect to the teacher stream (state: ${diag.connectionState}, ice: ${diag.iceConnectionState}, localCandidates: ${diag.localIceCount}, remoteCandidates: ${diag.remoteIceCount})${iceHint}`
          )
        }, VIEWER_CONNECT_TIMEOUT_MS)

        pc.ontrack = (event) => {
          if (viewerConnectionAttemptRef.current !== attemptId) return
          const [remoteStream] = event.streams
          if (!remoteStream) return

          hasConnected = true
          if (viewerConnectTimeoutRef.current !== null) {
            window.clearTimeout(viewerConnectTimeoutRef.current)
            viewerConnectTimeoutRef.current = null
          }
          setLiveStream(remoteStream)
          setMode('playing')
          setSessionError('')
          setSessionStatusMessage('Connected to live classroom.')
        }

        pc.onicecandidate = (event) => {
          if (viewerConnectionAttemptRef.current !== attemptId) return
          if (!event.candidate) return
          viewerDiagnosticsRef.current.localIceCount += 1
          void sessionRequest({
            action: 'signal',
            sessionId,
            fromParticipantId: viewerId,
            toParticipantId: hostId,
            type: 'ice-candidate',
            payload: {
              candidate: event.candidate.toJSON(),
              attemptId,
            } satisfies IceSignalPayload,
          })
        }

        pc.onicecandidateerror = (event) => {
          if (viewerConnectionAttemptRef.current !== attemptId) return
          const url = typeof event.url === 'string' ? event.url : 'unknown-url'
          const errorCode = Number.isFinite(event.errorCode) ? String(event.errorCode) : 'unknown'
          const errorText = event.errorText || 'unknown'
          viewerIceErrorRef.current = `ICE ${errorCode} at ${url}: ${errorText}`
          console.warn('ICE candidate gathering error:', {
            url,
            errorCode,
            errorText,
          })
        }

        pc.onconnectionstatechange = () => {
          if (viewerConnectionAttemptRef.current !== attemptId) return
          viewerDiagnosticsRef.current.connectionState = pc.connectionState
          viewerDiagnosticsRef.current.iceConnectionState = pc.iceConnectionState
          if (pc.connectionState === 'connecting') {
            setSessionStatusMessage(
              isRetry
                ? 'Retrying secure media connection...'
                : 'Negotiating secure media connection...'
            )
            return
          }

          if (pc.connectionState === 'connected') {
            hasConnected = true
            if (viewerConnectTimeoutRef.current !== null) {
              window.clearTimeout(viewerConnectTimeoutRef.current)
              viewerConnectTimeoutRef.current = null
            }
            return
          }

          if (
            pc.connectionState === 'failed' ||
            pc.connectionState === 'disconnected' ||
            pc.connectionState === 'closed'
          ) {
            if (timeoutTriggered) return
            if (viewerConnectTimeoutRef.current !== null) {
              window.clearTimeout(viewerConnectTimeoutRef.current)
              viewerConnectTimeoutRef.current = null
            }
            setSessionStatusMessage('')
            setSessionError(
              'Connection to the live classroom failed. This network may block direct WebRTC.'
            )
          }
        }

        const offer = await pc.createOffer()
        await pc.setLocalDescription(offer)

        const signalResponse = await sessionRequest<SignalResponse>({
          action: 'signal',
          sessionId,
          fromParticipantId: viewerId,
          toParticipantId: hostId,
          type: 'offer',
          payload: {
            description: offer,
            attemptId,
          } satisfies OfferSignalPayload,
        })

        if (!signalResponse?.ok || signalResponse.delivered === 0) {
          throw new Error('Teacher connection is not reachable (offer was not delivered).')
        }
      }

      await runViewerAttempt(RTC_CONFIGURATION, false)
    },
    [closeAllPeerConnections, sessionRequest]
  )

  const handleSessionMessage = useCallback(
    async (message: SessionMessage) => {
      const role = sessionRoleRef.current
      if (!role) return

      if (role === 'host') {
        if (message.type === 'offer') {
          const viewerId = message.fromParticipantId
          const parsedOffer = parseOfferSignalPayload(message.payload)
          if (typeof parsedOffer.attemptId === 'number') {
            hostViewerAttemptMapRef.current.set(viewerId, parsedOffer.attemptId)
          }
          const pc = createHostPeerConnection(viewerId, true)
          await pc.setRemoteDescription(new RTCSessionDescription(parsedOffer.description))

          const queuedCandidates = pendingHostCandidatesRef.current.get(viewerId) || []
          const matchingCandidates: PendingHostCandidate[] = []
          const remainingCandidates: PendingHostCandidate[] = []
          for (const queued of queuedCandidates) {
            if (
              typeof parsedOffer.attemptId !== 'number' ||
              typeof queued.attemptId !== 'number' ||
              queued.attemptId === parsedOffer.attemptId
            ) {
              matchingCandidates.push(queued)
            } else {
              remainingCandidates.push(queued)
            }
          }

          for (const queued of matchingCandidates) {
            try {
              await pc.addIceCandidate(new RTCIceCandidate(queued.candidate))
            } catch (error) {
              console.warn('Failed to add queued host-side ICE candidate:', error)
            }
          }
          if (remainingCandidates.length > 0) {
            pendingHostCandidatesRef.current.set(viewerId, remainingCandidates)
          } else {
            pendingHostCandidatesRef.current.delete(viewerId)
          }

          const answer = await pc.createAnswer()
          await pc.setLocalDescription(answer)
          await sendSignal(
            'answer',
            {
              description: answer,
              attemptId: parsedOffer.attemptId,
            } satisfies AnswerSignalPayload,
            viewerId
          )
          return
        }

        if (message.type === 'ice-candidate') {
          const viewerId = message.fromParticipantId
          const parsedIce = parseIceSignalPayload(message.payload)
          const activeAttemptId = hostViewerAttemptMapRef.current.get(viewerId)
          const candidate = parsedIce.candidate
          const existingPc = hostPeerConnectionsRef.current.get(viewerId)

          if (!existingPc || !existingPc.remoteDescription) {
            const queued = pendingHostCandidatesRef.current.get(viewerId) || []
            queued.push({
              candidate,
              attemptId: parsedIce.attemptId,
            })
            pendingHostCandidatesRef.current.set(viewerId, queued.slice(-120))
            return
          }

          if (
            typeof parsedIce.attemptId === 'number' &&
            typeof activeAttemptId === 'number' &&
            parsedIce.attemptId !== activeAttemptId
          ) {
            return
          }

          try {
            await existingPc.addIceCandidate(new RTCIceCandidate(candidate))
          } catch (error) {
            console.warn('Failed to add host-side ICE candidate:', error)
          }
        }
        return
      }

      if (role === 'viewer') {
        if (message.type === 'answer') {
          const pc = viewerPeerRef.current
          if (!pc) return
          const parsedAnswer = parseAnswerSignalPayload(message.payload)
          const activeAttemptId = viewerConnectionAttemptRef.current
          if (
            typeof parsedAnswer.attemptId === 'number' &&
            parsedAnswer.attemptId !== activeAttemptId
          ) {
            return
          }
          viewerDiagnosticsRef.current.answerReceived = true

          // Ignore duplicate/late answers after negotiation already reached stable state.
          if (
            pc.signalingState === 'stable' &&
            pc.currentRemoteDescription?.type === 'answer'
          ) {
            return
          }

          if (
            pc.signalingState !== 'have-local-offer' &&
            pc.signalingState !== 'have-remote-pranswer'
          ) {
            console.warn(
              'Skipping answer due to unexpected signaling state:',
              pc.signalingState
            )
            return
          }

          try {
            await pc.setRemoteDescription(
              new RTCSessionDescription(parsedAnswer.description)
            )
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error)
            if (errorMessage.includes('Called in wrong state: stable')) {
              // Safe to ignore; another answer was already applied.
              return
            }
            throw error
          }

          for (const candidate of pendingViewerCandidatesRef.current) {
            try {
              await pc.addIceCandidate(new RTCIceCandidate(candidate))
            } catch (error) {
              console.warn('Failed to add queued viewer-side ICE candidate:', error)
            }
          }
          pendingViewerCandidatesRef.current = []
          return
        }

        if (message.type === 'ice-candidate') {
          const pc = viewerPeerRef.current
          if (!pc) return

          const parsedIce = parseIceSignalPayload(message.payload)
          const activeAttemptId = viewerConnectionAttemptRef.current
          if (
            typeof parsedIce.attemptId === 'number' &&
            parsedIce.attemptId !== activeAttemptId
          ) {
            return
          }
          viewerDiagnosticsRef.current.remoteIceCount += 1
          const candidate = parsedIce.candidate
          if (pc.remoteDescription) {
            try {
              await pc.addIceCandidate(new RTCIceCandidate(candidate))
            } catch (error) {
              console.warn('Failed to add viewer-side ICE candidate:', error)
            }
          } else {
            pendingViewerCandidatesRef.current.push(candidate)
          }
          return
        }

        if (message.type === 'caption') {
          const incomingText =
            typeof message.payload?.text === 'string' ? message.payload.text.trim() : ''
          if (incomingText) {
            setIncomingSharedCaption(incomingText)
          }
          return
        }

        if (message.type === 'viewport') {
          const viewport = parseViewportSignalPayload(message.payload)
          if (viewport) {
            setIncomingLiveViewport(viewport)
          }
          return
        }

        if (message.type === 'session-ended') {
          setSessionError('The teacher ended this live session.')
          setMode('join')
          setLiveStream(null)
          setIncomingLiveViewport(null)
          closeAllPeerConnections()
        }
      }
    },
    [closeAllPeerConnections, createHostPeerConnection, sendSignal]
  )

  useEffect(() => {
    if (!activeSessionId || !participantId || !sessionRole) return

    let cancelled = false

    const pollMessages = async () => {
      while (!cancelled) {
        try {
          const response = await sessionRequest<{ messages: SessionMessage[] }>({
            action: 'poll',
            sessionId: activeSessionId,
            participantId,
            limit: 120,
          })

          if (Array.isArray(response.messages)) {
            for (const message of response.messages) {
              try {
                await handleSessionMessage(message)
              } catch (error) {
                console.warn('Failed to process session message:', message.type, error)
              }
            }
          }
        } catch (error) {
          if (!cancelled && sessionRoleRef.current === 'viewer') {
            const message = error instanceof Error ? error.message : 'Session connection failed'
            setSessionError(message)
          }
        }

        await new Promise((resolve) => setTimeout(resolve, 180))
      }
    }

    void pollMessages()
    return () => {
      cancelled = true
    }
  }, [activeSessionId, participantId, sessionRole, sessionRequest, handleSessionMessage])

  useEffect(() => {
    if (sessionRole !== 'host' || !liveStream) return

    hostPeerConnectionsRef.current.forEach((pc) => {
      const senders = pc.getSenders()
      for (const track of liveStream.getTracks()) {
        const existingSender = senders.find(
          (sender: RTCRtpSender) => sender.track?.kind === track.kind
        )
        if (existingSender) {
          optimizeOutgoingTrack(track)
          existingSender.replaceTrack(track).catch((error: unknown) => {
            console.warn('Failed to replace outgoing track:', error)
          })
          void tuneSenderForQuality(existingSender, track.kind as 'audio' | 'video')
        } else {
          optimizeOutgoingTrack(track)
          const sender = pc.addTrack(track, liveStream)
          void tuneSenderForQuality(sender, track.kind as 'audio' | 'video')
        }
      }
    })
  }, [liveStream, sessionRole])

  const handleVideoUpload = (file: File) => {
    console.log('handleVideoUpload called with file:', file.name, file.size)
    setVideoFile(file)
    const url = URL.createObjectURL(file)
    console.log('Created video URL:', url)
    setVideoUrl(url)
    setMode('playing')
  }

  const handleStreamStart = async (stream: MediaStream) => {
    console.log('Live stream started')
    setLiveStream(stream)
    setSessionError('')
    setSessionStatusMessage('Creating classroom link...')
    setMode('playing')

    try {
      const session = await sessionRequest<CreateSessionResponse>({
        action: 'create',
        metadata: {
          captionLanguage,
          targetLanguage,
          aiLanguage,
        },
      })

      setSessionRole('host')
      setActiveSessionId(session.sessionId)
      setParticipantId(session.participantId)
      setHostParticipantId(session.hostParticipantId)
      setSessionShareUrl(session.shareUrl || '')
      setFallbackShareUrl(session.fallbackUrl || '')
      setSessionStatusMessage('Classroom link ready. Students can now join live.')
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to create classroom session'
      setSessionRole('host')
      setSessionError(errorMessage)
      setSessionStatusMessage('Live stream running locally. Link generation failed.')
    }
  }

  const handleLanguageSelection = (caption: string, target: string, ai?: string) => {
    console.log('handleLanguageSelection called:', caption, target, ai)
    setCaptionLanguage(caption)
    setTargetLanguage(target)
    if (ai !== undefined) {
      setAiLanguage(ai)
    }
  }

  const handleBack = async () => {
    // Clean up resources
    if (videoUrl) {
      URL.revokeObjectURL(videoUrl)
      setVideoUrl(null)
    }
    if (liveStream) {
      liveStream.getTracks().forEach(track => track.stop())
      setLiveStream(null)
    }
    await leaveActiveSession()
    setVideoFile(null)
    setMode('select')
  }

  const joinSessionById = useCallback(
    async (sessionIdToJoin: string) => {
      if (!sessionIdToJoin) {
        setSessionError('Please enter a valid session link or ID.')
        return
      }

      setIsJoiningSession(true)
      setSessionError('')
      setSessionStatusMessage('Joining classroom...')

      try {
        const joined = await sessionRequest<JoinSessionResponse>({
          action: 'join',
          sessionId: sessionIdToJoin,
        })

        setSessionRole('viewer')
        setActiveSessionId(joined.sessionId)
        setParticipantId(joined.participantId)
        setHostParticipantId(joined.hostParticipantId)
        setCaptionLanguage(joined.metadata.captionLanguage || 'en')
        setSessionShareUrl('')
        setFallbackShareUrl('')
        setIncomingSharedCaption('')
        setIncomingLiveViewport(null)
        setSessionStatusMessage('Connecting to teacher stream...')

        await startViewerPeerConnection(
          joined.sessionId,
          joined.participantId,
          joined.hostParticipantId
        )
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Failed to join classroom session'
        setSessionError(errorMessage)
        setSessionStatusMessage('')
      } finally {
        setIsJoiningSession(false)
      }
    },
    [sessionRequest, startViewerPeerConnection]
  )

  const handleJoinSession = async () => {
    if (isJoiningSession) return
    const sessionIdToJoin = parseSessionInput(pendingJoinSession)
    if (!sessionIdToJoin) {
      setSessionError('Please enter a valid session link or ID.')
      return
    }

    await joinSessionById(sessionIdToJoin)
  }

  useEffect(() => {
    const sharedSession = searchParams.get('session')
    if (!sharedSession) return

    const parsedSessionId = parseSessionInput(sharedSession)
    if (!parsedSessionId) return

    setPendingJoinSession(parsedSessionId)
    setMode((previous) => (previous === 'select' ? 'join' : previous))
    setSessionError('')
    setSessionStatusMessage('')

    if (autoJoinAttemptRef.current === parsedSessionId || sessionRoleRef.current) return
    autoJoinAttemptRef.current = parsedSessionId
    void joinSessionById(parsedSessionId)
  }, [joinSessionById, searchParams])

  const clearShareLinkParam = () => {
    if (typeof window === 'undefined') return
    const url = new URL(window.location.href)
    if (url.searchParams.has('session')) {
      url.searchParams.delete('session')
      const nextSearch = url.searchParams.toString()
      const nextUrl = `${url.pathname}${nextSearch ? `?${nextSearch}` : ''}${url.hash}`
      window.history.replaceState({}, '', nextUrl)
    }
  }

  const handleBroadcastCaption = useCallback(
    (caption: string) => {
      if (sessionRoleRef.current !== 'host') return
      const normalized = caption.trim()
      if (!normalized || normalized === lastBroadcastCaptionRef.current) return

      lastBroadcastCaptionRef.current = normalized
      void sendSignal('caption', { text: normalized })
    },
    [sendSignal]
  )

  const handleBroadcastViewport = useCallback(
    (viewport: ViewportSignalPayload) => {
      if (sessionRoleRef.current !== 'host') return

      const serialized = JSON.stringify({
        translateX: Number(viewport.translateX.toFixed(2)),
        translateY: Number(viewport.translateY.toFixed(2)),
        zoom: Number(viewport.zoom.toFixed(4)),
        autoFollowEnabled: viewport.autoFollowEnabled,
        autoFollowStatus: viewport.autoFollowStatus,
      })
      if (serialized === lastBroadcastViewportRef.current) return

      lastBroadcastViewportRef.current = serialized
      void sendSignal('viewport', JSON.parse(serialized) as ViewportSignalPayload)
    },
    [sendSignal]
  )


  if (mode === 'select') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-2xl w-full">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">ClassLens</h1>
            <p className="text-gray-600">
              Choose how you want to start your lecture session
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <button
              onClick={() => setMode('upload')}
              className="p-8 border-2 border-gray-300 rounded-xl hover:border-primary-500 hover:bg-primary-50 transition-all text-left group"
            >
              <div className="text-4xl mb-4 group-hover:scale-110 transition-transform">📹</div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">Upload Video</h3>
              <p className="text-gray-600 text-sm">
                Upload a pre-recorded lecture video to analyze and interact with
              </p>
            </button>

            <button
              onClick={() => setMode('live')}
              className="p-8 border-2 border-gray-300 rounded-xl hover:border-primary-500 hover:bg-primary-50 transition-all text-left group"
            >
              <div className="text-4xl mb-4 group-hover:scale-110 transition-transform">📷</div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">Live Camera</h3>
              <p className="text-gray-600 text-sm">
                Use your camera (including iPhone wirelessly) for real-time lecture capture
              </p>
            </button>
          </div>

          <button
            onClick={() => setMode('join')}
            className="w-full mt-6 p-4 border-2 border-dashed border-gray-300 rounded-xl hover:border-primary-500 hover:bg-primary-50 transition-all text-gray-700 font-semibold"
          >
            Join Live Classroom
          </button>
        </div>
      </div>
    )
  }

  if (mode === 'upload') {
    return (
      <UploadInterface
        onVideoUpload={handleVideoUpload}
        onLanguageSelection={handleLanguageSelection}
        captionLanguage={captionLanguage}
        targetLanguage={targetLanguage}
      />
    )
  }

  if (mode === 'live') {
    return (
      <LiveCameraInterface
        onStreamStart={handleStreamStart}
        onLanguageSelection={handleLanguageSelection}
        captionLanguage={captionLanguage}
        targetLanguage={targetLanguage}
        aiLanguage={aiLanguage}
      />
    )
  }

  if (mode === 'join') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-2xl w-full">
          <div className="mb-8 text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Join Live Classroom</h2>
            <p className="text-gray-600">
              Paste the share link or session ID from your teacher.
            </p>
          </div>

          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Session Link or ID
              </label>
              <input
                value={pendingJoinSession}
                onChange={(event) => setPendingJoinSession(event.target.value)}
                placeholder="http://192.168.x.x:3000/?session=..."
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Caption Translation Language
              </label>
              <select
                value={targetLanguage}
                onChange={(event) => setTargetLanguage(event.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white text-gray-900"
              >
                {LANGUAGES.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.name}
                  </option>
                ))}
              </select>
              <p className="mt-2 text-xs text-gray-500">
                You can also change this after you auto-join and the live stream opens.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                AI Explanation Language
              </label>
              <select
                value={aiLanguage}
                onChange={(event) => setAiLanguage(event.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white text-gray-900"
              >
                {LANGUAGES.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {sessionStatusMessage && (
            <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
              {sessionStatusMessage}
            </div>
          )}

          {sessionError && (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {sessionError}
            </div>
          )}

          <div className="mt-8 flex gap-3">
            <button
              onClick={handleJoinSession}
              disabled={isJoiningSession}
              className="flex-1 px-6 py-3 rounded-xl bg-primary-600 text-white font-semibold hover:bg-primary-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
            >
              {isJoiningSession ? 'Joining...' : 'Join Session'}
            </button>
            <button
              onClick={() => {
                setMode('select')
                setSessionError('')
                setSessionStatusMessage('')
                clearShareLinkParam()
              }}
              className="px-6 py-3 rounded-xl border-2 border-gray-300 text-gray-700 font-semibold hover:border-gray-400 transition-colors"
            >
              Back
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (mode === 'playing') {
    return (
      <VideoPlayer
        videoUrl={videoUrl || undefined}
        videoFile={videoFile || undefined}
        liveStream={liveStream || undefined}
        captionLanguage={captionLanguage}
        targetLanguage={targetLanguage}
        aiLanguage={aiLanguage}
        isLive={sessionRole === 'viewer' || !!liveStream}
        sessionRole={sessionRole}
        sessionShareUrl={sessionShareUrl || fallbackShareUrl || undefined}
        sessionStatusMessage={sessionStatusMessage || undefined}
        onLiveCaptionBroadcast={handleBroadcastCaption}
        onLiveViewportBroadcast={sessionRole === 'host' ? handleBroadcastViewport : undefined}
        incomingSharedCaption={sessionRole === 'viewer' ? incomingSharedCaption : undefined}
        incomingLiveViewport={sessionRole === 'viewer' ? incomingLiveViewport || undefined : undefined}
        disableLocalTranscription={sessionRole === 'viewer'}
        onTargetLanguageChange={sessionRole === 'viewer' ? setTargetLanguage : undefined}
      />
    )
  }

  return null
}
