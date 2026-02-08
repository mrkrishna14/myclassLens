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
          content: `You are a helpful AI assistant that explains visual content from educational materials. 

Analyze the image and provide clear, concise explanations. When relevant, naturally reference what was recently discussed in the lecture as context for your explanation. Speak as if you're directly helping the user understand what they're looking at.

Keep explanations:
- Brief and to the point (2-3 sentences max)
- Focused on what's most important
- Natural and conversational

${targetLanguageName !== 'English' ? `IMPORTANT: You MUST respond entirely in ${targetLanguageName}. Do not use English.` : 'Respond in English.'}

Be clear, concise, and educational. Always reference the transcript context in your explanation.`,
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `The professor was just discussing: "${transcriptSnippet}"\n\n${question}`,
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
      max_tokens: 500,
      temperature: 0.7,
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
