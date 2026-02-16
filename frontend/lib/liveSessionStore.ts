import crypto from 'crypto'

export type LiveParticipantRole = 'host' | 'viewer'
export type LiveSignalType =
  | 'offer'
  | 'answer'
  | 'ice-candidate'
  | 'caption'
  | 'session-ended'

export interface LiveSessionMetadata {
  captionLanguage: string
  targetLanguage: string
  aiLanguage: string
  createdAt: number
}

export interface LiveSignalMessage {
  id: string
  type: LiveSignalType
  fromParticipantId: string
  payload: unknown
  createdAt: number
}

interface LiveParticipant {
  id: string
  role: LiveParticipantRole
  joinedAt: number
  lastSeenAt: number
  messages: LiveSignalMessage[]
}

interface LiveSession {
  id: string
  hostParticipantId: string
  metadata: LiveSessionMetadata
  participants: Map<string, LiveParticipant>
  createdAt: number
  updatedAt: number
}

const SESSION_TTL_MS = 1000 * 60 * 60 * 8
const PARTICIPANT_IDLE_MS = 1000 * 60 * 15

declare global {
  // eslint-disable-next-line no-var
  var __classlensLiveSessions: Map<string, LiveSession> | undefined
}

const sessionStore = globalThis.__classlensLiveSessions ?? new Map<string, LiveSession>()
if (!globalThis.__classlensLiveSessions) {
  globalThis.__classlensLiveSessions = sessionStore
}

const createId = (length: number = 12) =>
  crypto.randomBytes(16).toString('base64url').replace(/[^a-zA-Z0-9]/g, '').slice(0, length)

const cleanupStore = () => {
  const now = Date.now()
  sessionStore.forEach((session, sessionId) => {
    if (now - session.updatedAt > SESSION_TTL_MS) {
      sessionStore.delete(sessionId)
      return
    }

    session.participants.forEach((participant, participantId) => {
      if (
        participant.role !== 'host' &&
        now - participant.lastSeenAt > PARTICIPANT_IDLE_MS
      ) {
        session.participants.delete(participantId)
      }
    })

    if (!session.participants.has(session.hostParticipantId)) {
      sessionStore.delete(sessionId)
    }
  })
}

export const createLiveSession = (languages: {
  captionLanguage: string
  targetLanguage: string
  aiLanguage: string
}) => {
  cleanupStore()

  const sessionId = createId(10)
  const hostParticipantId = createId(14)
  const now = Date.now()

  const host: LiveParticipant = {
    id: hostParticipantId,
    role: 'host',
    joinedAt: now,
    lastSeenAt: now,
    messages: [],
  }

  const session: LiveSession = {
    id: sessionId,
    hostParticipantId,
    metadata: {
      captionLanguage: languages.captionLanguage || 'en',
      targetLanguage: languages.targetLanguage || 'en',
      aiLanguage: languages.aiLanguage || languages.targetLanguage || 'en',
      createdAt: now,
    },
    participants: new Map<string, LiveParticipant>([[hostParticipantId, host]]),
    createdAt: now,
    updatedAt: now,
  }

  sessionStore.set(sessionId, session)
  return {
    sessionId,
    hostParticipantId,
    metadata: session.metadata,
  }
}

export const getLiveSession = (sessionId: string) => {
  cleanupStore()
  const session = sessionStore.get(sessionId)
  if (!session) return null
  return session
}

export const joinLiveSession = (sessionId: string) => {
  const session = getLiveSession(sessionId)
  if (!session) return null

  const now = Date.now()
  const participantId = createId(14)

  const viewer: LiveParticipant = {
    id: participantId,
    role: 'viewer',
    joinedAt: now,
    lastSeenAt: now,
    messages: [],
  }

  session.participants.set(participantId, viewer)
  session.updatedAt = now

  return {
    sessionId: session.id,
    participantId,
    hostParticipantId: session.hostParticipantId,
    metadata: session.metadata,
  }
}

export const enqueueLiveSignal = (params: {
  sessionId: string
  fromParticipantId: string
  type: LiveSignalType
  payload: unknown
  toParticipantId?: string
}) => {
  const session = getLiveSession(params.sessionId)
  if (!session) return { delivered: 0, reason: 'session_not_found' as const }

  const sender = session.participants.get(params.fromParticipantId)
  if (!sender) return { delivered: 0, reason: 'sender_not_found' as const }

  const now = Date.now()
  sender.lastSeenAt = now

  const message: LiveSignalMessage = {
    id: createId(16),
    type: params.type,
    fromParticipantId: params.fromParticipantId,
    payload: params.payload,
    createdAt: now,
  }

  const recipients: LiveParticipant[] = []
  if (params.toParticipantId) {
    const target = session.participants.get(params.toParticipantId)
    if (!target) {
      return { delivered: 0, reason: 'recipient_not_found' as const }
    }
    recipients.push(target)
  } else {
    session.participants.forEach((participant) => {
      if (participant.id === params.fromParticipantId) return
      recipients.push(participant)
    })
  }

  recipients.forEach((participant) => {
    if (message.type === 'caption') {
      participant.messages = participant.messages.filter(
        (queuedMessage) => queuedMessage.type !== 'caption'
      )
    }
    participant.messages.push(message)
    participant.lastSeenAt = now
  })

  session.updatedAt = now
  return { delivered: recipients.length, reason: 'ok' as const }
}

export const drainLiveSignals = (params: {
  sessionId: string
  participantId: string
  limit?: number
}) => {
  const session = getLiveSession(params.sessionId)
  if (!session) return { messages: null, reason: 'session_not_found' as const }

  const participant = session.participants.get(params.participantId)
  if (!participant) return { messages: null, reason: 'participant_not_found' as const }

  participant.lastSeenAt = Date.now()
  session.updatedAt = participant.lastSeenAt

  const limit = Math.max(1, Math.min(params.limit ?? 80, 300))
  const messages = participant.messages.splice(0, limit)
  return { messages, reason: 'ok' as const }
}

export const leaveLiveSession = (params: { sessionId: string; participantId: string }) => {
  const session = getLiveSession(params.sessionId)
  if (!session) return { ok: true, ended: false }

  const participant = session.participants.get(params.participantId)
  if (!participant) return { ok: true, ended: false }

  const isHost = participant.id === session.hostParticipantId
  session.participants.delete(participant.id)
  session.updatedAt = Date.now()

  if (isHost) {
    const shutdownMessage: LiveSignalMessage = {
      id: createId(16),
      type: 'session-ended',
      fromParticipantId: participant.id,
      payload: { reason: 'host_left' },
      createdAt: Date.now(),
    }
    session.participants.forEach((viewer) => {
      viewer.messages.push(shutdownMessage)
    })
    sessionStore.delete(session.id)
    return { ok: true, ended: true }
  }

  if (session.participants.size === 0) {
    sessionStore.delete(session.id)
  }

  return { ok: true, ended: false }
}
