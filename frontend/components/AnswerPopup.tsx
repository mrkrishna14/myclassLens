'use client'

import { X, Copy, Check } from 'lucide-react'
import { useState } from 'react'
import { formatMathText } from '@/lib/formatMathText'

interface AnswerPopupProps {
  answer: string
  question: string
  onClose: () => void
}

export default function AnswerPopup({ answer, question, onClose }: AnswerPopupProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(answer)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[85vh] flex flex-col border border-gray-200 transform transition-all">
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-t-2xl">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <h3 className="text-lg font-semibold text-gray-900">
                AI Assistant
              </h3>
            </div>
            <p className="text-sm text-gray-600 font-medium">
              &quot;{question}&quot;
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white hover:bg-opacity-70 rounded-lg transition-all duration-200 ml-4"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Answer Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="prose prose-sm max-w-none">
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <p className="text-gray-800 leading-relaxed whitespace-pre-wrap text-base">
                {formatMathText(answer)}
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
          <button
            onClick={handleCopy}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-white hover:border-gray-300 border border-gray-200 rounded-lg transition-all duration-200"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-green-600" />
                <span className="text-green-600">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span>Copy</span>
              </>
            )}
          </button>
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 active:from-blue-800 active:to-indigo-800 transition-all duration-200 font-semibold shadow-md hover:shadow-lg transform hover:scale-105"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  )
}
