import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    const { image, question, transcriptSnippet, timestamp, targetLanguage } = await request.json()

    if (!image || !question) {
      return NextResponse.json(
        { error: 'Image and question are required' },
        { status: 400 }
      )
    }

    // Use GPT-4 Vision to analyze the image and answer the question
    // Using gpt-4o which has excellent vision capabilities
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are a helpful educational assistant. Answer questions about lecture content based on the provided image and transcript context. 
          ${targetLanguage !== 'en' ? `Respond in ${targetLanguage}.` : 'Respond in English.'}
          Be clear, concise, and educational.`,
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Context from lecture transcript (at ${Math.floor(timestamp / 60)}:${Math.floor(timestamp % 60).toString().padStart(2, '0')}): "${transcriptSnippet}"
              
              Question: ${question}
              
              Please analyze the image and provide a helpful explanation.`,
            },
            {
              type: 'image_url',
              image_url: {
                url: image,
              },
            },
          ],
        },
      ],
      max_tokens: 500,
    })

    const explanation = response.choices[0]?.message?.content || 'Unable to generate explanation.'

    return NextResponse.json({ explanation })
  } catch (error: any) {
    console.error('Error in explain API:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to generate explanation' },
      { status: 500 }
    )
  }
}
