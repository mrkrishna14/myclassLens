import { NextRequest, NextResponse } from 'next/server'
import { AssemblyAI } from 'assemblyai'

const client = new AssemblyAI({
  apiKey: process.env.ASSEMBLYAI_API_KEY || '',
})

export async function POST(request: NextRequest) {
  try {
    console.log('=== Transcription API Called ===')
    console.log('API Key present:', !!process.env.ASSEMBLYAI_API_KEY)
    console.log('API Key length:', process.env.ASSEMBLYAI_API_KEY?.length)
    
    const formData = await request.formData()
    const audioFile = formData.get('audio') as File
    const language = formData.get('language') as string || 'en'

    console.log('Audio file:', audioFile?.name, audioFile?.size, 'bytes')
    console.log('Language:', language)

    if (!audioFile) {
      return NextResponse.json(
        { error: 'Audio file is required' },
        { status: 400 }
      )
    }

    if (!process.env.ASSEMBLYAI_API_KEY) {
      console.error('ASSEMBLYAI_API_KEY is missing!')
      return NextResponse.json(
        { error: 'AssemblyAI API key is not configured' },
        { status: 500 }
      )
    }

    // Convert File to buffer for upload
    console.log('Converting file to buffer...')
    const arrayBuffer = await audioFile.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    console.log('Buffer size:', buffer.length, 'bytes')

    // Upload file to AssemblyAI
    // AssemblyAI can handle video files directly (MP4, MOV, etc.)
    console.log('Uploading file to AssemblyAI...')
    const uploadedFile = await client.files.upload(buffer)
    console.log('File uploaded successfully:', uploadedFile)

    // Create transcription job with sentence-level timestamps
    console.log('Starting transcription job...')
    console.log('Requested language:', language)
    
    // Map language codes to AssemblyAI format
    const languageMap: Record<string, string> = {
      'en': 'en',
      'es': 'es',
      'fr': 'fr',
      'de': 'de',
      'zh': 'zh',
      'ja': 'ja',
      'ko': 'ko',
      'pt': 'pt',
      'ar': 'ar',
      'hi': 'hi',
      'it': 'it',
      'nl': 'nl',
      'pl': 'pl',
      'ru': 'ru',
      'tr': 'tr',
      'uk': 'uk',
      'vi': 'vi',
      'th': 'th'
    }
    
    const assemblyAILanguage = languageMap[language] || language
    console.log('Mapped to AssemblyAI language:', assemblyAILanguage)
    
    const transcript = await client.transcripts.transcribe({
      audio: uploadedFile,
      language_code: language === 'auto' ? undefined : assemblyAILanguage,
      speech_models: ['universal-2'] as any,
      punctuate: true,
      format_text: true,
      // Enable language detection if auto
      language_detection: language === 'auto',
    })

    console.log('Transcription status:', transcript.status)
    console.log('Transcription ID:', transcript.id)

    if (transcript.status === 'error') {
      console.error('Transcription error:', transcript.error)
      throw new Error(transcript.error || 'Transcription failed')
    }

    // Convert AssemblyAI format to match our expected format
    // Use sentences for better caption display
    const transcriptData = transcript as any
    console.log('Processing transcript data...')
    console.log('Has sentences:', !!transcriptData.sentences)
    console.log('Has words:', !!transcriptData.words)
    console.log('Text length:', transcript.text?.length)
    
    const segments = transcriptData.sentences?.map((sentence: any) => ({
      start: sentence.start / 1000, // Convert ms to seconds
      end: sentence.end / 1000,
      text: sentence.text,
    })) || []

    console.log('Sentence segments:', segments.length)

    // Fallback to words if sentences not available - group them into sentence-like chunks
    if (segments.length === 0 && transcriptData.words) {
      console.log('Sentences not available, grouping words into sentence chunks')
      const words = transcriptData.words
      const sentenceChunks: any[] = []
      let currentChunk: any = null
      
      words.forEach((word: any, index: number) => {
        if (!currentChunk) {
          currentChunk = {
            start: word.start / 1000,
            end: word.end / 1000,
            text: word.text
          }
        } else {
          currentChunk.text += ' ' + word.text
          currentChunk.end = word.end / 1000
        }
        
        // End chunk on punctuation or every 10-15 words
        const endsWithPunctuation = /[.!?]$/.test(word.text)
        const chunkLength = currentChunk.text.split(' ').length
        
        if (endsWithPunctuation || chunkLength >= 12 || index === words.length - 1) {
          sentenceChunks.push(currentChunk)
          currentChunk = null
        }
      })
      
      console.log('Created', sentenceChunks.length, 'sentence chunks from words')
      
      return NextResponse.json({
        text: transcript.text || '',
        segments: sentenceChunks,
        language: transcript.language_code || language,
      })
    }

    console.log('Returning response with', segments.length, 'segments')
    console.log('Detected language:', transcript.language_code)
    
    return NextResponse.json({
      text: transcript.text || '',
      segments: segments,
      language: transcript.language_code || language,
    })
  } catch (error: any) {
    console.error('Error in transcribe API:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to transcribe audio' },
      { status: 500 }
    )
  }
}
