const { createServer } = require('https')
const { parse } = require('url')
const next = require('next')
const { WebSocketServer } = require('ws')
const fs = require('fs')
const path = require('path')

const dev = process.env.NODE_ENV !== 'production'
const hostname = '0.0.0.0'
const port = 3000

const httpsOptions = {
  key: fs.readFileSync(path.join(__dirname, 'localhost-key.pem')),
  cert: fs.readFileSync(path.join(__dirname, 'localhost.pem'))
}

const app = next({ dev, hostname, port })
const handle = app.getRequestHandler()

const clients = new Map()
let currentBroadcaster = null
const transcriptHistory = [] // Store all captions for the session
const MAX_HISTORY_ITEMS = 500 // Limit history to prevent memory issues

app.prepare().then(() => {
  const server = createServer(httpsOptions, async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true)
      await handle(req, res, parsedUrl)
    } catch (err) {
      console.error('Error occurred handling', req.url, err)
      res.statusCode = 500
      res.end('internal server error')
    }
  })

  const wss = new WebSocketServer({ 
    server,
    path: '/api/stream'
  })

  wss.on('connection', (ws) => {
    const clientId = Math.random().toString(36).substring(7)
    console.log(`New WebSocket connection: ${clientId}`)

    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString())
        console.log('📥 Server received message type:', message.type, 'from client:', clientId)
        
        if (message.type === 'register') {
          const client = {
            ws,
            type: message.role,
            id: clientId
          }
          clients.set(clientId, client)

          if (message.role === 'broadcaster') {
            if (currentBroadcaster) {
              ws.send(JSON.stringify({ 
                type: 'error', 
                message: 'Another broadcaster is already active' 
              }))
              ws.close()
              return
            }
            currentBroadcaster = clientId
            console.log(`Broadcaster registered: ${clientId}`)
            ws.send(JSON.stringify({ type: 'registered', role: 'broadcaster' }))
          } else if (message.role === 'viewer') {
            console.log(`Viewer registered: ${clientId}`)
            ws.send(JSON.stringify({ type: 'registered', role: 'viewer' }))
            
            // Send transcript history to new viewer
            if (transcriptHistory.length > 0) {
              console.log(`Sending ${transcriptHistory.length} transcript items to new viewer`)
              ws.send(JSON.stringify({
                type: 'transcript-history',
                history: transcriptHistory
              }))
            }
          }
        } else if (message.type === 'frame' || message.type === 'audio') {
          const viewerCount = Array.from(clients.values()).filter(c => c.type === 'viewer' && c.ws.readyState === 1).length
          console.log(`Received ${message.type} from broadcaster, relaying to ${viewerCount} viewer(s)`)
          clients.forEach((client) => {
            if (client.type === 'viewer' && client.ws.readyState === 1) {
              client.ws.send(data)
            }
          })
        } else if (message.type === 'caption') {
          // Store caption in history
          const captionItem = {
            text: message.text,
            timestamp: message.timestamp || Date.now(),
            isFinal: message.isFinal
          }
          
          if (message.isFinal) {
            transcriptHistory.push(captionItem)
            
            // Limit history size
            if (transcriptHistory.length > MAX_HISTORY_ITEMS) {
              transcriptHistory.shift()
            }
          }
          
          const viewerCount = Array.from(clients.values()).filter(c => c.type === 'viewer' && c.ws.readyState === 1).length
          console.log(`Received caption from broadcaster, relaying to ${viewerCount} viewer(s)`)
          
          // Relay caption as JSON string to all viewers
          const captionMsg = JSON.stringify(message)
          clients.forEach((client) => {
            if (client.type === 'viewer' && client.ws.readyState === 1) {
              client.ws.send(captionMsg)
            }
          })
        }
      } catch (err) {
        console.error('Error processing message:', err)
      }
    })

    ws.on('close', () => {
      console.log(`Client disconnected: ${clientId}`)
      if (currentBroadcaster === clientId) {
        currentBroadcaster = null
        // Clear transcript history when broadcaster disconnects
        transcriptHistory.length = 0
        console.log('Transcript history cleared')
        
        const message = JSON.stringify({ 
          type: 'broadcaster-disconnected',
          message: 'The broadcaster has disconnected'
        })
        clients.forEach((client) => {
          if (client.type === 'viewer' && client.ws.readyState === 1) {
            client.ws.send(message)
          }
        })
      }
      clients.delete(clientId)
    })

    ws.on('error', (error) => {
      console.error(`WebSocket error for ${clientId}:`, error)
    })
  })

  server.listen(port, hostname, (err) => {
    if (err) throw err
    console.log(`> Ready on https://${hostname}:${port}`)
    console.log(`> WebSocket server ready on wss://${hostname}:${port}/api/stream`)
  })
})
