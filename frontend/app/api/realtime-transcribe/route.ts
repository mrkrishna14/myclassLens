import { NextRequest, NextResponse } from 'next/server'

// AssemblyAI Real-time API endpoint
const ASSEMBLYAI_REALTIME_URL = 'wss://api.assemblyai.com/v2/realtime/ws'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const language = searchParams.get('language') || 'en'
  
  if (!process.env.ASSEMBLYAI_API_KEY) {
    return NextResponse.json(
      { error: 'AssemblyAI API key is not configured' },
      { status: 500 }
    )
  }

  // Return configuration for client-side WebSocket connection
  return NextResponse.json({
    websocketUrl: ASSEMBLYAI_REALTIME_URL,
    apiKey: process.env.ASSEMBLYAI_API_KEY,
    language,
    sampleRate: 16000,
  })
}

export async function POST(request: NextRequest) {
  try {
    const { language = 'en' } = await request.json()
    
    if (!process.env.ASSEMBLYAI_API_KEY) {
      return NextResponse.json(
        { error: 'AssemblyAI API key is not configured' },
        { status: 500 }
      )
    }

    // Return configuration for real-time transcription
    return NextResponse.json({
      websocketUrl: ASSEMBLYAI_REALTIME_URL,
      apiKey: process.env.ASSEMBLYAI_API_KEY,
      language,
      sampleRate: 16000,
      config: {
        sample_rate: 16000,
        language_code: language,
        punctuate: true,
        format_text: true,
        disfluencies: false, // Remove filler words
        speaker_labels: false, // Don't need speaker diarization
        word_boost: [], // No specific word boosting
        speech_model: 'best', // Use best model for accuracy
      }
    })
  } catch (error: any) {
    console.error('Error in realtime-transcribe POST:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to get real-time transcription config' },
      { status: 500 }
    )
  }
}
