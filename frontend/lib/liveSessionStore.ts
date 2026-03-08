import crypto from 'crypto'
import { redis } from './redis'

export type LiveParticipantRole = 'host' | 'viewer'
export type LiveSignalType =
  | 'offer'
  | 'answer'
  | 'ice-candidate'
  | 'caption'
  | 'viewport'
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
}

interface LiveSession {
  id: string
  hostParticipantId: string
  metadata: LiveSessionMetadata
  participants: Record<string, LiveParticipant>
  createdAt: number
  updatedAt: number
}

const SESSION_TTL = 60 * 60 * 8
const PARTICIPANT_IDLE_MS = 1000 * 60 * 15

const createId = (length: number = 12) =>
  crypto.randomBytes(16).toString('base64url').replace(/[^a-zA-Z0-9]/g, '').slice(0, length)

const messageListKey = (sessionId: string, participantId: string) =>
  `live:session:${sessionId}:m:${participantId}`

/** Atomically drain oldest N messages from a participant's Redis list (FIFO). */
const DRAIN_SCRIPT = `
  local key = KEYS[1]
  local limit = tonumber(ARGV[1])
  local len = redis.call('LLEN', key)
  if len == 0 then return {} end
  local take = math.min(limit, len)
  local items = redis.call('LRANGE', key, -take, -1)
  redis.call('LTRIM', key, 0, -(take + 1))
  return items
`

export const createLiveSession = async (languages: {
  captionLanguage: string
  targetLanguage: string
  aiLanguage: string
}) => {
  const sessionId = createId(10)
  const hostParticipantId = createId(14)
  const now = Date.now()

  const host: LiveParticipant = {
    id: hostParticipantId,
    role: 'host',
    joinedAt: now,
    lastSeenAt: now,
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
    participants: {
      [hostParticipantId]: host,
    },
    createdAt: now,
    updatedAt: now,
  }

  await redis.set(`live:session:${sessionId}`, session, {
    ex: SESSION_TTL,
  })

  return {
    sessionId,
    hostParticipantId,
    metadata: session.metadata,
  }
}

export const getLiveSession = async (sessionId: string) => {
  const session = await redis.get<LiveSession>(`live:session:${sessionId}`)

  if (!session) {
    return null
  }
  return session
}

export const joinLiveSession = async (sessionId: string) => {
  const session = await getLiveSession(sessionId)
  if (!session) return null

  const now = Date.now()
  const participantId = createId(14)

  session.participants[participantId] = {
    id: participantId,
    role: 'viewer',
    joinedAt: now,
    lastSeenAt: now,
  }

  session.updatedAt = now

  await redis.set(`live:session:${sessionId}`, session, {
    ex: SESSION_TTL,
  })

  return {
    sessionId: session.id,
    participantId,
    hostParticipantId: session.hostParticipantId,
    metadata: session.metadata,
  }
}

export const enqueueLiveSignal = async (params: {
  sessionId: string
  fromParticipantId: string
  type: LiveSignalType
  payload: unknown
  toParticipantId?: string
}) => {
  const session = await getLiveSession(params.sessionId)
  if (!session) return { delivered: 0, reason: 'session_not_found' as const }

  const sender = session.participants[params.fromParticipantId]
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
    const target = session.participants[params.toParticipantId]
    if (!target) {
      return { delivered: 0, reason: 'recipient_not_found' as const }
    }
    recipients.push(target)
  } else {
    for (const participant of Object.values(session.participants)) {
      if (participant.id === params.fromParticipantId) continue
      recipients.push(participant)
    }
  }

  const messageJson = JSON.stringify(message)

  for (const participant of recipients) {
    const key = messageListKey(params.sessionId, participant.id)
    await redis.lpush(key, messageJson)
    await redis.expire(key, SESSION_TTL)
    participant.lastSeenAt = now
  }

  await redis.set(`live:session:${session.id}`, session, { ex: SESSION_TTL })
  return { delivered: recipients.length, reason: 'ok' as const }
}

export const drainLiveSignals = async (params: {
  sessionId: string
  participantId: string
  limit?: number
}) => {
  const session = await getLiveSession(params.sessionId)
  if (!session) return { messages: null, reason: 'session_not_found' as const }

  const participant = session.participants[params.participantId]
  if (!participant) return { messages: null, reason: 'participant_not_found' as const }

  const limit = Math.max(1, Math.min(params.limit ?? 80, 300))

  const key = messageListKey(params.sessionId, params.participantId)
  const rawItems = (await redis.eval(DRAIN_SCRIPT, [key], [String(limit)])) as string[]
  const messages: LiveSignalMessage[] = rawItems
    .map((s) => {
      try {
        return JSON.parse(s) as LiveSignalMessage
      } catch {
        return null
      }
    })
    .filter((m): m is LiveSignalMessage => m !== null)

  // Do not write the session back. Messages live in Redis lists; writing the session
  // here would race with join/enqueue and can overwrite newly added participants.
  return { messages, reason: 'ok' as const }
}

export const leaveLiveSession = async (params: { sessionId: string; participantId: string }) => {
  const session = await getLiveSession(params.sessionId)
  if (!session) return { ok: true, ended: false }

  const participant = session.participants[params.participantId]
  if (!participant) return { ok: true, ended: false }

  const isHost = participant.id === session.hostParticipantId
  delete session.participants[participant.id]
  session.updatedAt = Date.now()

  if (isHost) {
    const shutdownMessage: LiveSignalMessage = {
      id: createId(16),
      type: 'session-ended',
      fromParticipantId: participant.id,
      payload: { reason: 'host_left' },
      createdAt: Date.now(),
    }
    const shutdownJson = JSON.stringify(shutdownMessage)
    for (const p of Object.values(session.participants)) {
      const key = messageListKey(session.id, p.id)
      await redis.lpush(key, shutdownJson)
      await redis.expire(key, SESSION_TTL)
    }
    await redis.del(`live:session:${session.id}`)
    return { ok: true, ended: true }
  }

  await redis.del(messageListKey(session.id, participant.id))
  if (Object.keys(session.participants).length === 0) {
    await redis.del(`live:session:${session.id}`)
  } else {
    await redis.set(`live:session:${session.id}`, session, { ex: SESSION_TTL })
  }

  return { ok: true, ended: false }
}
