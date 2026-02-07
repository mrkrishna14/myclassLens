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
    <div className={`absolute bottom-20 left-0 right-0 flex justify-center px-8 ${className}`}>
      <div
        className={`${sizeClasses[size]} font-medium text-white text-center drop-shadow-lg bg-black bg-opacity-75 rounded-lg px-6 py-3 max-w-4xl`}
      >
        {caption}
      </div>
    </div>
  )
}
