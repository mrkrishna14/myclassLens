'use client'

import { useState, useRef, useEffect } from 'react'

interface BoundingBoxDrawerProps {
  onComplete: (box: { x: number; y: number; width: number; height: number }) => void
  onCancel: () => void
}

export default function BoundingBoxDrawer({ onComplete, onCancel }: BoundingBoxDrawerProps) {
  const [isDrawing, setIsDrawing] = useState(false)
  const [startPos, setStartPos] = useState<{ x: number; y: number } | null>(null)
  const [currentBox, setCurrentBox] = useState<{ x: number; y: number; width: number; height: number } | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const turnOff = () => {
    setIsDrawing(false)
    setStartPos(null)
    setCurrentBox(null)
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    setStartPos({ x, y })
    setIsDrawing(true)
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDrawing || !startPos || !containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const currentX = e.clientX - rect.left
    const currentY = e.clientY - rect.top

    const x = Math.min(startPos.x, currentX)
    const y = Math.min(startPos.y, currentY)
    const width = Math.abs(currentX - startPos.x)
    const height = Math.abs(currentY - startPos.y)

    setCurrentBox({ x, y, width, height })
  }

  const handleMouseUp = () => {
    if (isDrawing && currentBox && currentBox.width > 10 && currentBox.height > 10) {
      onComplete(currentBox)
    }
    turnOff()
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        turnOff()
        onCancel()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onCancel])

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 cursor-crosshair z-10"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {currentBox && (
        <div
          className="absolute border-2 border-primary-500 bg-primary-500 bg-opacity-20 pointer-events-none"
          style={{
            left: `${currentBox.x}px`,
            top: `${currentBox.y}px`,
            width: `${currentBox.width}px`,
            height: `${currentBox.height}px`,
          }}
        />
      )}
    </div>
  )
}
