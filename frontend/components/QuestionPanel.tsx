'use client'

import { useState } from 'react'
import { Send, X } from 'lucide-react'

interface QuestionPanelProps {
  onSubmit: (question: string) => void
  onCancel: () => void
}

export default function QuestionPanel({ onSubmit, onCancel }: QuestionPanelProps) {
  const [question, setQuestion] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (question.trim()) {
      onSubmit(question.trim())
      setQuestion('')
    }
  }

  return (
    <div className="absolute bottom-24 left-1/2 transform -translate-x-1/2 w-full max-w-2xl px-4 z-20">
      <div className="bg-white rounded-lg shadow-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800">
            What would you like to know?
          </h3>
          <button
            onClick={onCancel}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="E.g., Explain this graph, or What does this equation mean?"
            className="flex-1 px-5 py-3.5 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-gray-50 focus:bg-white !text-gray-900 placeholder-gray-500 text-base font-medium"
            autoFocus
            style={{ color: '#111827' }}
          />
          <button
            type="submit"
            disabled={!question.trim()}
            className="px-7 py-3.5 bg-primary-600 text-white rounded-xl hover:bg-primary-700 active:bg-primary-800 disabled:bg-gray-400 disabled:text-gray-200 disabled:cursor-not-allowed transition-colors flex items-center gap-2 text-base font-semibold shadow-md hover:shadow-lg"
          >
            <Send className="w-4 h-4" />
            Ask
          </button>
        </form>
      </div>
    </div>
  )
}
