# Image Capture and AI Analysis Flow

## Complete Process Walkthrough

### 1. User Draws Bounding Box
**Component:** `BoundingBoxDrawer.tsx`

- User clicks "Ask Question" button
- Video pauses, bounding box drawer appears
- User drags to create a box around content (equations, diagrams, etc.)
- Coordinates are captured in **display pixels** (what you see on screen)

```typescript
// Example: User draws box at display coordinates
boundingBox = { x: 100, y: 50, width: 400, height: 300 }
```

### 2. Coordinate Scaling
**Component:** `VideoPlayer.tsx` → `handleQuestionSubmit()`

**Problem:** Display size ≠ Video size
- Display: 800x450 pixels (what you see)
- Actual video: 1920x1080 pixels (real resolution)

**Solution:** Scale coordinates
```typescript
const scaleX = videoActualWidth / videoDisplayWidth  // e.g., 1920/800 = 2.4
const scaleY = videoActualHeight / videoDisplayHeight // e.g., 1080/450 = 2.4

scaledBox = {
  x: boundingBox.x * scaleX,      // 100 * 2.4 = 240
  y: boundingBox.y * scaleY,      // 50 * 2.4 = 120
  width: boundingBox.width * scaleX,   // 400 * 2.4 = 960
  height: boundingBox.height * scaleY  // 300 * 2.4 = 720
}
```

### 3. Canvas Screenshot Capture
**Component:** `VideoPlayer.tsx` → `handleQuestionSubmit()`

```typescript
// Create canvas with scaled dimensions
const canvas = document.createElement('canvas')
canvas.width = scaledBox.width
canvas.height = scaledBox.height

// Draw the selected area from video to canvas
ctx.drawImage(
  video,                    // Source: video element
  scaledBox.x,             // Source X (in video coordinates)
  scaledBox.y,             // Source Y (in video coordinates)
  scaledBox.width,         // Source width
  scaledBox.height,        // Source height
  0,                       // Destination X (canvas)
  0,                       // Destination Y (canvas)
  scaledBox.width,         // Destination width
  scaledBox.height         // Destination height
)

// Convert canvas to base64 PNG data URL
const imageData = canvas.toDataURL('image/png')
// Result: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUg..."
```

### 4. Gather Context
**Component:** `VideoPlayer.tsx` → `handleQuestionSubmit()`

```typescript
// Get 30 seconds of transcript context (before and after current moment)
const contextWindow = 30
const relevantSegments = transcript.filter(
  seg => seg.start >= timestamp - 30 && seg.start <= timestamp + 30
)

const transcriptSnippet = relevantSegments.map(seg => seg.text).join(' ')
```

### 5. Send to API
**Component:** `VideoPlayer.tsx` → `handleQuestionSubmit()`

```typescript
await fetch('/api/explain', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    image: imageData,           // Base64 PNG data URL
    question: question,         // User's question
    transcriptSnippet: snippet, // 30 seconds of context
    timestamp: timestamp,       // Current video time
    targetLanguage: language    // Response language
  })
})
```

### 6. API Processing
**File:** `app/api/explain/route.ts`

```typescript
// Receive data
const { image, question, transcriptSnippet, timestamp, targetLanguage } = await request.json()

// Validate
if (!image || !question) {
  return error
}

// Send to Groq Llama 4 Scout Vision model
const response = await groq.chat.completions.create({
  model: 'meta-llama/llama-4-scout-17b-16e-instruct',
  messages: [
    {
      role: 'system',
      content: 'Expert educational assistant prompt...'
    },
    {
      role: 'user',
      content: [
        {
          type: 'text',
          text: `Context: "${transcriptSnippet}"\nQuestion: ${question}`
        },
        {
          type: 'image_url',
          image_url: {
            url: image  // Base64 data URL
          }
        }
      ]
    }
  ]
})
```

### 7. AI Analysis
**Groq Llama 4 Scout Vision Model:**

1. Receives base64 image data
2. Decodes and analyzes the image
3. Reads transcript context
4. Interprets:
   - Whiteboard content
   - Equations and formulas
   - Diagrams and drawings
   - Handwritten notes
5. Generates educational explanation

### 8. Display Response
**Component:** `AnswerPopup.tsx`

- Shows AI explanation in modal popup
- Includes "Copy Answer" button
- Stores in interaction history

## Debugging Checklist

When image is not being analyzed:

1. **Check Browser Console:**
   - `Captured image data length:` - Should be > 10000
   - `Image data prefix:` - Should start with "data:image/png;base64,"
   - `Sending request to /api/explain...`
   - `Image size:` - Should be reasonable (e.g., 50-500 KB)

2. **Check Terminal (API logs):**
   - `=== Explain API Called ===`
   - `Image data received: true`
   - `Image data length:` - Should match frontend
   - `Image data prefix:` - Should start with "data:image/png;base64,"
   - `Calling Groq API...`
   - `Groq API response received`

3. **Common Issues:**
   - **Empty canvas:** Video not loaded yet
   - **Wrong coordinates:** Scaling not applied
   - **Image too large:** Groq has 20MB limit
   - **Invalid base64:** Canvas encoding failed
   - **SSL errors:** Network/connection issues

## Expected Flow

```
User draws box (100, 50, 400x300 display coords)
  ↓
Scale to video coords (240, 120, 960x720 video coords)
  ↓
Capture canvas screenshot
  ↓
Convert to base64 PNG (~200KB)
  ↓
Gather 30s transcript context
  ↓
Send to /api/explain
  ↓
Groq analyzes image + context
  ↓
Return explanation
  ↓
Show in popup
```

## Current Status

✅ Coordinate scaling implemented
✅ Canvas capture with proper dimensions
✅ Base64 encoding
✅ Transcript context (30 seconds)
✅ Enhanced AI prompt for handwriting/whiteboards
✅ Comprehensive logging

**Next:** Test and check logs to verify image is reaching Groq API correctly.
