'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ArrowRight, Check } from 'lucide-react'

const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'zh', name: 'Chinese' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
]

export default function LiveSetupPage() {
  const router = useRouter()
  const [captionLang, setCaptionLang] = useState('en')
  const [aiLang, setAiLang] = useState('en')

  const handleStart = () => {
    router.push(`/live?captionLang=${captionLang}&aiLang=${aiLang}`)
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-2xl mx-auto px-6 py-12">
        {/* Back button */}
        <button
          onClick={() => router.push('/')}
          className="flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors mb-12"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>

        {/* Header */}
        <div className="mb-10">
          <h1 className="text-3xl font-semibold text-gray-900 mb-2">
            Settings
          </h1>
          <p className="text-gray-500">
            Choose your language preferences before starting.
          </p>
        </div>

        {/* Language Selection */}
        <div className="space-y-8 mb-12">
          {/* Caption Language */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Caption Language
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {LANGUAGES.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => setCaptionLang(lang.code)}
                  className={`flex items-center justify-between px-4 py-3 rounded-lg border transition-all ${
                    captionLang === lang.code
                      ? 'border-blue-600 bg-blue-50 text-blue-700'
                      : 'border-gray-200 hover:border-gray-300 text-gray-700'
                  }`}
                >
                  <span className="font-medium">{lang.name}</span>
                  {captionLang === lang.code && (
                    <Check className="w-4 h-4" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* AI Language */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              AI Explanation Language
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {LANGUAGES.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => setAiLang(lang.code)}
                  className={`flex items-center justify-between px-4 py-3 rounded-lg border transition-all ${
                    aiLang === lang.code
                      ? 'border-blue-600 bg-blue-50 text-blue-700'
                      : 'border-gray-200 hover:border-gray-300 text-gray-700'
                  }`}
                >
                  <span className="font-medium">{lang.name}</span>
                  {aiLang === lang.code && (
                    <Check className="w-4 h-4" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Start Button */}
        <button
          onClick={handleStart}
          className="w-full bg-gray-900 hover:bg-gray-800 text-white font-medium py-4 px-6 rounded-xl transition-colors flex items-center justify-center gap-2 group"
        >
          <span>Start watching</span>
          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </button>
      </div>
    </div>
  )
}
