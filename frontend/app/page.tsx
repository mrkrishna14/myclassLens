'use client'

import { useState } from 'react'
import VideoPlayer from '@/components/VideoPlayer'
import UploadInterface from '@/components/UploadInterface'
import LiveCameraInterface from '@/components/LiveCameraInterface'

type Mode = 'select' | 'upload' | 'live' | 'playing'

export default function Home() {
  const [mode, setMode] = useState<Mode>('select')
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [liveStream, setLiveStream] = useState<MediaStream | null>(null)
  const [captionLanguage, setCaptionLanguage] = useState<string>('en')
  const [targetLanguage, setTargetLanguage] = useState<string>('en')
  const [aiLanguage, setAiLanguage] = useState<string>('en')

  const handleVideoUpload = (file: File) => {
    console.log('handleVideoUpload called with file:', file.name, file.size)
    setVideoFile(file)
    const url = URL.createObjectURL(file)
    console.log('Created video URL:', url)
    setVideoUrl(url)
    setMode('playing')
  }

  const handleStreamStart = (stream: MediaStream) => {
    console.log('Live stream started')
    setLiveStream(stream)
    setMode('playing')
  }

  const handleLanguageSelection = (caption: string, target: string, ai?: string) => {
    console.log('handleLanguageSelection called:', caption, target, ai)
    setCaptionLanguage(caption)
    setTargetLanguage(target)
    if (ai !== undefined) {
      setAiLanguage(ai)
    }
  }

  const handleBack = () => {
    // Clean up resources
    if (videoUrl) {
      URL.revokeObjectURL(videoUrl)
      setVideoUrl(null)
    }
    if (liveStream) {
      liveStream.getTracks().forEach(track => track.stop())
      setLiveStream(null)
    }
    setVideoFile(null)
    setMode('select')
  }

  if (mode === 'select') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-2xl w-full">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">ClassLens</h1>
            <p className="text-gray-600">
              Choose how you want to start your lecture session
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <button
              onClick={() => setMode('upload')}
              className="p-8 border-2 border-gray-300 rounded-xl hover:border-primary-500 hover:bg-primary-50 transition-all text-left group"
            >
              <div className="text-4xl mb-4 group-hover:scale-110 transition-transform">📹</div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">Upload Video</h3>
              <p className="text-gray-600 text-sm">
                Upload a pre-recorded lecture video to analyze and interact with
              </p>
            </button>

            <button
              onClick={() => setMode('live')}
              className="p-8 border-2 border-gray-300 rounded-xl hover:border-primary-500 hover:bg-primary-50 transition-all text-left group"
            >
              <div className="text-4xl mb-4 group-hover:scale-110 transition-transform">📷</div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">Live Camera</h3>
              <p className="text-gray-600 text-sm">
                Use your camera (including iPhone wirelessly) for real-time lecture capture
              </p>
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (mode === 'upload') {
    return (
      <UploadInterface
        onVideoUpload={handleVideoUpload}
        onLanguageSelection={handleLanguageSelection}
        captionLanguage={captionLanguage}
        targetLanguage={targetLanguage}
      />
    )
  }

  if (mode === 'live') {
    return (
      <LiveCameraInterface
        onStreamStart={handleStreamStart}
        onLanguageSelection={handleLanguageSelection}
        captionLanguage={captionLanguage}
        targetLanguage={targetLanguage}
        aiLanguage={aiLanguage}
      />
    )
  }

  if (mode === 'playing') {
    return (
      <VideoPlayer
        videoUrl={videoUrl || undefined}
        videoFile={videoFile || undefined}
        liveStream={liveStream || undefined}
        captionLanguage={captionLanguage}
        targetLanguage={targetLanguage}
        aiLanguage={aiLanguage}
        isLive={!!liveStream}
      />
    )
  }

  return null
}
