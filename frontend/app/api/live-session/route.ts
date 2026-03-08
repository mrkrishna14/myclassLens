import os from 'os'
import { NextRequest, NextResponse } from 'next/server'
import {
  createLiveSession,
  drainLiveSignals,
  enqueueLiveSignal,
  joinLiveSession,
  leaveLiveSession,
  type LiveSignalType,
} from '@/lib/liveSessionStore'

export const runtime = 'nodejs'

const getLanIpv4 = () => {
  const interfaces = os.networkInterfaces()
  const keys = Object.keys(interfaces)
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i]
    const entries = interfaces[key]
    if (!entries || entries.length === 0) continue

    for (let j = 0; j < entries.length; j++) {
      const entry = entries[j] as {
        family: string | number
        internal: boolean
        address: string
      }
      const isIPv4 =
        entry.family === 'IPv4' || (typeof entry.family === 'number' && entry.family === 4)
      if (isIPv4 && !entry.internal) {
        return entry.address
      }
    }
  }
  return null
}

const buildShareUrls = (request: NextRequest, sessionId: string) => {
  const protocolHeader = request.headers.get('x-forwarded-proto')
  const protocol = protocolHeader ? protocolHeader.split(',')[0].trim() : 'http'
  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host') ?? ''
  const hostPort = host.includes(':') ? host.split(':').at(-1) : ''
  const port = hostPort && /^\d+$/.test(hostPort) ? `:${hostPort}` : ''
  const currentOrigin = request.nextUrl.origin
  const fallbackUrl = `${currentOrigin}?session=${sessionId}`
  const lanIp = getLanIpv4()
  const shareUrl = lanIp ? `${protocol}://${lanIp}${port}?session=${sessionId}` : fallbackUrl
  return { shareUrl, fallbackUrl }
}

const parseBody = async (request: NextRequest) => {
  try {
    return await request.json()
  } catch {
    return null
  }
}

const isLiveSignalType = (value: string): value is LiveSignalType => {
  return (
    value === 'offer' ||
    value === 'answer' ||
    value === 'ice-candidate' ||
    value === 'caption' ||
    value === 'viewport' ||
    value === 'session-ended'
  )
}

export async function POST(request: NextRequest) {
  const body = await parseBody(request)
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const action = body.action
  if (typeof action !== 'string') {
    return NextResponse.json({ error: 'Action is required' }, { status: 400 })
  }

  if (action === 'create') {
    const metadata = body.metadata ?? {}
    const captionLanguage =
      typeof metadata.captionLanguage === 'string' ? metadata.captionLanguage : 'en'
    const targetLanguage =
      typeof metadata.targetLanguage === 'string' ? metadata.targetLanguage : 'en'
    const aiLanguage =
      typeof metadata.aiLanguage === 'string' ? metadata.aiLanguage : targetLanguage

    const created = await createLiveSession({
      captionLanguage,
      targetLanguage,
      aiLanguage,
    })
    const { shareUrl, fallbackUrl } = buildShareUrls(request, created.sessionId)

    return NextResponse.json({
      sessionId: created.sessionId,
      participantId: created.hostParticipantId,
      hostParticipantId: created.hostParticipantId,
      metadata: created.metadata,
      shareUrl,
      fallbackUrl,
    })
  }

  if (action === 'join') {
    const sessionId = typeof body.sessionId === 'string' ? body.sessionId.trim() : ''
    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId is required' }, { status: 400 })
    }

    const joined = await joinLiveSession(sessionId)
    if (!joined) {
      return NextResponse.json({ error: 'Session not found or expired' }, { status: 404 })
    }

    return NextResponse.json(joined)
  }

  if (action === 'signal') {
    const sessionId = typeof body.sessionId === 'string' ? body.sessionId.trim() : ''
    const fromParticipantId =
      typeof body.fromParticipantId === 'string' ? body.fromParticipantId.trim() : ''
    const toParticipantId =
      typeof body.toParticipantId === 'string' ? body.toParticipantId.trim() : undefined
    const type = body.type

    if (!sessionId || !fromParticipantId || typeof type !== 'string') {
      return NextResponse.json(
        { error: 'sessionId, fromParticipantId, and type are required' },
        { status: 400 }
      )
    }

    if (!isLiveSignalType(type)) {
      return NextResponse.json({ error: `Unsupported signal type: ${type}` }, { status: 400 })
    }

    const result = await enqueueLiveSignal({
      sessionId,
      fromParticipantId,
      toParticipantId,
      type,
      payload: body.payload,
    })

    if (result.reason === 'session_not_found') {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }
    if (result.reason === 'sender_not_found') {
      return NextResponse.json({ error: 'Sender not found in session' }, { status: 404 })
    }
    if (result.reason === 'recipient_not_found') {
      return NextResponse.json({ error: 'Recipient not found in session' }, { status: 404 })
    }

    return NextResponse.json({ ok: true, delivered: result.delivered })
  }

  if (action === 'poll') {
    const sessionId = typeof body.sessionId === 'string' ? body.sessionId.trim() : ''
    const participantId =
      typeof body.participantId === 'string' ? body.participantId.trim() : ''
    const limit =
      typeof body.limit === 'number' && Number.isFinite(body.limit) ? body.limit : undefined

    if (!sessionId || !participantId) {
      return NextResponse.json(
        { error: 'sessionId and participantId are required' },
        { status: 400 }
      )
    }

    const drained = await drainLiveSignals({ sessionId, participantId, limit })
    if (drained.reason === 'session_not_found') {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }
    if (drained.reason === 'participant_not_found') {
      return NextResponse.json({ error: 'Participant not found' }, { status: 404 })
    }

    return NextResponse.json({ messages: drained.messages })
  }

  if (action === 'leave') {
    const sessionId = typeof body.sessionId === 'string' ? body.sessionId.trim() : ''
    const participantId =
      typeof body.participantId === 'string' ? body.participantId.trim() : ''

    if (!sessionId || !participantId) {
      return NextResponse.json(
        { error: 'sessionId and participantId are required' },
        { status: 400 }
      )
    }

    const result = await leaveLiveSession({ sessionId, participantId })
    return NextResponse.json(result)
  }

  return NextResponse.json({ error: `Unsupported action: ${action}` }, { status: 400 })
}
