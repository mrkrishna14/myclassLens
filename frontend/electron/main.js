const { app, BrowserWindow } = require('electron')
const path = require('path')
const { spawn } = require('child_process')

let mainWindow
let nextServer

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: true,
      allowRunningInsecureContent: false,
    },
    backgroundColor: '#f8fafc',
    titleBarStyle: 'default',
    show: false,
  })

  // Start Next.js dev server
  const isDev = !app.isPackaged
  
  if (isDev) {
    // Development mode - connect to existing dev server
    const loadURL = () => {
      mainWindow.loadURL('http://localhost:3000')
        .catch(() => {
          // Retry if server not ready
          setTimeout(loadURL, 1000)
        })
    }
    
    // Wait a bit for dev server to start
    setTimeout(loadURL, 2000)
    
    // Open DevTools in development
    mainWindow.webContents.openDevTools()
  } else {
    // Production mode - start standalone Next.js server
    const appPath = app.isPackaged 
      ? path.join(process.resourcesPath, 'app')
      : path.join(__dirname, '..')
    
    const serverPath = path.join(appPath, '.next', 'standalone', 'server.js')
    
    console.log('Starting Next.js server from:', serverPath)
    
    nextServer = spawn('node', [serverPath], {
      cwd: path.join(appPath, '.next', 'standalone'),
      shell: true,
      env: { 
        ...process.env, 
        PORT: '3000', 
        NODE_ENV: 'production',
        HOSTNAME: 'localhost'
      }
    })

    nextServer.stdout.on('data', (data) => {
      console.log(`Next.js: ${data}`)
    })

    nextServer.stderr.on('data', (data) => {
      console.error(`Next.js Error: ${data}`)
    })

    nextServer.on('error', (error) => {
      console.error('Failed to start Next.js server:', error)
    })

    // Wait for server to start then load
    const loadURL = () => {
      mainWindow.loadURL('http://localhost:3000')
        .catch((err) => {
          console.error('Failed to load URL:', err)
          // Retry after 1 second
          setTimeout(loadURL, 1000)
        })
    }
    
    setTimeout(loadURL, 5000)
  }

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
  })

  // Handle window close
  mainWindow.on('closed', () => {
    mainWindow = null
  })

  // Handle navigation
  mainWindow.webContents.on('will-navigate', (event, url) => {
    // Only allow navigation to localhost
    if (!url.startsWith('http://localhost:3000')) {
      event.preventDefault()
    }
  })
}

// App lifecycle
app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (nextServer) {
    nextServer.kill()
  }
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', () => {
  if (nextServer) {
    nextServer.kill()
  }
})

// Handle camera/microphone permissions
app.on('ready', () => {
  const { systemPreferences } = require('electron')
  
  if (process.platform === 'darwin') {
    // Request camera and microphone access on macOS
    systemPreferences.askForMediaAccess('camera')
    systemPreferences.askForMediaAccess('microphone')
  }
})
