'use client'

interface CaptionDisplayProps {
  caption: string
  size: 'small' | 'medium' | 'large'
  className?: string
}

export default function CaptionDisplay({ caption, size, className = '' }: CaptionDisplayProps) {
  if (!caption) return null

  const sizeClasses = {
    small: 'text-lg',
    medium: 'text-2xl',
    large: 'text-4xl',
  }

  return (
    <div className={`absolute bottom-20 left-0 right-0 flex justify-center px-8 ${className} z-20`}>
      <div
        className={`${sizeClasses[size]} font-semibold text-white text-center drop-shadow-2xl bg-gradient-to-r from-black/90 via-black/85 to-black/90 rounded-xl px-8 py-4 max-w-5xl border-2 border-white/20 backdrop-blur-sm animate-fadeIn`}
      >
        {caption}
      </div>
    </div>
  )
}
