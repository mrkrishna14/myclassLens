'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useEffect, useState } from 'react'

interface CaptionDisplayProps {
  caption: string
  size: 'small' | 'medium' | 'large'
  className?: string
}

export default function CaptionDisplay({ caption, size, className = '' }: CaptionDisplayProps) {
  // Use local state to smooth out rapid updates
  const [displayCaption, setDisplayCaption] = useState(caption)

  useEffect(() => {
    // A small delay ensures rapid STT updates don't cause flickering animations
    const timer = setTimeout(() => {
      setDisplayCaption(caption)
    }, 50)
    return () => clearTimeout(timer)
  }, [caption])

  if (!displayCaption) return null

  const sizeClasses = {
    small: 'text-xl',
    medium: 'text-3xl',
    large: 'text-5xl',
  }

  // Split into words and keep only the last 15 words to avoid pile-up
  const words = displayCaption.trim().split(/\s+/).filter(Boolean)
  const maxWords = 15
  const displayWords = words.slice(-maxWords)

  // Use a stable key based on the word and its position from the root caption
  // This ensures framer-motion knows exactly which words are new.
  const totalLength = words.length
  const startIndex = Math.max(0, totalLength - maxWords)

  return (
    <div className={`absolute bottom-20 left-0 right-0 flex justify-center px-8 pointer-events-none ${className} z-20`}>
      <motion.div
        layout
        className="flex flex-wrap justify-center gap-[0.3em] text-white text-center shadow-[0_8px_32px_rgba(0,0,0,0.4)] bg-black/40 rounded-2xl px-10 py-5 max-w-6xl border border-white/20 backdrop-blur-md"
      >
        <AnimatePresence mode="popLayout">
          {displayWords.map((word, i) => {
            const absoluteIndex = startIndex + i
            const isLastWord = i === displayWords.length - 1

            return (
              <motion.span
                key={`${absoluteIndex}-${word.toLowerCase()}`}
                initial={{ opacity: 0, y: 15, scale: 0.9, filter: 'blur(4px)' }}
                animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
                exit={{ opacity: 0, scale: 0.9, filter: 'blur(4px)', transition: { duration: 0.2 } }}
                transition={{
                  type: 'spring',
                  stiffness: 400,
                  damping: 25,
                  mass: 0.8
                }}
                layout
                className={`font-semibold ${sizeClasses[size]} drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)] ${isLastWord ? 'text-blue-100' : 'text-white'
                  }`}
              >
                {word}
              </motion.span>
            )
          })}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}
