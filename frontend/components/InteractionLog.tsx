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
    <div className="w-96 bg-gradient-to-b from-gray-900 to-gray-800 text-white flex flex-col border-l border-gray-700">
      <div className="p-5 border-b border-gray-700 bg-gray-900/50">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="w-5 h-5 text-primary-400" />
          <h2 className="text-lg font-bold">AI Explanations</h2>
        </div>
        <p className="text-sm text-gray-400">
          {interactions.length} {interactions.length === 1 ? 'question asked' : 'questions asked'}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {interactions.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            <MessageSquare className="w-16 h-16 mx-auto mb-4 opacity-30" />
            <p className="text-base font-medium mb-2">No questions yet</p>
            <p className="text-sm">Double-click on the video to ask about anything!</p>
          </div>
        ) : (
          interactions.map((interaction) => (
            <div
              key={interaction.id}
              className="space-y-3 animate-fadeIn"
            >
              {/* Question Bubble */}
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center">
                  <User className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1">
                  <div className="bg-gray-700 rounded-2xl rounded-tl-sm px-4 py-3 shadow-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <Clock className="w-3 h-3 text-gray-400" />
                      <span className="text-xs text-gray-400">
                        {formatTime(interaction.timestamp)}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-white">
                      {interaction.question}
                    </p>
                  </div>
                </div>
              </div>

              {/* AI Answer Bubble */}
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-lg">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1">
                  <div className="bg-gradient-to-br from-primary-600 to-primary-700 rounded-2xl rounded-tl-sm px-4 py-3 shadow-xl border border-primary-500/30">
                    <div className="flex items-start gap-3">
                      {interaction.image && (
                        <img
                          src={interaction.image}
                          alt="Selected area"
                          className="w-20 h-20 object-cover rounded-lg border-2 border-white/20 flex-shrink-0"
                        />
                      )}
                      <div className="flex-1">
                        <p className="text-sm text-white leading-relaxed">
                          {interaction.answer}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Divider */}
              <div className="h-px bg-gray-700/50 my-2"></div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
