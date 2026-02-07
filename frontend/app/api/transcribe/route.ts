import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const audioFile = formData.get('audio') as File
    const language = formData.get('language') as string || 'en'

    if (!audioFile) {
      return NextResponse.json(
        { error: 'Audio file is required' },
        { status: 400 }
      )
    }

    // Convert File to the format expected by OpenAI
    // OpenAI Whisper can handle video files directly (MP4, MOV, etc.)
    const arrayBuffer = await audioFile.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Create a File-like object for OpenAI
    // Note: OpenAI expects a File or Blob object
    const file = new File([buffer], audioFile.name, { 
      type: audioFile.type || 'video/mp4' 
    })

    // Use Whisper API for transcription
    // Whisper automatically extracts audio from video files
    const transcription = await openai.audio.transcriptions.create({
      file: file as any,
      model: 'whisper-1',
      language: language !== 'en' ? language : undefined, // Only specify if not English
      response_format: 'verbose_json',
    })

    return NextResponse.json({
      text: transcription.text,
      segments: transcription.segments || [],
      language: transcription.language,
    })
  } catch (error: any) {
    console.error('Error in transcribe API:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to transcribe audio' },
      { status: 500 }
    )
  }
}
