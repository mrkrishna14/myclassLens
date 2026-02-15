'use client'

import { Clock, MessageSquare, Sparkles, User, Bot } from 'lucide-react'

interface Interaction {
  id: string
  timestamp: number
  image: string
  question: string
  answer: string
  transcriptSnippet: string
}

interface InteractionLogProps {
  interactions: Interaction[]
  onJumpToTimestamp: (timestamp: number) => void
  currentTime: number
}

export default function InteractionLog({
  interactions,
  onJumpToTimestamp,
  currentTime,
}: InteractionLogProps) {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="w-96 bg-white flex flex-col border-l border-gray-200">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="w-5 h-5 text-gray-900" />
          <h2 className="text-xl font-semibold text-gray-900">AI Explanations</h2>
        </div>
        <p className="text-sm text-gray-500">
          {interactions.length} {interactions.length === 1 ? 'question asked' : 'questions asked'}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {interactions.length === 0 ? (
          <div className="py-12 text-center">
            <MessageSquare className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="text-base font-medium text-gray-900 mb-1">No questions yet</p>
            <p className="text-sm text-gray-500">Double-click on the video to ask about anything!</p>
          </div>
        ) : (
          interactions.map((interaction) => (
            <div
              key={interaction.id}
              className="space-y-3 animate-fadeIn"
            >
              {/* Question Bubble */}
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-900 flex items-center justify-center">
                  <User className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1">
                  <div className="bg-gray-50 rounded-2xl rounded-tl-sm px-4 py-3 border border-gray-200">
                    <div className="flex items-center gap-2 mb-1">
                      <Clock className="w-3 h-3 text-gray-400" />
                      <span className="text-xs text-gray-500">
                        {formatTime(interaction.timestamp)}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-gray-900">
                      {interaction.question}
                    </p>
                  </div>
                </div>
              </div>

              {/* AI Answer Bubble */}
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-900 flex items-center justify-center">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1">
                  <div className="bg-white rounded-2xl rounded-tl-sm px-4 py-3 border border-gray-200 shadow-sm">
                    <div className="flex items-start gap-3">
                      {interaction.image && (
                        <img
                          src={interaction.image}
                          alt="Selected area"
                          className="w-20 h-20 object-cover rounded-lg border border-gray-200 flex-shrink-0"
                        />
                      )}
                      <div className="flex-1">
                        <p className="text-sm text-gray-900 leading-relaxed">
                          {interaction.answer}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Divider */}
              <div className="h-px bg-gray-200 my-2"></div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
