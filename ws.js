let ws = require('ws')

const wss = new ws.Server({ port: 8120 })

function genStatus(thing) {
  if (!thing.status) return thing
  try {
    let status = thing.status(thing.state, thing.props)
    return { ...thing, status }
  } catch (err) {
    return thing
  }
}

function stringifyStatus(key, val) {
  if (key != 'payload') return val
  if (Array.isArray(val)) return val.map(genStatus)
  return genStatus(val)
}

function sendToWs(packet) {
  let str = JSON.stringify(packet, stringifyStatus)
  wss.clients.forEach(client => client.readyState === ws.OPEN && client.send(str))
}

module.exports = { wss, sendToWs, stringifyStatus }
