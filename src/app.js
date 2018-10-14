const http = require('http')
const fs = require('fs')
const path = require('path')
const ws = require('ws')
const socketIO = require('socket.io')
const express = require('express')
const Jimp = require('jimp')

const port = 9095

const app = express()
const server = http.createServer(app)
const io = socketIO(server)

const width = 1000
const height = 1000

main()

async function main() {

  let img
  try {
    img = await Jimp.read(path.join(__dirname, './pixel.png'))
  } catch(e) {
    img = new Jimp(1000, 1000, 0xffffffff)
  }

  var lastUpdate = 0
  setInterval(() => {
    var now = Date.now()
    if (now - lastUpdate < 5000) {
      img.write(path.join(__dirname, './pixel.png'), () => {
        console.log('data saved!', now)
      })
    }
  }, 5000)

  global.io = io

  let userOperations = []

  setInterval(() => {
    if (userOperations.length) {
      io.emit('updateDot', userOperations)
      userOperations = []
    }
  }, 500)

  io.on('connection', (ws, req) => {
    img.getBuffer(Jimp.MIME_PNG, (err, buf) => {
      if (err) {
        console.log('get buffer err', err)
      } else {
        ws.emit('init', buf)
      }
    })

    io.emit('onlineCount', {
      count: Object.keys(io.sockets.sockets).length,
    })

    ws.on('close', () => {
      io.emit('onlineCount', {
        count: Object.keys(io.sockets.sockets).length,
      })
    })

    var lastDraw = 0

    ws.on('drawDot', data => {
      var now = Date.now()
      var {x, y, color} = data

      if (now - lastDraw < 200) {
        return
      }
      if (x >= 0 && y >= 0 && x < width && y < height) {
        lastDraw = now
        lastUpdate = now
        img.setPixelColor(Jimp.cssColorToHex(color), x, y)
        // io.emit('updateDot', {
        //   x, y, color
        // })
        userOperations.push({x,y,color})
      }
    })
  })

  app.use(express.static(path.join(__dirname, './static')))

  server.listen(port, () => {
    console.log('server listening on port', port)
  })
}