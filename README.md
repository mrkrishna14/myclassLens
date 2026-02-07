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
- **AI Integration**: OpenAI API (GPT-4 Vision, Whisper)
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
├── OPENAI_SETUP.md       # Detailed OpenAI API setup guide
└── package.json          # Root package.json (convenience scripts)
```

## Getting Started

### Prerequisites

- Node.js 18+ and npm/yarn
- OpenAI API key (see [OPENAI_SETUP.md](./OPENAI_SETUP.md) for detailed instructions)

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

3. **Set up OpenAI API key** (REQUIRED):
   - See [OPENAI_SETUP.md](./OPENAI_SETUP.md) for complete instructions
   - Quick version:
     ```bash
     cd frontend
     # Create .env.local file
     echo "OPENAI_API_KEY=your_key_here" > .env.local
     ```
   - Replace `your_key_here` with your actual OpenAI API key

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


## OpenAI API Setup

**⚠️ IMPORTANT: You must set up the OpenAI API before using ClassLens.**

See **[OPENAI_SETUP.md](./OPENAI_SETUP.md)** for complete, step-by-step instructions.

**Quick Summary:**
1. Get OpenAI API key from [platform.openai.com](https://platform.openai.com)
2. Add credits to your account (~$5-10 for testing)
3. Create `frontend/.env.local` file
4. Add: `OPENAI_API_KEY=your_key_here`

**Which APIs are used:**
- **Whisper API** - Transcribes video audio automatically
- **GPT-4o API** - Generates AI explanations for selected regions

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
