const http = require('http')
const fs = require('fs')
const path = require('path')
const ws = require('ws')
const express = require('express')
const Jimp = require('jimp')

const port = 9095

const app = express()
const server = http.createServer(app)
const wss = new ws.Server({server})

const width = 256
const height = 256

main()

async function main() {

  let img
  try {
    img = await Jimp.read(path.join(__dirname, './pixel.png'))
  } catch(e) {
    img = new Jimp(256, 256, 0xffffffff)
  }

  setInterval(() => {
    img.write(path.join(__dirname, './pixel.png'), () => {
      console.log('data saved!')
    })
  }, 3000)

  wss.on('connection', (ws, req) => {
    img.getBuffer(Jimp.MIME_PNG, (err, buf) => {
      if (err) {
        console.log('get buffer err', err)
      } else {
        ws.send(buf)
      }
    })
    

    var lastDraw = 0

    ws.on('message', msg => {
      msg = JSON.parse(msg)
      var now = Date.now()
      var {x, y, color} = msg

      if (msg.type == 'drawDot') {
        if (now - lastDraw < 200) {
          return
        }
        if (x >= 0 && y >= 0 && x < width && y < height) {
          lastDraw = now
          img.setPixelColor(Jimp.cssColorToHex(color), x, y)
          wss.clients.forEach(client => {
            client.send(JSON.stringify({
              type: 'updateDot',
              x, y, color
            }))
          })
        }
      }
    })
  })

  app.use(express.static(path.join(__dirname, './static')))

  server.listen(port, () => {
    console.log('server listening on port', port)
  })
}