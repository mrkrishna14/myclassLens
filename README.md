# ClassLens - Interactive Lecture Tool

ClassLens is a web-based platform that lets users upload and interact with pre-recorded lecture videos as if they were participating in a live classroom. The system simulates classroom interaction by providing real-time captions, allowing users to ask questions about specific parts of the video, and generating AI-powered explanations.

## Features

### 🎯 Core Functionality

1. **Video Upload Interface**
   - Clean, drag-and-drop upload interface
   - Support for common video formats (MP4, MOV, etc.)
   - Language selection for captions and AI explanations

2. **Live Captions**
   - Auto-generated transcriptions from video audio
   - Translated captions in selected language
   - Time-synced with video playback

3. **Interactive Drag-and-Ask**
   - Pause video at any moment
   - Draw bounding boxes over any region (graphs, equations, diagrams, text)
   - Ask questions about selected areas
   - AI-generated explanations with context

4. **Interaction History**
   - Sidebar log of all interactions
   - Timestamp, screenshot, question, and answer for each interaction
   - Click to jump back to any point in the video

5. **Accessibility Features**
   - Adjustable playback speed (0.25x - 2x)
   - Configurable caption sizes (small, medium, large)
   - Full keyboard support

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **AI Integration**: Groq API (Llama 3.2 Vision), AssemblyAI (Transcription)
- **Icons**: Lucide React

## Project Structure

```
classLens/
├── frontend/              # All frontend code
│   ├── app/              # Next.js app directory
│   │   ├── api/          # API routes (transcribe, explain)
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/       # React components
│   ├── package.json      # Frontend dependencies
│   ├── next.config.js
│   ├── tailwind.config.js
│   ├── tsconfig.json
│   └── .env.local        # API keys (create this file)
├── README.md
├── GROQ_SETUP.md         # Detailed FREE API setup guide
├── OPENAI_SETUP.md       # (Legacy) OpenAI setup if you prefer paid option
└── package.json          # Root package.json (convenience scripts)
```

## Getting Started

### Prerequisites

- Node.js 18+ and npm/yarn
- Groq API key (FREE - see [GROQ_SETUP.md](./GROQ_SETUP.md) for instructions)
- AssemblyAI API key (FREE - see [GROQ_SETUP.md](./GROQ_SETUP.md) for instructions)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd classLens
```

2. Install dependencies:
```bash
npm install
# Or navigate to frontend and run:
cd frontend && npm install
```

3. **Set up API keys** (REQUIRED - 100% FREE):
   - See [GROQ_SETUP.md](./GROQ_SETUP.md) for complete instructions
   - Quick version:
     ```bash
     cd frontend
     # Create .env.local file
     echo "GROQ_API_KEY=your_groq_key_here" > .env.local
     echo "ASSEMBLYAI_API_KEY=your_assemblyai_key_here" >> .env.local
     ```
   - Get Groq key: [console.groq.com](https://console.groq.com) (FREE)
   - Get AssemblyAI key: [assemblyai.com](https://www.assemblyai.com) (FREE - 5 hrs/month)

4. Run the development server:
```bash
npm run dev
# Or from frontend directory:
cd frontend && npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

1. **Upload a Video**
   - Drag and drop a lecture video or click "Browse Files"
   - Select your preferred caption language
   - Choose the language for AI explanations (optional)

2. **Watch with Captions**
   - Play the video to see live captions appear
   - Captions are automatically generated and translated

3. **Ask Questions**
   - Click "Ask Question" or pause the video
   - Draw a box around the area you want to ask about
   - Type your question (e.g., "Explain this graph")
   - Receive an AI-generated explanation

4. **Review Interactions**
   - Check the sidebar for your interaction history
   - Click any interaction to jump to that timestamp
   - Review past questions and answers

5. **Accessibility**
   - Click the settings icon to adjust playback speed
   - Change caption size for better readability


## 🆓 Free API Setup

**⚠️ IMPORTANT: You must set up the free APIs before using ClassLens.**

See **[GROQ_SETUP.md](./GROQ_SETUP.md)** for complete, step-by-step instructions.

**Quick Summary:**
1. Get Groq API key from [console.groq.com](https://console.groq.com) - **FREE, no credit card**
2. Get AssemblyAI key from [assemblyai.com](https://www.assemblyai.com) - **FREE, 5 hours/month**
3. Create `frontend/.env.local` file
4. Add both keys:
   ```
   GROQ_API_KEY=your_groq_key_here
   ASSEMBLYAI_API_KEY=your_assemblyai_key_here
   ```

**Which APIs are used:**
- **AssemblyAI** - Transcribes video audio (FREE - 5 hrs/month)
- **Groq (Llama 3.2 Vision)** - Generates AI explanations (FREE)

**Total Cost: $0/month** 🎉

## API Endpoints

### POST `/api/explain`
Generates AI explanations for selected video regions.

**Request Body:**
```json
{
  "image": "base64_image_data",
  "question": "What does this graph show?",
  "transcriptSnippet": "Context from transcript",
  "timestamp": 120.5,
  "targetLanguage": "en"
}
```

**Response:**
```json
{
  "explanation": "The graph shows..."
}
```

### POST `/api/transcribe`
Transcribes video audio to text.

**Request:** FormData with `audio` file and `language` code

**Response:**
```json
{
  "text": "Full transcript text",
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

## Future Enhancements

- [ ] Real-time streaming transcription
- [ ] Lecture summary generation
- [ ] Bookmark/highlight important segments
- [ ] Export interaction history as study guide
- [ ] Multi-language support improvements
- [ ] Video quality optimization
- [ ] Cloud storage integration

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
