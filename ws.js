let ws = require('ws')

const wss = new ws.Server({ port: 8120 })

function sendToWs(packet) {
  wss.clients.forEach(client => {
    if (client.readyState === ws.OPEN) client.send(JSON.stringify(packet))
  })
}

module.exports = { wss, sendToWs }
