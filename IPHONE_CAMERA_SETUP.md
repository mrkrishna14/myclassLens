# iPhone Wireless Camera Setup Guide

This guide will help you set up your iPhone as a wireless camera for ClassLens Live mode.

## Overview

ClassLens Live mode allows you to use your iPhone camera wirelessly to stream real-time video to your computer. The system will provide real-time transcriptions and allow you to interact with the live video just like uploaded videos.

## Setup Options

### Option 1: EpocCam (Recommended - Easiest)

**EpocCam** is a popular app that turns your iPhone into a wireless webcam.

#### Steps:

1. **Install EpocCam on iPhone:**
   - Download "EpocCam" from the App Store (Free version available)
   - Open the app on your iPhone

2. **Install EpocCam Desktop Software:**
   - Visit [https://www.kinoni.com/epoccam/](https://www.kinoni.com/epoccam/)
   - Download and install the desktop app for your operating system (Mac/Windows)
   - Launch the EpocCam desktop app

3. **Connect:**
   - Make sure both devices are on the **same Wi-Fi network**
   - Open EpocCam on your iPhone
   - The app will automatically detect and connect to your computer
   - Your iPhone camera should now appear as a webcam option

4. **In ClassLens:**
   - Select "Live Camera" mode
   - Your iPhone camera should appear in the camera selection dropdown
   - Select it and click "Start Camera"

**Pricing:** Free version available, Pro version ($19.99) offers higher quality and more features

---

### Option 2: DroidCam (Free Alternative)

**DroidCam** is a free alternative that works on both iPhone and Android.

#### Choose Your Setup Based on Your Operating System:

**For Windows Users:**
1. **Install DroidCam on iPhone:**
   - Download "DroidCam" from the App Store (Free)
   - Open the app

2. **Install Windows Client:**
   - Visit [https://www.dev47apps.com/](https://www.dev47apps.com/)
   - Click "WINDOWS SETUP" button
   - Download and install the Windows client (Windows 10 or 11 x64 required)
   - Launch the desktop client

3. **Connect:**
   - Open DroidCam on your iPhone
   - Note the IP address shown in the app
   - Enter this IP in the desktop client
   - Click "Start" to connect

**For Linux Users:**
1. **Install DroidCam on iPhone:**
   - Download "DroidCam" from the App Store (Free)
   - Open the app

2. **Install Linux Client:**
   - Visit [https://www.dev47apps.com/](https://www.dev47apps.com/)
   - Click "LINUX SETUP" button
   - Download and install the Linux client
   - Launch the desktop client

3. **Connect:**
   - Open DroidCam on your iPhone
   - Note the IP address shown in the app
   - Enter this IP in the desktop client
   - Click "Start" to connect

**For Mac Users (via OBS Studio):**
Since DroidCam doesn't have a native Mac client, use the OBS Studio plugin:

1. **Install DroidCam on iPhone:**
   - Download "DroidCam" from the App Store (Free)
   - Open the app

2. **Install OBS Studio:**
   - Download OBS Studio from [https://obsproject.com/](https://obsproject.com/)
   - Install OBS Studio on your Mac

3. **Install DroidCam OBS Plugin:**
   - Visit [https://www.dev47apps.com/](https://www.dev47apps.com/)
   - Click "OBS PLUGIN" button
   - Download and install the plugin
   - The plugin works on all platforms including Mac

4. **Set Up in OBS:**
   - Open OBS Studio
   - Add DroidCam as a video source
   - Open DroidCam on your iPhone and note the IP address
   - Configure the source with the IP address
   - Enable "Start Virtual Camera" in OBS

5. **In ClassLens:**
   - Select "Live Camera" mode
   - Your iPhone camera should appear as "OBS Virtual Camera" in the dropdown
   - Select it and start streaming

**For All Users (After Setup):**
4. **In ClassLens:**
   - Select "Live Camera" mode
   - Your iPhone camera should appear in the dropdown
   - Select it and start streaming

**Pricing:** Free

---

### Option 3: Continuity Camera (Mac Only) - RECOMMENDED FOR MAC USERS

If you're using a Mac, you can use Apple's built-in Continuity Camera feature. This is the easiest option for Mac users - no additional software needed!

#### Requirements:

- ✅ Mac running **macOS Ventura (13.0)** or later
- ✅ iPhone running **iOS 16** or later
- ✅ Both devices signed into the **same Apple ID**
- ✅ **Bluetooth enabled** on both devices
- ✅ **Wi-Fi enabled** on both devices (for wireless connection)

#### Step-by-Step Setup:

**Step 1: Verify Requirements**
- Check your Mac version: Apple menu → About This Mac
- Check your iPhone version: Settings → General → About
- Make sure both devices are signed into the same Apple ID
- Enable Bluetooth: Mac (System Settings → Bluetooth) and iPhone (Settings → Bluetooth)

**Step 2: Connect Your iPhone**

You have two connection options:

**Option A: USB Connection (Most Reliable)**
1. Connect your iPhone to your Mac using a USB cable
2. On your iPhone, if prompted, tap "Trust This Computer" and enter your passcode
3. Your iPhone camera should automatically become available
4. You may see a notification on your Mac that Continuity Camera is active

**Option B: Wireless Connection**
1. Make sure both devices are on the same Wi-Fi network
2. Place your iPhone near your Mac (within Bluetooth range)
3. Your iPhone should automatically connect wirelessly
4. You may see a notification on your Mac that Continuity Camera is active

**Step 3: Verify Camera is Available**
- Open any app that uses the camera (like Photo Booth or FaceTime)
- Your iPhone should appear as a camera option
- If it doesn't appear, try disconnecting and reconnecting

**Step 4: Use in ClassLens**
1. Open ClassLens in your browser
2. Select **"Live Camera"** from the home screen
3. Grant camera and microphone permissions when prompted
4. In the camera dropdown, look for:
   - **"iPhone"** or
   - **"Continuity Camera"** or
   - Your iPhone's name (e.g., "Kanishk's iPhone")
5. Select your iPhone from the dropdown
6. Click **"Start Camera"**
7. Select your languages and begin your live session!

#### Troubleshooting Continuity Camera:

**If your iPhone doesn't appear:**
1. **Check connection:**
   - Try unplugging and reconnecting the USB cable
   - Or move your iPhone closer to your Mac (for wireless)

2. **Restart Continuity Camera:**
   - Disconnect your iPhone
   - Wait 10 seconds
   - Reconnect your iPhone

3. **Check system settings:**
   - Mac: System Settings → General → AirDrop & Handoff
   - Make sure "Allow Handoff between this Mac and your iCloud devices" is enabled
   - iPhone: Settings → General → AirPlay & Handoff
   - Make sure "Handoff" is enabled

4. **Restart devices:**
   - Restart both your Mac and iPhone
   - Reconnect after restart

5. **Check for updates:**
   - Make sure both devices are running the latest compatible versions

**If camera appears but doesn't work:**
- Make sure no other app is using the camera
- Close apps like FaceTime, Photo Booth, or Zoom
- Try refreshing the ClassLens page

**Pricing:** Free (Built into macOS/iOS - No additional cost!)

---

### Option 4: OBS Virtual Camera (Advanced)

For advanced users who want more control:

1. **Install OBS Studio:**
   - Download from [https://obsproject.com/](https://obsproject.com/)
   - Install OBS Studio

2. **Set up iPhone as source:**
   - Use any of the above methods to get iPhone video into OBS
   - Add iPhone as a video source in OBS
   - Enable "Start Virtual Camera" in OBS

3. **In ClassLens:**
   - Select "OBS Virtual Camera" from the camera dropdown

**Pricing:** Free

---

## Troubleshooting

### Camera Not Appearing

1. **Check Permissions:**
   - Make sure you've granted camera permissions to your browser
   - On macOS: System Settings → Privacy & Security → Camera
   - On Windows: Settings → Privacy → Camera

2. **Refresh Devices:**
   - Click "Refresh Devices" in the ClassLens camera interface
   - Make sure the camera app is running on your iPhone

3. **Restart Applications:**
   - Close and reopen the camera app on iPhone
   - Restart the desktop client
   - Refresh the ClassLens page

### Connection Issues

1. **Wi-Fi Network:**
   - Ensure both devices are on the same Wi-Fi network
   - Try disconnecting and reconnecting to Wi-Fi
   - Avoid public or guest networks (they often block device-to-device communication)

2. **Firewall:**
   - Check if your firewall is blocking the connection
   - Temporarily disable firewall to test
   - Add exceptions for the camera app if needed

3. **USB Connection:**
   - If using USB, try a different cable
   - Make sure the cable supports data transfer (not just charging)

### Audio Issues

1. **Microphone Permissions:**
   - Grant microphone permissions to your browser
   - Check system microphone settings

2. **Audio Source:**
   - Make sure the camera app is capturing audio
   - Check audio settings in the camera app

### Performance Issues

1. **Quality Settings:**
   - Lower the video quality in the camera app settings
   - Reduce resolution if experiencing lag

2. **Network Speed:**
   - Ensure stable Wi-Fi connection
   - Move closer to Wi-Fi router if possible
   - Close other bandwidth-intensive applications

---

## Browser Compatibility

### Supported Browsers:
- ✅ Chrome/Edge (Recommended)
- ✅ Firefox
- ✅ Safari (macOS/iOS)
- ⚠️ Opera (may have limited support)

### Real-Time Transcription:
- **Chrome/Edge:** Full support via Web Speech API
- **Firefox:** Limited support (may need to use different transcription method)
- **Safari:** Limited support

**Note:** For best real-time transcription, use Chrome or Edge.

---

## Tips for Best Results

1. **Lighting:**
   - Ensure good lighting in your environment
   - Avoid backlighting (bright light behind you)

2. **Stability:**
   - Use a tripod or phone stand for stable video
   - Keep iPhone charged or plugged in during long sessions

3. **Audio Quality:**
   - Use a quiet environment for better transcription
   - Speak clearly and at a moderate pace
   - Consider using an external microphone for better audio

4. **Network:**
   - Use 5GHz Wi-Fi if available (faster and more stable)
   - Keep other devices off the network during streaming
   - Position yourself close to the Wi-Fi router

---

## Security & Privacy

- Camera and microphone access is only used locally in your browser
- No video data is sent to external servers (except for AI explanations when you ask questions)
- Real-time transcription happens in your browser using Web Speech API
- You can stop the stream at any time

---

## Need Help?

If you encounter issues:
1. Check the troubleshooting section above
2. Review the camera app's documentation
3. Ensure all requirements are met
4. Try a different camera app option

---

## Quick Start Checklist

- [ ] Choose a camera app (EpocCam, DroidCam, or Continuity Camera)
- [ ] Install app on iPhone
- [ ] Install desktop client (if needed)
- [ ] Connect iPhone and computer to same Wi-Fi
- [ ] Launch camera app on iPhone
- [ ] Launch desktop client (if needed)
- [ ] Open ClassLens in browser
- [ ] Select "Live Camera" mode
- [ ] Grant camera/microphone permissions
- [ ] Select iPhone camera from dropdown
- [ ] Click "Start Camera"
- [ ] Select languages and start session

---

**Ready to go!** Your iPhone is now set up as a wireless camera for ClassLens Live mode. 🎉
