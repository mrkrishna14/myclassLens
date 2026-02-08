import { NextRequest, NextResponse } from 'next/server'

// Real-time translation API using MyMemory Translation API (free, no API key required)
// Supports 100+ language pairs with good quality
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
      'zh': 'zh',
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

    try {
      // Use MyMemory Translation API (free, no API key required)
      // Limit: 1000 words/day per IP
      const encodedText = encodeURIComponent(text)
      const url = `https://api.mymemory.translated.net/get?q=${encodedText}&langpair=${sourceLang}|${targetLang}`
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      })

      if (response.status === 429) {
        // Rate limited - return original text immediately without trying fallback
        console.warn('Translation API rate limited (429). Returning original text.')
        return NextResponse.json({
          translatedText: text,
          sourceLanguage: sourceLang,
          targetLanguage: targetLang,
          originalText: text,
          service: 'none',
          rateLimited: true
        })
      }

      if (!response.ok) {
        throw new Error(`Translation API error: ${response.status}`)
      }

      const data = await response.json()
      
      // MyMemory API response format: { responseData: { translatedText: "..." } }
      let translatedText = data.responseData?.translatedText || text

      // Clean up the translation
      translatedText = translatedText.trim()

      console.log('Translation result:', translatedText.substring(0, 100))

      return NextResponse.json({
        translatedText,
        sourceLanguage: sourceLang,
        targetLanguage: targetLang,
        originalText: text,
        service: 'MyMemory'
      })

    } catch (apiError: any) {
      // If rate limited, don't try fallback - just return original
      if (apiError.message?.includes('429')) {
        console.warn('Translation API rate limited. Returning original text.')
        return NextResponse.json({
          translatedText: text,
          sourceLanguage: sourceLang,
          targetLanguage: targetLang,
          originalText: text,
          service: 'none',
          rateLimited: true
        })
      }

      console.error('MyMemory API error:', apiError)
      
      // For other errors, return original text without trying fallback
      // (LibreTranslate also has rate limits)
      console.warn('Translation failed, returning original text')
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
