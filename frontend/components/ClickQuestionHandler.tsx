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
          className="absolute bg-white rounded-lg shadow-2xl p-6 z-20 min-w-[320px] max-w-md"
          style={{
            left: `${Math.min(clickPos.x + 20, window.innerWidth - 340)}px`,
            top: `${Math.min(clickPos.y + 20, window.innerHeight - 300)}px`,
          }}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">Ask About This Area</h3>
            <button
              onClick={() => {
                setShowQuestionPanel(false)
                setClickPos(null)
                setCustomQuestion('')
              }}
              className="p-1 hover:bg-gray-100 rounded"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
          </div>

          <div className="space-y-3">
            <button
              onClick={handleExplainSimply}
              className="w-full px-4 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-semibold flex items-center justify-center gap-2"
            >
              <Sparkles className="w-5 h-5" />
              Explain It Simply
            </button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">or ask a custom question</span>
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
                placeholder="Type your question here..."
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                autoFocus
              />
              <button
                onClick={handleCustomQuestion}
                disabled={!customQuestion.trim()}
                className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Ask Question
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
