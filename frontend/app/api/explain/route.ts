import { NextRequest, NextResponse } from 'next/server'
import { Groq } from 'groq-sdk'

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    console.log('=== Explain API Called ===')
    console.log('GROQ_API_KEY present:', !!process.env.GROQ_API_KEY)
    console.log('GROQ_API_KEY length:', process.env.GROQ_API_KEY?.length)
    
    const { image, question, transcriptSnippet, timestamp, targetLanguage } = await request.json()

    // Map language codes to full names for better AI understanding
    const languageNames: Record<string, string> = {
      'en': 'English',
      'es': 'Spanish',
      'fr': 'French',
      'de': 'German',
      'zh': 'Chinese',
      'ja': 'Japanese',
      'ko': 'Korean',
      'pt': 'Portuguese',
      'ar': 'Arabic',
      'hi': 'Hindi',
      'it': 'Italian',
      'nl': 'Dutch',
      'pl': 'Polish',
      'ru': 'Russian',
      'tr': 'Turkish',
      'uk': 'Ukrainian',
      'vi': 'Vietnamese',
      'th': 'Thai'
    }
    
    const targetLanguageName = languageNames[targetLanguage] || targetLanguage || 'English'

    console.log('Question:', question)
    console.log('Image data received:', !!image)
    console.log('Image data length:', image?.length)
    console.log('Image data type:', typeof image)
    console.log('Image data prefix:', image?.substring(0, 50))
    console.log('Transcript snippet length:', transcriptSnippet?.length)
    console.log('Target language code:', targetLanguage)
    console.log('Target language name:', targetLanguageName)

    if (!image || !question) {
      return NextResponse.json(
        { error: 'Image and question are required' },
        { status: 400 }
      )
    }

    if (!process.env.GROQ_API_KEY) {
      console.error('GROQ_API_KEY is missing!')
      return NextResponse.json(
        { error: 'Groq API key is not configured' },
        { status: 500 }
      )
    }

    // Use Groq's Llama 4 Scout Vision model to analyze the image and answer the question
    // meta-llama/llama-4-scout-17b-16e-instruct is the latest vision model
    console.log('Calling Groq API...')
    console.log('Preparing message with image URL length:', image.length)
    
    const response = await groq.chat.completions.create({
      model: 'meta-llama/llama-4-scout-17b-16e-instruct',
      messages: [
        {
          role: 'system',
          content: `You are an expert tutor helping a student understand a selected region on a board/screen.

Write in a confident, student-friendly tone.
Keep answers concise and high-signal:
- 2 to 4 short sentences (max ~120 words)
- focus on the key concept, what it means, and the immediate takeaway
- if visible, explain equations/symbols directly and concretely

Hard rules:
- do NOT mention "transcript", "image", "context", or "based on"
- do NOT add uncertainty filler like "it seems", "might be", "without more context"
- do NOT narrate your process

${targetLanguageName !== 'English' ? `IMPORTANT: Respond entirely in ${targetLanguageName}.` : 'Respond in English.'}`,
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Lecture notes for internal grounding only (do not mention these explicitly): "${transcriptSnippet}"\n\nStudent question: ${question}`,
            },
            {
              type: 'image_url',
              image_url: {
                url: image,
              },
            },
          ] as any,
        },
      ],
      max_tokens: 220,
      temperature: 0.35,
    })

    console.log('Groq API response received')
    const explanation = response.choices[0]?.message?.content || 'Unable to generate explanation.'
    console.log('Explanation length:', explanation.length)

    return NextResponse.json({ explanation })
  } catch (error: any) {
    console.error('Error in explain API:', error)
    console.error('Error type:', error.constructor.name)
    console.error('Error cause:', error.cause)
    
    // Provide more helpful error message
    let errorMessage = 'Failed to generate explanation'
    if (error.message?.includes('SSL') || error.cause?.code?.includes('SSL')) {
      errorMessage = 'Network connection error. Please try again.'
    } else if (error.message) {
      errorMessage = error.message
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}
