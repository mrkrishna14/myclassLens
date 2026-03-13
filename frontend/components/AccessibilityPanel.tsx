'use client'

import { X } from 'lucide-react'

interface AccessibilityPanelProps {
  playbackRate: number
  onPlaybackRateChange: (rate: number) => void
  captionSize: 'small' | 'medium' | 'large'
  onCaptionSizeChange: (size: 'small' | 'medium' | 'large') => void
  onClose: () => void
  isLive?: boolean
}

export default function AccessibilityPanel({
  playbackRate,
  onPlaybackRateChange,
  captionSize,
  onCaptionSizeChange,
  onClose,
  isLive = false,
}: AccessibilityPanelProps) {
  return (
    <div className="bg-gray-800 border-t border-gray-700 p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white font-semibold">Accessibility Settings</h3>
        <button
          onClick={onClose}
          className="p-1 hover:bg-gray-700 rounded transition-colors"
        >
          <X className="w-5 h-5 text-white" />
        </button>
      </div>

      <div className="space-y-4">
        {!isLive && (
          <div>
            <label className="block text-sm text-gray-300 mb-2">
              Playback Speed: {playbackRate}x
            </label>
            <input
              type="range"
              min="0.25"
              max="2"
              step="0.25"
              value={playbackRate}
              onChange={(e) => onPlaybackRateChange(parseFloat(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>0.25x</span>
              <span>0.5x</span>
              <span>0.75x</span>
              <span>1x</span>
              <span>1.25x</span>
              <span>1.5x</span>
              <span>1.75x</span>
              <span>2x</span>
            </div>
          </div>
        )}

        <div>
          <label className="block text-sm text-gray-300 mb-2">
            Caption Size
          </label>
          <div className="flex gap-2">
            {(['small', 'medium', 'large'] as const).map((size) => (
              <button
                key={size}
                onClick={() => onCaptionSizeChange(size)}
                className={`px-4 py-2 rounded transition-colors ${
                  captionSize === size
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {size.charAt(0).toUpperCase() + size.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
