# ClassLens Build Explanation

## Overview

ClassLens is a complete web-based interactive lecture tool built with Next.js 14, TypeScript, and Tailwind CSS. It allows users to upload pre-recorded lecture videos and interact with them through AI-powered explanations, real-time captions, and an intuitive drag-and-ask interface.

## Architecture

### Frontend Structure

The application follows Next.js 14's App Router pattern:

```
app/
├── page.tsx          # Main entry point - handles video upload and player routing
├── layout.tsx         # Root layout with metadata
├── globals.css        # Global Tailwind styles
└── api/
    ├── explain/       # AI explanation endpoint (GPT-4 Vision)
    └── transcribe/    # Audio transcription endpoint (Whisper)
```

### Component Architecture

**1. UploadInterface (`components/UploadInterface.tsx`)**
- Drag-and-drop file upload
- Language selection for captions and AI explanations
- Clean, modern UI with gradient backgrounds

**2. VideoPlayer (`components/VideoPlayer.tsx`)**
- Core video playback with HTML5 video element
- Manages all player state (play/pause, volume, seeking)
- Coordinates transcription, captions, and interactions
- Handles bounding box drawing and question submission

**3. BoundingBoxDrawer (`components/BoundingBoxDrawer.tsx`)**
- Canvas-based drawing interface
- Allows users to draw boxes over video regions
- Captures mouse events for precise selection
- Visual feedback with highlighted selection area

**4. QuestionPanel (`components/QuestionPanel.tsx`)**
- Input form for user questions
- Appears after bounding box selection
- Submits question with image and context to AI API

**5. InteractionLog (`components/InteractionLog.tsx`)**
- Sidebar displaying all past interactions
- Shows thumbnails, timestamps, questions, and answers
- Clickable items to jump to video timestamps

**6. CaptionDisplay (`components/CaptionDisplay.tsx`)**
- Overlay component for video captions
- Supports three size options (small, medium, large)
- Styled with drop shadows for readability

**7. AccessibilityPanel (`components/AccessibilityPanel.tsx`)**
- Playback speed control (0.25x - 2x)
- Caption size selector
- Accessible UI controls

## Key Features Implementation

### 1. Video Upload & Language Selection

**Flow:**
1. User drags/drops or selects video file
2. System validates file type (video/*)
3. Language selection screen appears
4. User selects caption language and AI explanation language
5. Video loads into player

**Implementation:**
- Uses HTML5 File API for file handling
- Creates object URL for video playback
- State management in main page component

### 2. Real-Time Captions

**Flow:**
1. Video loads → Transcription API called automatically
2. OpenAI Whisper transcribes entire video
3. Transcript segments stored with timestamps
4. During playback, captions update based on current time
5. Captions displayed as overlay on video

**Implementation:**
- `useEffect` hook triggers transcription on video load
- Transcript segments stored in state array
- Interval checks current video time and matches to transcript segment
- Caption text updates in real-time

**API Integration:**
- POST to `/api/transcribe` with video file
- OpenAI Whisper API processes video (extracts audio automatically)
- Returns segments with start/end times and text

### 3. Drag-and-Ask Interface

**Flow:**
1. User clicks "Ask Question" or pauses video
2. Bounding box drawing mode activates
3. User draws box over video region
4. Question panel appears
5. User types question
6. System captures:
   - Screenshot of selected region (canvas extraction)
   - Current video timestamp
   - Transcript snippet at that timestamp
   - User's question

**Implementation:**
- `BoundingBoxDrawer` component handles mouse events
- Tracks start position on mousedown
- Updates box dimensions on mousemove
- Finalizes box on mouseup
- Canvas API extracts image from video element at bounding box coordinates

### 4. AI-Generated Explanations

**Flow:**
1. Question submitted with image, transcript, and timestamp
2. POST request to `/api/explain`
3. GPT-4 Vision analyzes image with context
4. Response displayed in interaction log
5. Interaction saved to history

**Implementation:**
- Image converted to base64 data URL
- Transcript snippet provides context
- GPT-4 Vision model processes image + text
- Response formatted and displayed

**API Integration:**
- POST to `/api/explain` with JSON payload
- OpenAI GPT-4o model with vision capabilities
- Returns conversational explanation

### 5. Interaction History

**Flow:**
1. Each interaction stored with:
   - Unique ID
   - Timestamp
   - Screenshot thumbnail
   - Question
   - AI answer
   - Transcript snippet
2. Displayed in sidebar
3. Clicking interaction jumps to that timestamp

**Implementation:**
- Interactions stored in state array
- Each interaction is an object with all metadata
- Sidebar maps over interactions array
- Click handler seeks video to interaction timestamp

### 6. Accessibility Features

**Features:**
- **Playback Speed**: 0.25x to 2x in 0.25 increments
- **Caption Size**: Small, Medium, Large options
- **Keyboard Support**: ESC to cancel operations

**Implementation:**
- Playback rate set via `video.playbackRate` property
- Caption size passed as prop to `CaptionDisplay`
- CSS classes adjust font size dynamically

## API Routes

### `/api/transcribe` (POST)

**Purpose:** Transcribe video audio to text with timestamps

**Input:**
- FormData with `audio` file and `language` code

**Process:**
1. Receives video file (Whisper handles video directly)
2. Converts to Buffer
3. Calls OpenAI Whisper API
4. Returns segments with timestamps

**Output:**
```json
{
  "text": "Full transcript",
  "segments": [
    {
      "start": 0.0,
      "end": 5.2,
      "text": "Segment text"
    }
  ],
  "language": "en"
}
```

### `/api/explain` (POST)

**Purpose:** Generate AI explanations for selected video regions

**Input:**
```json
{
  "image": "base64_image_data",
  "question": "User question",
  "transcriptSnippet": "Context from transcript",
  "timestamp": 120.5,
  "targetLanguage": "en"
}
```

**Process:**
1. Validates image and question
2. Constructs prompt with context
3. Calls GPT-4o with vision
4. Returns explanation

**Output:**
```json
{
  "explanation": "AI-generated explanation"
}
```

## State Management

The application uses React hooks for state management:

- **Main Page**: Manages video file, URL, and language preferences
- **VideoPlayer**: Manages all video playback state, interactions, transcript, and UI states
- **Child Components**: Receive props and callbacks, maintain minimal local state

## Styling

- **Tailwind CSS** for utility-first styling
- **Custom color palette** with primary blue theme
- **Responsive design** with flexbox layouts
- **Dark theme** for video player area
- **Gradient backgrounds** for landing page

## Environment Setup

**Required:**
- Node.js 18+
- OpenAI API key

**Environment Variables:**
```
OPENAI_API_KEY=your_key_here
```

## Running the Application

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment:**
   ```bash
   cp .env.local.example .env.local
   # Edit .env.local and add your OpenAI API key
   ```

3. **Run development server:**
   ```bash
   npm run dev
   ```

4. **Build for production:**
   ```bash
   npm run build
   npm start
   ```

## Technical Decisions

### Why Next.js?
- Server-side API routes for secure API key handling
- Excellent TypeScript support
- App Router for modern React patterns
- Built-in optimizations

### Why OpenAI APIs?
- **Whisper**: Industry-leading transcription accuracy
- **GPT-4o**: Best-in-class vision understanding
- Unified API for both services
- Good documentation and reliability

### Why Canvas for Screenshots?
- Native browser API, no dependencies
- Precise pixel-level control
- Efficient image extraction
- Works with video elements directly

## Future Enhancements

1. **Real-time Streaming Transcription**: Process audio chunks during playback
2. **Lecture Summary**: Generate full lecture summary after completion
3. **Bookmarks**: Allow users to flag important segments
4. **Export Notes**: Download interaction history as PDF/study guide
5. **Multi-language Improvements**: Better translation handling
6. **Video Optimization**: Compress/optimize uploaded videos
7. **Cloud Storage**: Integrate with S3/Cloudinary for video storage

## Known Limitations

1. **Transcription**: Currently transcribes entire video upfront (can be slow for long videos)
2. **Video Format**: Relies on browser support for video formats
3. **API Costs**: OpenAI API usage incurs costs (consider rate limiting)
4. **File Size**: Large video files may cause performance issues
5. **Real-time**: Captions are pre-generated, not truly "live"

## Security Considerations

- API keys stored in environment variables (never in client code)
- File uploads validated on client and server
- CORS handled by Next.js
- No user authentication (add for production)

## Performance Optimizations

- Video object URLs for efficient playback
- Transcript segments stored in memory (consider pagination for long videos)
- Canvas operations only when needed
- Debounced caption updates
- Lazy loading for interaction thumbnails

---

This implementation provides a solid foundation for an interactive lecture tool with all core features working. The architecture is extensible and can be enhanced with additional features as needed.
