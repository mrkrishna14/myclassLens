'use client'

import { Clock, MessageSquare, Image as ImageIcon } from 'lucide-react'

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
    <div className="w-96 bg-gray-800 text-white flex flex-col">
      <div className="p-4 border-b border-gray-700">
        <h2 className="text-lg font-semibold">Interaction History</h2>
        <p className="text-sm text-gray-400 mt-1">
          {interactions.length} {interactions.length === 1 ? 'interaction' : 'interactions'}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto">
        {interactions.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No interactions yet</p>
            <p className="text-sm mt-2">Pause the video and ask a question to get started</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-700">
            {interactions.map((interaction) => (
              <div
                key={interaction.id}
                className="p-4 hover:bg-gray-750 transition-colors cursor-pointer"
                onClick={() => onJumpToTimestamp(interaction.timestamp)}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0">
                    <img
                      src={interaction.image}
                      alt="Selected area"
                      className="w-16 h-16 object-cover rounded border border-gray-600"
                    />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Clock className="w-3 h-3 text-gray-400" />
                      <span className="text-xs text-gray-400">
                        {formatTime(interaction.timestamp)}
                      </span>
                      {Math.abs(currentTime - interaction.timestamp) < 1 && (
                        <span className="text-xs bg-primary-600 px-2 py-0.5 rounded">
                          Current
                        </span>
                      )}
                    </div>
                    
                    <p className="text-sm font-medium text-white mb-1 line-clamp-2">
                      {interaction.question}
                    </p>
                    
                    <p className="text-xs text-gray-300 line-clamp-2">
                      {interaction.answer}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
