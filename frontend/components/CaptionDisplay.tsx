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
    <div className={`px-8 py-4 ${className}`}>
      <div
        className={`${sizeClasses[size]} font-medium text-white text-center drop-shadow-lg bg-black bg-opacity-60 rounded-lg px-6 py-3 inline-block`}
      >
        {caption}
      </div>
    </div>
  )
}
