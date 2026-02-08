import { NextRequest, NextResponse } from 'next/server'

// Simple translation API route for real-time translation
export async function POST(request: NextRequest) {
  try {
    const { text, targetLanguage, sourceLanguage } = await request.json()

    if (!text || !targetLanguage) {
      return NextResponse.json({ error: 'Text and target language are required' }, { status: 400 })
    }

    console.log('Translation request:', { text: text.substring(0, 50), targetLanguage, sourceLanguage })

    // For now, use a simple translation approach
    // In production, you'd want to use Google Translate API, Azure Translator, or similar
    
    // Map language codes to common translation API formats
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
      'tr': 'tr'
    }

    const targetLang = langMap[targetLanguage] || targetLanguage
    const sourceLang = langMap[sourceLanguage] || sourceLanguage || 'auto'

    // Simple mock translation for demonstration
    // Replace with actual translation service in production
    let translatedText = text

    // Basic mock translations for common phrases
    const mockTranslations: { [key: string]: { [key: string]: string } } = {
      'hello': {
        'es': 'hola',
        'fr': 'bonjour', 
        'de': 'hallo',
        'zh': '你好',
        'ja': 'こんにちは',
        'ko': '안녕하세요'
      },
      'goodbye': {
        'es': 'adiós',
        'fr': 'au revoir',
        'de': 'auf wiedersehen', 
        'zh': '再见',
        'ja': 'さようなら',
        'ko': '안녕히 가세요'
      },
      'thank you': {
        'es': 'gracias',
        'fr': 'merci',
        'de': 'danke',
        'zh': '谢谢',
        'ja': 'ありがとう',
        'ko': '감사합니다'
      }
    }

    // Check for mock translations first
    const lowerText = text.toLowerCase().trim()
    if (mockTranslations[lowerText] && mockTranslations[lowerText][targetLang]) {
      translatedText = mockTranslations[lowerText][targetLang]
    } else {
      // For demo purposes, add language indicator
      // In production, replace with actual translation API call
      if (targetLang !== 'en' && sourceLang !== targetLang) {
        translatedText = `[${targetLang.toUpperCase()}] ${text}`
      }
    }

    console.log('Translation result:', translatedText)

    return NextResponse.json({
      translatedText,
      sourceLanguage: sourceLang,
      targetLanguage: targetLang,
      originalText: text
    })

  } catch (error) {
    console.error('Translation error:', error)
    return NextResponse.json({ error: 'Translation failed' }, { status: 500 })
  }
}
