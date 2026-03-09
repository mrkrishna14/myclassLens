# ClassLens Desktop App Guide

## 🎯 Overview

ClassLens is now available as a **native desktop application** for macOS, Windows, and Linux using Electron + Next.js.

## 📦 Installation

### Install Dependencies

```bash
cd frontend
npm install
```

This will install:
- `electron` - Desktop app framework
- `electron-builder` - Build and package tool
- `concurrently` - Run multiple commands
- `wait-on` - Wait for server to start

## 🚀 Running the Desktop App

### Development Mode

```bash
npm run electron:dev
```

This will:
1. Start Next.js dev server on `http://localhost:3000`
2. Wait for server to be ready
3. Launch Electron window
4. Enable hot-reload for both Next.js and Electron

### Production Mode (Testing)

```bash
npm run electron
```

This runs the app in production mode (without building).

## 🏗️ Building Desktop Apps

### Build for macOS

```bash
npm run electron:build:mac
```

**Output:**
- `dist/ClassLens-1.0.0.dmg` - Installer
- `dist/ClassLens-1.0.0-mac.zip` - Portable app

**Requirements:**
- macOS only
- Code signing (optional for distribution)

### Build for Windows

```bash
npm run electron:build:win
```

**Output:**
- `dist/ClassLens Setup 1.0.0.exe` - Installer
- `dist/ClassLens 1.0.0.exe` - Portable app

**Requirements:**
- Can build on macOS, Windows, or Linux
- Code signing (optional for distribution)

### Build for Linux

```bash
npm run electron:build:linux
```

**Output:**
- `dist/ClassLens-1.0.0.AppImage` - Portable app
- `dist/classlens_1.0.0_amd64.deb` - Debian package

**Requirements:**
- Linux or macOS (with wine)

### Build for All Platforms

```bash
npm run electron:build
```

Builds for the current platform.

## 📁 Project Structure

```
frontend/
├── electron/
│   ├── main.js          # Electron main process
│   └── preload.js       # Preload script (security)
├── app/                 # Next.js app
├── components/          # React components
├── public/              # Static assets
│   ├── icon.icns       # macOS icon (512x512)
│   ├── icon.ico        # Windows icon (256x256)
│   └── icon.png        # Linux icon (512x512)
├── package.json         # Desktop app config
└── .env.local          # API keys
```

## 🔧 Configuration

### App Metadata

Edit `package.json`:

```json
{
  "name": "classlens",
  "version": "1.0.0",
  "build": {
    "appId": "com.classlens.app",
    "productName": "ClassLens"
  }
}
```

### Window Settings

Edit `electron/main.js`:

```javascript
const mainWindow = new BrowserWindow({
  width: 1400,
  height: 900,
  minWidth: 1200,
  minHeight: 700,
  // ... other settings
})
```

## 🎨 App Icons

### Create Icons

**macOS (.icns):**
```bash
# Use Icon Composer or online converter
# 512x512 PNG → icon.icns
```

**Windows (.ico):**
```bash
# Use online converter
# 256x256 PNG → icon.ico
```

**Linux (.png):**
```bash
# Just use a 512x512 PNG
```

Place icons in `public/` folder.

## 🔐 Permissions

### Camera & Microphone

**macOS:**
- Automatically requests permissions on first launch
- User must approve in System Preferences

**Windows:**
- Automatically granted (browser-like)

**Linux:**
- Automatically granted

### File Access

All platforms have full file system access for:
- Video uploads
- Screenshot capture
- Transcript exports

## 🌐 Web vs Desktop Differences

| Feature | Web App | Desktop App |
|---------|---------|-------------|
| **Installation** | None | One-time install |
| **Updates** | Automatic | Manual/auto-update |
| **Permissions** | Browser prompts | System prompts |
| **Offline** | Limited | Full offline |
| **Performance** | Browser-dependent | Native performance |
| **File Access** | Limited | Full access |
| **Menu Bar** | No | Yes (native) |
| **Notifications** | Limited | Native |

## 🚢 Distribution

### Code Signing (Optional but Recommended)

**macOS:**
```bash
# Requires Apple Developer account ($99/year)
export CSC_LINK=/path/to/certificate.p12
export CSC_KEY_PASSWORD=your_password
npm run electron:build:mac
```

**Windows:**
```bash
# Requires code signing certificate
export CSC_LINK=/path/to/certificate.pfx
export CSC_KEY_PASSWORD=your_password
npm run electron:build:win
```

### Auto-Updates (Future Enhancement)

Use `electron-updater` to enable automatic updates:

```bash
npm install electron-updater
```

## 🐛 Troubleshooting

### "App can't be opened" (macOS)

**Solution:**
```bash
# Remove quarantine attribute
xattr -cr /Applications/ClassLens.app
```

Or right-click → Open → Open anyway

### "Windows protected your PC" (Windows)

**Solution:**
- Click "More info"
- Click "Run anyway"

Or get a code signing certificate.

### Camera not working

**macOS:**
- Check System Preferences → Security & Privacy → Camera
- Enable ClassLens

**Windows:**
- Check Settings → Privacy → Camera
- Enable for ClassLens

## 📊 Build Sizes

Approximate sizes:

| Platform | Installer | Installed |
|----------|-----------|-----------|
| macOS | ~150 MB | ~300 MB |
| Windows | ~120 MB | ~250 MB |
| Linux | ~130 MB | ~270 MB |

## 🎯 Next Steps

1. **Install dependencies**: `npm install`
2. **Test in dev mode**: `npm run electron:dev`
3. **Build for your platform**: `npm run electron:build:mac`
4. **Distribute**: Share the installer from `dist/` folder

## 🔗 Resources

- [Electron Documentation](https://www.electronjs.org/docs)
- [electron-builder](https://www.electron.build/)
- [Next.js + Electron](https://github.com/vercel/next.js/tree/canary/examples/with-electron)

---

**ClassLens is now a full-featured desktop application!** 🎉
