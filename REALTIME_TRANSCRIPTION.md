# Real-Time Transcription for ClassLens

## Current Implementation

ClassLens currently uses **batch transcription** with AssemblyAI:
- Video is uploaded and transcribed **before** playback begins
- Transcription takes 30-60 seconds for a 5-minute video
- Captions are then displayed in sync with video playback

## Real-Time Transcription Options

### Option 1: Browser Web Speech API (FREE, Limited)

**Pros:**
- Completely free
- No API calls needed
- Works in browser

**Cons:**
- Only works with live audio (not pre-recorded videos)
- Limited language support
- Less accurate than cloud services
- Requires microphone access

**Not suitable for pre-recorded lecture videos.**

---

### Option 2: AssemblyAI Real-Time API (Paid)

**How it works:**
- Stream audio chunks to AssemblyAI as video plays
- Get transcription results in real-time
- Display captions with minimal delay

**Pricing:**
- $0.0015 per minute of audio
- More expensive than batch ($0.006/min for batch)

**Implementation:**
```typescript
import { RealtimeTranscriber } from 'assemblyai'

const transcriber = new RealtimeTranscriber({
  apiKey: process.env.ASSEMBLYAI_API_KEY,
  sampleRate: 16000,
})

transcriber.on('transcript', (transcript) => {
  console.log(transcript.text)
  // Display caption
})

// Stream audio chunks from video
videoElement.captureStream().getAudioTracks()[0]
```

---

### Option 3: Deepgram Real-Time API (Paid)

**How it works:**
- Similar to AssemblyAI
- Stream audio, get real-time transcription

**Pricing:**
- $0.0043 per minute for Nova-2 model
- Free tier: $200 credits

**Pros:**
- Very fast (< 300ms latency)
- High accuracy
- Good language support

---

### Option 4: Hybrid Approach (Recommended for ClassLens)

**Current batch transcription + Progressive display:**

1. Start transcription immediately when video uploads
2. Show loading indicator during transcription
3. Once complete, display captions in sync
4. Cache transcriptions for re-watched videos

**Benefits:**
- Uses existing free AssemblyAI tier
- No additional cost
- Better accuracy than real-time
- Works with pre-recorded videos

**Already implemented in ClassLens!**

---

## Why Current Approach is Best for ClassLens

1. **Pre-recorded videos** - Real-time transcription is designed for live audio
2. **Cost** - Batch transcription is 4x cheaper than real-time
3. **Accuracy** - Batch transcription is more accurate
4. **Free tier** - AssemblyAI gives 5 hours/month free for batch
5. **User experience** - 30-60 second wait is acceptable for lecture videos

---

## Future Enhancements

If you want to add live lecture capture:

1. **Use Deepgram Real-Time API**
   - Best latency and accuracy
   - $200 free credits to start

2. **Implementation:**
   ```typescript
   // Capture live audio from microphone
   const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
   
   // Connect to Deepgram WebSocket
   const deepgram = new DeepgramClient(apiKey)
   const connection = deepgram.listen.live({
     model: 'nova-2',
     language: 'en',
     smart_format: true,
   })
   
   // Stream audio and receive transcriptions
   connection.on('transcript', (data) => {
     displayCaption(data.channel.alternatives[0].transcript)
   })
   ```

3. **Cost estimate:**
   - 1-hour live lecture = $0.26 with Deepgram
   - Still very affordable

---

## Summary

✅ **Current ClassLens implementation is optimal for pre-recorded videos**
- Batch transcription with AssemblyAI
- Free tier: 5 hours/month
- 30-60 second processing time
- High accuracy

❌ **Real-time transcription not needed** unless adding live lecture capture

💡 **If adding live features:** Use Deepgram Real-Time API ($200 free credits)
