import { NextRequest, NextResponse } from 'next/server'

// Real-time translation API using Google Cloud Translation API (Basic v2)
// Supports up to 500k characters per month on the free tier
export async function POST(request: NextRequest) {
  try {
    const { text, targetLanguage, sourceLanguage } = await request.json()

    if (!text || !targetLanguage) {
      return NextResponse.json({ error: 'Text and target language are required' }, { status: 400 })
    }

    // If source and target are the same, no translation needed
    if (sourceLanguage === targetLanguage) {
      return NextResponse.json({
        translatedText: text,
        sourceLanguage: sourceLanguage,
        targetLanguage: targetLanguage,
        originalText: text
      })
    }

    console.log('Translation request:', {
      text: text.substring(0, 100),
      from: sourceLanguage,
      to: targetLanguage
    })

    // Map language codes to ISO 639-1 format (standard for translation APIs)
    const langMap: { [key: string]: string } = {
      'en': 'en',
      'es': 'es',
      'fr': 'fr',
      'de': 'de',
      'zh': 'zh-CN', // Google expects zh-CN or zh-TW
      'ja': 'ja',
      'ko': 'ko',
      'pt': 'pt',
      'ar': 'ar',
      'hi': 'hi',
      'ru': 'ru',
      'it': 'it',
      'nl': 'nl',
      'sv': 'sv',
      'da': 'da',
      'no': 'no',
      'fi': 'fi',
      'pl': 'pl',
      'tr': 'tr',
      'uk': 'uk',
      'vi': 'vi',
      'th': 'th'
    }

    const targetLang = langMap[targetLanguage] || targetLanguage
    const sourceLang = langMap[sourceLanguage] || sourceLanguage || 'en'

    const apiKey = process.env.GOOGLE_TRANSLATE_API_KEY
    if (!apiKey) {
      console.warn('Google Translate API key not found. Returning original text.')
      return NextResponse.json({
        translatedText: text,
        sourceLanguage: sourceLang,
        targetLanguage: targetLang,
        originalText: text,
        service: 'none',
        error: 'Translation API key missing'
      })
    }

    try {
      const url = `https://translation.googleapis.com/language/translate/v2?key=${apiKey}`

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          q: text,
          source: sourceLang,
          target: targetLang,
          format: 'text', // Prevent HTML encoding issues
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error('Google Translate API error data:', errorData)
        throw new Error(`Google Translate API error: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()

      // Google Translate API v2 response format
      let translatedText = data?.data?.translations?.[0]?.translatedText || text

      // Clean up the translation
      translatedText = translatedText.trim()

      return NextResponse.json({
        translatedText,
        sourceLanguage: sourceLang,
        targetLanguage: targetLang,
        originalText: text,
        service: 'GoogleTranslate'
      })

    } catch (apiError: any) {
      console.error('Google Translate API error:', apiError)

      // Return original text as fallback if API fails
      return NextResponse.json({
        translatedText: text,
        sourceLanguage: sourceLang,
        targetLanguage: targetLang,
        originalText: text,
        service: 'none',
        error: 'Translation service unavailable'
      })
    }

  } catch (error) {
    console.error('Translation error:', error)
    return NextResponse.json({
      error: 'Translation failed',
      translatedText: '',
      originalText: ''
    }, { status: 500 })
  }
}
