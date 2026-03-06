'use client'

import { useState, useRef } from 'react'
import { Upload, Video, Languages } from 'lucide-react'

interface UploadInterfaceProps {
  onVideoUpload: (file: File) => void
  onLanguageSelection: (caption: string, target: string) => void
  captionLanguage: string
  targetLanguage: string
}

const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'zh', name: 'Chinese' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'ar', name: 'Arabic' },
  { code: 'hi', name: 'Hindi' },
]

export default function UploadInterface({
  onBack,
  onVideoUpload,
  onLanguageSelection,
  captionLanguage,
  targetLanguage,
}: UploadInterfaceProps) {
  const [dragActive, setDragActive] = useState(false)
  const [showLanguageSelection, setShowLanguageSelection] = useState(false)
  const [selectedCaptionLang, setSelectedCaptionLang] = useState(captionLanguage)
  const [selectedTargetLang, setSelectedTargetLang] = useState(targetLanguage)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0])
    }
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0])
    }
  }

  const handleFile = (file: File) => {
    console.log('File selected:', file.name, file.type, file.size)
    if (file.type.startsWith('video/')) {
      setUploadedFile(file)
      setShowLanguageSelection(true)
      console.log('Video file accepted, showing language selection')
    } else {
      alert('Please upload a video file (MP4, MOV, etc.)')
    }
  }

  const handleContinue = () => {
    console.log('Continue clicked')
    console.log('Uploaded file:', uploadedFile)
    console.log('Caption language:', selectedCaptionLang)
    console.log('Target language:', selectedTargetLang)
    
    if (uploadedFile) {
      console.log('Calling onLanguageSelection and onVideoUpload')
      onLanguageSelection(selectedCaptionLang, selectedTargetLang)
      onVideoUpload(uploadedFile)
    } else {
      console.error('No file available!')
      alert('No video file selected. Please try uploading again.')
    }
  }

  if (showLanguageSelection) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-2xl w-full">
          <div className="flex items-center gap-3 mb-4">
            <Languages className="w-8 h-8 text-primary-600" />
            <h2 className="text-2xl font-bold text-gray-800">Select Languages</h2>
          </div>
          
          {uploadedFile && (
            <div className="mb-6 p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-800">
                <span className="font-semibold">Video selected:</span> {uploadedFile.name}
              </p>
              <p className="text-xs text-green-600 mt-1">
                Size: {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
          )}
          
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Caption Display Language
              </label>
              <select
                value={selectedCaptionLang}
                onChange={(e) => setSelectedCaptionLang(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white text-gray-900 font-medium"
              >
                {LANGUAGES.map((lang) => (
                  <option key={lang.code} value={lang.code} className="text-gray-900 bg-white">
                    {lang.name}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-sm text-gray-500">
                Language for displaying captions
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                AI Explanation Language (Optional)
              </label>
              <select
                value={selectedTargetLang}
                onChange={(e) => setSelectedTargetLang(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white text-gray-900 font-medium"
              >
                {LANGUAGES.map((lang) => (
                  <option key={lang.code} value={lang.code} className="text-gray-900 bg-white">
                    {lang.name}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-sm text-gray-500">
                Language for AI-generated explanations
              </p>
            </div>

            <div className="flex gap-4 pt-4">
              <button
                onClick={() => setShowLanguageSelection(false)}
                className="flex-1 px-6 py-3 border-2 border-gray-300 rounded-lg hover:bg-gray-100 hover:border-gray-400 transition-colors font-medium text-gray-700"
              >
                Back
              </button>
              <button
                onClick={handleContinue}
                className="flex-1 px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 active:bg-primary-800 transition-colors font-semibold shadow-md hover:shadow-lg"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-2xl w-full">
        <button
          onClick={onBack}
          className="px-6 py-3 rounded-xl border-2 border-gray-300 text-gray-700 font-semibold hover:border-gray-400 transition-colors"
        >
          Back
        </button>
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-100 rounded-full mb-4">
            <Video className="w-8 h-8 text-primary-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">ClassLens</h1>
          <p className="text-gray-600">
            Upload your lecture video to get started
          </p>
        </div>

        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors ${
            dragActive
              ? 'border-primary-500 bg-primary-50'
              : 'border-gray-300 hover:border-primary-400'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*"
            onChange={handleFileInput}
            className="hidden"
          />
          
          <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-lg font-medium text-gray-700 mb-2">
            Drag and drop your video here
          </p>
          <p className="text-sm text-gray-500 mb-4">or</p>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium"
          >
            Browse Files
          </button>
          <p className="text-xs text-gray-400 mt-4">
            Supports MP4, MOV, and other video formats
          </p>
        </div>
      </div>
    </div>
  )
}
