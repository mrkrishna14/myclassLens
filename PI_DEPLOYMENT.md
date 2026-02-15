# Raspberry Pi Deployment Guide

## Overview

This guide explains how to deploy classLens on your Raspberry Pi 5 with the new multi-client streaming architecture:

- **Phone** (`/record`) = Camera capture, streams to Pi
- **Pi** = Server + WebSocket relay + transcription
- **Desktop** (`/live`) = Viewer with live video + captions

---

## What Changed

### 1. Camera preference fixed
- iPhone now uses **back camera** instead of front camera by default

### 2. New multi-client streaming
- **`/record` page**: Phone captures camera and streams frames to Pi via WebSocket
- **`/live` page**: Desktop subscribes to stream and displays video + captions
- **Custom server**: `server.js` runs Next.js + WebSocket server on same port (3000)

### 3. New dependencies
- Added `ws` package for WebSocket support

---

## Deployment Steps on Pi

### 1. On your Mac: Commit and push changes

```bash
cd ~/Desktop/Coding_Projects/classLens/classLens
git add .
git commit -m "Add multi-client streaming: phone camera -> Pi -> desktop viewer"
git push origin DesktopApp
```

### 2. On the Pi: Pull changes and install dependencies

SSH into your Pi:

```bash
ssh classlens@rpi5
```

Then:

```bash
cd ~/classLens
git pull origin DesktopApp
cd frontend
npm install
```

This will install the new `ws` package.

### 3. On the Pi: Run the server

```bash
cd ~/classLens
npm run dev
```

You should see:

```
> Ready on http://0.0.0.0:3000
> WebSocket server ready on ws://0.0.0.0:3000/api/stream
```

---

## Usage

### Phone (iPhone) - Camera Capture

1. On your iPhone, connect to the **same Wi-Fi** as the Pi
2. Open Safari or Chrome
3. Go to: `http://192.168.86.50:3000/record`
   - (Replace `192.168.86.50` with your Pi's actual IP)
4. Allow camera and microphone permissions
5. Tap **"Start Recording"**
6. You should see:
   - Live preview of your back camera
   - "Connected" status indicator

### Desktop/Laptop - Viewer

1. On your desktop, connect to the **same Wi-Fi** as the Pi
2. Open a browser
3. Go to: `http://192.168.86.50:3000/live`
4. You should see:
   - Live video stream from the iPhone camera
   - "Connected" status indicator
   - Live captions will appear at the bottom (when implemented)

### Testing the old "Live Camera" flow

The original single-client flow still works:

- Go to `http://192.168.86.50:3000` on iPhone
- Tap "Live Camera"
- This uses the iPhone as both camera + viewer in one tab

---

## Troubleshooting

### "Unable to access camera" on iPhone

If you get camera permission errors on `/record`:

1. Make sure you're using **HTTPS** or the `.local` hostname
2. Try: `http://rpi5.local:3000/record` instead of the IP
3. If that doesn't work, set up HTTPS (see below)

### Setting up HTTPS (if needed)

On the Pi:

```bash
cd ~/classLens/frontend
openssl req -x509 -newkey rsa:2048 -nodes -sha256 -subj '/CN=localhost' \
  -keyout localhost-key.pem -out localhost.pem -days 365
```

Then modify `server.js` to use HTTPS (I can provide the code if needed).

Access via: `https://192.168.86.50:3000/record`

### Desktop can't see stream

1. Make sure the **phone is recording** first (`/record` page, "Start Recording" pressed)
2. Then open `/live` on desktop
3. Check browser console for WebSocket errors

### WebSocket connection fails

1. Confirm `npm run dev` is running on the Pi (not `next dev`)
2. Check firewall isn't blocking port 3000
3. Verify both devices are on same Wi-Fi network

---

## Next Steps (Future Enhancements)

### Add live transcription to `/live` viewer

Currently, the `/live` page displays video but doesn't run transcription yet. To add:

1. Modify `/record` to also stream audio chunks to Pi
2. Add AssemblyAI real-time transcription on the Pi backend
3. Broadcast caption updates to all `/live` viewers via WebSocket

### Auto-start on boot

To make the Pi start the server automatically on boot:

```bash
sudo nano /etc/systemd/system/classlens.service
```

Paste:

```ini
[Unit]
Description=ClassLens Server
After=network.target

[Service]
Type=simple
User=classlens
WorkingDirectory=/home/classlens/classLens
ExecStart=/usr/bin/npm run dev
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

Then:

```bash
sudo systemctl enable classlens
sudo systemctl start classlens
```

---

## Architecture Summary

```
┌─────────────┐         WebSocket          ┌──────────────┐
│   iPhone    │ ─────── (frames) ────────> │  Raspberry   │
│  /record    │                             │     Pi       │
│  (Camera)   │                             │  (Server +   │
└─────────────┘                             │   Relay)     │
                                            └──────────────┘
                                                   │
                                                   │ WebSocket
                                                   │ (frames)
                                                   ▼
                                            ┌──────────────┐
                                            │   Desktop    │
                                            │    /live     │
                                            │  (Viewer)    │
                                            └──────────────┘
```

All devices connect to the Pi on port 3000. The Pi relays video frames from the phone to all desktop viewers in real-time.
