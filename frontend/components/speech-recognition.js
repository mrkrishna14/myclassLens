// Speech recognition utility - handles Web Speech API for real-time transcription
// Plain JavaScript to avoid TypeScript compilation issues

export function startSpeechRecognition(language, onResult, onError) {
  // Language mapping
  const languageMap = {
    'en': 'en-US', // English
    'es': 'es-ES', // Spanish (Spain)
    'fr': 'fr-FR', // French
    'de': 'de-DE', // German
    'zh': 'zh-CN', // Chinese (Mandarin)
    'ja': 'ja-JP', // Japanese
    'ko': 'ko-KR', // Korean
    'pt': 'pt-BR', // Portuguese (Brazil)
    'ar': 'ar-SA', // Arabic (Saudi Arabia)
    'hi': 'hi-IN', // Hindi
  }

  const speechLanguage = languageMap[language] || language

  // Check if Web Speech API is supported
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition

  if (!SpeechRecognition) {
    onError('Web Speech API not supported in this browser')
    return
  }

  let recognition = null
  let restartTimeout = null
  let isStarting = false

  const startRecognition = () => {
    if (isStarting) return
    isStarting = true

    try {
      recognition = new SpeechRecognition()

      // Configure recognition
      recognition.continuous = true
      recognition.interimResults = true
      recognition.lang = speechLanguage
      recognition.maxAlternatives = 1

      console.log(`🎤 Starting speech recognition in ${speechLanguage} (${language})`)

      recognition.onstart = function() {
        console.log('🎤 Speech recognition started')
        isStarting = false
        onResult('Listening...')
      }

      recognition.onresult = function(event) {
        let transcript = ''

        // Process all results
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i]
          transcript += result[0].transcript
        }

        // Update with current transcript
        onResult(transcript)
        console.log('📝 Transcript:', transcript)
      }

      recognition.onerror = function(event) {
        console.error('❌ Speech recognition error:', event.error)
        isStarting = false

        // Don't restart on "aborted" errors - these are normal when stopping
        if (event.error === 'aborted') {
          console.log('🔇 Speech recognition aborted (normal when stopping)')
          return
        }

        // Auto-restart on recoverable errors
        if (event.error === 'network' || event.error === 'not-allowed') {
          console.log('🔄 Retrying speech recognition...')
          setTimeout(() => {
            startRecognition()
          }, 2000) // Longer delay to prevent rapid restart loops
        } else {
          onError(event.error)
        }
      }

      recognition.onend = function() {
        console.log('🔄 Speech recognition ended')
        isStarting = false

        // Only restart if we're still in live mode and not aborted
        if (recognition && recognition.error !== 'aborted') {
          console.log('🔄 Restarting speech recognition...')
          restartTimeout = setTimeout(() => {
            startRecognition()
          }, 1000)
        }
      }

      // Start recognition
      recognition.start()

    } catch (error) {
      console.error('Failed to initialize speech recognition:', error)
      isStarting = false
      onError(error.message || 'Failed to start speech recognition')
    }
  }

  // Start the recognition
  startRecognition()

  // Return cleanup function
  return function stopRecognition() {
    if (restartTimeout) {
      clearTimeout(restartTimeout)
      restartTimeout = null
    }
    if (recognition) {
      try {
        recognition.stop()
      } catch (e) {
        console.log('Recognition already stopped')
      }
      recognition = null
    }
  }
}

export function stopSpeechRecognition() {
  // This would need to be implemented if we want to stop recognition
  // For now, it's handled by the component cleanup
}
