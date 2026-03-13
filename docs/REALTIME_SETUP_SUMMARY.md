# Real-Time Live Camera Setup - Summary

## What's Been Implemented

Your ClassLens application now supports **real-time live camera streaming** with the following features:

### ✅ Completed Features

1. **Live Camera Interface**
   - New component for camera selection and setup
   - iPhone setup instructions built-in
   - Camera device enumeration and selection
   - Preview before starting session

2. **Real-Time Video Streaming**
   - Support for MediaStream (live camera feeds)
   - Works alongside existing file upload functionality
   - Automatic stream handling and cleanup

3. **Real-Time Transcription**
   - Uses Web Speech API for live transcription
   - Works in real-time as you speak
   - No API costs (browser-based)
   - Supports multiple languages

4. **Live Video Interactions**
   - Bounding boxes work on live video streams
   - Screenshot capture from live video
   - Question asking works in real-time
   - All existing features work with live streams

5. **Mode Selection**
   - Home screen now offers choice between:
     - Upload Video (existing functionality)
     - Live Camera (new functionality)

6. **Documentation**
   - Complete iPhone setup guide (IPHONE_CAMERA_SETUP.md)
   - Updated README with new features

## What You Need to Do

### 1. Set Up iPhone Camera (Required for Live Mode)

Choose one of these options:

**Option A: EpocCam (Easiest)**
- Install EpocCam app on iPhone (App Store)
- Install EpocCam desktop software (kinoni.com)
- Connect both devices to same Wi-Fi
- Your iPhone will appear as a camera option

**Option B: DroidCam (Free)**
- Install DroidCam on iPhone (App Store)
- Install DroidCam desktop client (dev47apps.com)
- Connect via Wi-Fi using IP address shown in app

**Option C: Continuity Camera (Mac Only)**
- Connect iPhone to Mac via USB or place nearby
- iPhone automatically appears as camera option
- No additional software needed

**See [IPHONE_CAMERA_SETUP.md](./IPHONE_CAMERA_SETUP.md) for detailed instructions**

### 2. Browser Requirements

For best results:
- **Chrome or Edge** (Recommended) - Full Web Speech API support
- **Firefox** - Limited support
- **Safari** - Limited support

### 3. Permissions

When you start Live Camera mode:
- Grant **camera** permission to your browser
- Grant **microphone** permission to your browser
- These are required for live streaming and transcription

### 4. Testing

1. Start the development server:
   ```bash
   cd frontend
   npm run dev
   ```

2. Open http://localhost:3000

3. Select "Live Camera" from the home screen

4. Follow the setup instructions if using iPhone

5. Select your camera and start streaming

6. Test real-time transcription by speaking

7. Test bounding boxes by clicking "Ask Question"

## How It Works

### Live Stream Flow

1. **User selects "Live Camera"** → Shows camera interface
2. **User selects camera device** → Requests media stream
3. **User selects languages** → Starts live session
4. **VideoPlayer receives MediaStream** → Displays live video
5. **Web Speech API starts** → Transcribes audio in real-time
6. **Captions update live** → Shows current speech
7. **User can draw boxes** → Works on live video frames
8. **Screenshots captured** → From current video frame
9. **AI explanations** → Work with live video context

### Real-Time Transcription

- Uses **Web Speech API** (browser built-in)
- No external API calls needed
- Transcribes as you speak
- Updates captions in real-time
- Stores transcript history for context

### Bounding Boxes on Live Video

- Works exactly like uploaded videos
- Captures current frame when box is drawn
- Scales coordinates correctly
- Extracts image from live video element
- Sends to AI with current transcript context

## Technical Details

### Modified Files

1. **`frontend/components/LiveCameraInterface.tsx`** (NEW)
   - Camera selection UI
   - Setup instructions
   - Stream initialization

2. **`frontend/components/VideoPlayer.tsx`** (MODIFIED)
   - Added MediaStream support
   - Real-time transcription with Web Speech API
   - Live time tracking
   - Stream cleanup

3. **`frontend/app/page.tsx`** (MODIFIED)
   - Mode selection (upload vs live)
   - Stream state management
   - Resource cleanup

### New Dependencies

None! All features use browser APIs:
- `navigator.mediaDevices.getUserMedia()` - Camera access
- `window.SpeechRecognition` - Real-time transcription
- `MediaStream` - Video streaming

## Limitations & Notes

1. **Web Speech API Limitations:**
   - Accuracy depends on browser and environment
   - Works best in Chrome/Edge
   - Requires good audio quality
   - May have slight delay (100-500ms)

2. **Live Stream Limitations:**
   - Can't seek/jump to timestamps (stream is live)
   - Can't change playback speed (stream is real-time)
   - Duration increases as stream continues

3. **Browser Compatibility:**
   - Web Speech API not available in all browsers
   - Safari has limited support
   - Chrome/Edge recommended

4. **Network Requirements:**
   - Stable Wi-Fi connection needed
   - Both devices on same network
   - Good bandwidth for video streaming

## Troubleshooting

### Camera Not Appearing
- Check camera app is running on iPhone
- Verify both devices on same Wi-Fi
- Refresh devices in ClassLens
- Check browser permissions

### No Transcription
- Check microphone permissions
- Verify Web Speech API support (Chrome/Edge)
- Check audio is being captured
- Try speaking more clearly

### Poor Video Quality
- Check Wi-Fi signal strength
- Lower quality in camera app settings
- Close other bandwidth-intensive apps
- Move closer to Wi-Fi router

## Next Steps

1. **Set up iPhone camera** using one of the methods above
2. **Test the live camera mode** in your browser
3. **Verify real-time transcription** is working
4. **Test bounding boxes** on live video
5. **Try asking questions** about live content

## Support

If you encounter issues:
1. Check [IPHONE_CAMERA_SETUP.md](./IPHONE_CAMERA_SETUP.md) troubleshooting section
2. Verify browser compatibility
3. Check browser console for errors
4. Ensure all permissions are granted

---

**You're all set!** The application now supports real-time live camera streaming with all the same interactive features. 🎉
