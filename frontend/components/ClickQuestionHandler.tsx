'use client'

import { useState, useRef, useEffect } from 'react'
import { X, Sparkles } from 'lucide-react'

interface ClickQuestionHandlerProps {
  onQuestion: (clickPos: { x: number; y: number }, question: string) => void
  onCancel: () => void
}

export default function ClickQuestionHandler({ onQuestion, onCancel }: ClickQuestionHandlerProps) {
  const [clickPos, setClickPos] = useState<{ x: number; y: number } | null>(null)
  const [showQuestionPanel, setShowQuestionPanel] = useState(false)
  const [customQuestion, setCustomQuestion] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)

  const handleDoubleClick = (e: React.MouseEvent) => {
    if (!containerRef.current) return
    
    e.preventDefault()
    e.stopPropagation()
    
    const rect = containerRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    
    setClickPos({ x, y })
    setShowQuestionPanel(true)
  }

  const handleExplainSimply = () => {
    if (clickPos) {
      onQuestion(clickPos, 'Explain this simply')
      setShowQuestionPanel(false)
      setClickPos(null)
      setCustomQuestion('')
    }
  }

  const handleCustomQuestion = () => {
    if (clickPos && customQuestion.trim()) {
      onQuestion(clickPos, customQuestion.trim())
      setShowQuestionPanel(false)
      setClickPos(null)
      setCustomQuestion('')
    }
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel()
        setShowQuestionPanel(false)
        setClickPos(null)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onCancel])

  return (
    <>
      <div
        ref={containerRef}
        className="absolute inset-0 cursor-pointer z-10"
        onDoubleClick={handleDoubleClick}
        style={{ pointerEvents: 'auto' }}
      />
      
      {showQuestionPanel && clickPos && (
        <div
          className="absolute bg-white rounded-xl shadow-2xl p-5 z-20 min-w-[300px] max-w-sm border border-gray-200 transform transition-all duration-200 backdrop-blur-xl"
          style={{
            left: `${Math.min(clickPos.x + 20, window.innerWidth - 320)}px`,
            top: `${Math.min(clickPos.y + 20, window.innerHeight - 280)}px`,
          }}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
              <h3 className="text-base font-semibold text-gray-900">Ask about this</h3>
            </div>
            <button
              onClick={() => {
                setShowQuestionPanel(false)
                setClickPos(null)
                setCustomQuestion('')
              }}
              className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-4 h-4 text-gray-600" />
            </button>
          </div>

          <div className="space-y-3">
            <button
              onClick={handleExplainSimply}
              className="w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 font-semibold flex items-center justify-center gap-2 shadow-md hover:shadow-lg transform hover:scale-105"
            >
              <Sparkles className="w-4 h-4" />
              Explain this
            </button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-3 bg-white text-gray-500 font-medium">or ask anything</span>
              </div>
            </div>

            <div className="space-y-2">
              <input
                type="text"
                value={customQuestion}
                onChange={(e) => setCustomQuestion(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && customQuestion.trim()) {
                    handleCustomQuestion()
                  }
                }}
                placeholder="What do you want to know?"
                className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-sm"
                autoFocus
              />
              <button
                onClick={handleCustomQuestion}
                disabled={!customQuestion.trim()}
                className="w-full px-4 py-2.5 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-gray-900"
              >
                Ask
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
