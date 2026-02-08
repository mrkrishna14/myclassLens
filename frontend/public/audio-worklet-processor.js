// AudioWorklet processor for real-time audio streaming
class AudioProcessor extends AudioWorkletProcessor {
  constructor() {
    super()
    this.websocket = null
    this.port.onmessage = (event) => {
      if (event.data.type === 'init') {
        this.websocket = event.data.websocket
        this.sampleRate = event.data.sampleRate
      }
    }
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0]
    if (!input || !input[0] || !this.websocket) return true

    if (this.websocket.readyState === WebSocket.OPEN) {
      const inputData = input[0]
      const pcmData = new Int16Array(inputData.length)

      // Convert float32 to int16
      for (let i = 0; i < inputData.length; i++) {
        pcmData[i] = Math.max(-32768, Math.min(32767, inputData[i] * 32768))
      }

      // Send audio data
      this.websocket.send(pcmData.buffer)
    }

    return true
  }
}

registerProcessor('audio-processor', AudioProcessor)
