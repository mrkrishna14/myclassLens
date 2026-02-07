'use client'

import { useState } from 'react'
import VideoPlayer from '@/components/VideoPlayer'
import UploadInterface from '@/components/UploadInterface'

export default function Home() {
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [captionLanguage, setCaptionLanguage] = useState<string>('en')
  const [targetLanguage, setTargetLanguage] = useState<string>('en')

  const handleVideoUpload = (file: File) => {
    console.log('handleVideoUpload called with file:', file.name, file.size)
    setVideoFile(file)
    const url = URL.createObjectURL(file)
    console.log('Created video URL:', url)
    setVideoUrl(url)
  }

  const handleLanguageSelection = (caption: string, target: string) => {
    console.log('handleLanguageSelection called:', caption, target)
    setCaptionLanguage(caption)
    setTargetLanguage(target)
  }

  if (!videoUrl) {
    return (
      <UploadInterface
        onVideoUpload={handleVideoUpload}
        onLanguageSelection={handleLanguageSelection}
        captionLanguage={captionLanguage}
        targetLanguage={targetLanguage}
      />
    )
  }

  return (
    <VideoPlayer
      videoUrl={videoUrl}
      videoFile={videoFile!}
      captionLanguage={captionLanguage}
      targetLanguage={targetLanguage}
    />
  )
}
