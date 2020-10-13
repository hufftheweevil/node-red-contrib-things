let ws = require('ws')

const wss = new ws.Server({ port: 8120 })

function sendToWs(packet) {
  let str = JSON.stringify(packet)
  wss.clients.forEach(client => client.readyState === ws.OPEN && client.send(str))
}

module.exports = { wss, sendToWs }
