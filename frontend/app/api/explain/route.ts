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

    console.log('Question:', question)
    console.log('Image data received:', !!image)
    console.log('Image data length:', image?.length)
    console.log('Image data type:', typeof image)
    console.log('Image data prefix:', image?.substring(0, 50))
    console.log('Transcript snippet length:', transcriptSnippet?.length)
    console.log('Target language:', targetLanguage)

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
          content: `You are an expert educational assistant helping students understand lecture content in real-time. 

Your capabilities:
- Analyze images from lectures including whiteboards, slides, diagrams, and handwritten notes
- Interpret messy handwriting, mathematical notation, scientific symbols, and diagrams
- Use the lecture transcript context to understand where the student is in the lesson
- Provide clear, educational explanations that connect visual content to the spoken lecture

When analyzing:
1. Carefully examine any text, equations, diagrams, or drawings in the image
2. Use the transcript context to understand what the professor is explaining at this moment
3. Connect the visual content to the lecture narrative
4. If handwriting is unclear, make your best interpretation and mention if you're uncertain
5. For mathematical/scientific content, explain both what it shows and why it matters

${targetLanguage !== 'en' ? `IMPORTANT: Respond in ${targetLanguage}.` : 'Respond in English.'}

Be clear, concise, and educational. Always reference the transcript context in your explanation.`,
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Context from lecture transcript (at ${Math.floor(timestamp / 60)}:${Math.floor(timestamp % 60).toString().padStart(2, '0')}): "${transcriptSnippet}"\n\nQuestion: ${question}\n\nPlease analyze the image and provide a helpful explanation.`,
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
