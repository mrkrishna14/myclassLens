'use client'

import { useRouter } from 'next/navigation'
import { Smartphone, Monitor, ArrowRight } from 'lucide-react'

export default function Home() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto px-6 py-16">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-5xl font-semibold text-gray-900 mb-4 tracking-tight">
            ClassLens
          </h1>
          <p className="text-xl text-gray-500">
            Stream lectures from your phone. Watch with live captions.
          </p>
        </div>

        {/* Cards */}
        <div className="grid md:grid-cols-2 gap-8 mb-16">
          {/* Record Card */}
          <button
            onClick={() => router.push('/record')}
            className="group text-left p-8 bg-gray-50 rounded-2xl border border-gray-200 hover:border-gray-300 hover:shadow-lg transition-all"
          >
            <div className="w-14 h-14 bg-blue-600 rounded-xl flex items-center justify-center mb-6">
              <Smartphone className="w-7 h-7 text-white" />
            </div>
            
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">
              Record
            </h2>
            <p className="text-gray-500 mb-6">
              Open this on your iPhone to start streaming video and audio.
            </p>
            
            <div className="flex items-center text-blue-600 font-medium group-hover:gap-2 transition-all">
              <span>Open on phone</span>
              <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
            </div>
          </button>

          {/* Viewer Card */}
          <button
            onClick={() => router.push('/live/setup')}
            className="group text-left p-8 bg-gray-50 rounded-2xl border border-gray-200 hover:border-gray-300 hover:shadow-lg transition-all"
          >
            <div className="w-14 h-14 bg-gray-900 rounded-xl flex items-center justify-center mb-6">
              <Monitor className="w-7 h-7 text-white" />
            </div>
            
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">
              Watch
            </h2>
            <p className="text-gray-500 mb-6">
              View the live stream with captions, translations, and Q&A.
            </p>
            
            <div className="flex items-center text-gray-900 font-medium group-hover:gap-2 transition-all">
              <span>Open viewer</span>
              <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
            </div>
          </button>
        </div>

        {/* Instructions */}
        <div className="border-t border-gray-200 pt-12">
          <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wide mb-6 text-center">
            How it works
          </h3>
          <div className="flex flex-col md:flex-row items-center justify-center gap-8 text-center">
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-sm font-medium text-gray-600">1</span>
              <span className="text-gray-600">Open Record on your phone</span>
            </div>
            <div className="hidden md:block w-8 h-px bg-gray-200"></div>
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-sm font-medium text-gray-600">2</span>
              <span className="text-gray-600">Open Watch on your computer</span>
            </div>
            <div className="hidden md:block w-8 h-px bg-gray-200"></div>
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-sm font-medium text-gray-600">3</span>
              <span className="text-gray-600">Start streaming</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
