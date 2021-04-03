let ws = require('ws')
const { stateBus } = require('./bus.js')

const wss = new ws.Server({ port: 8120 })

function send(packet) {
  let str = JSON.stringify(packet)
  wss.clients.forEach(client => client.readyState === ws.OPEN && client.send(str))
}

let hasInit = false

let global

function link(ref) {
  global = ref
}

function init(RED) {
  if (hasInit) return
  hasInit = true

  let getThings = () => (global && global.get('things')) || {}
  let makeListPacket = () => ({ topic: 'list', payload: Object.values(getThings()) })

  wss.on('connection', socket => {
    socket.on('message', msg => {
      // When client requests list of things, send it back
      if (msg == 'list') return socket.send(JSON.stringify(makeListPacket()))

      // Must be JSON msg
      try {
        msg = JSON.parse(msg)
      } catch (e) {
        console.error(e)
      }
      let thingName = msg.payload?.thing
      switch (msg.topic) {
        case 'send-command':
          let { command } = msg.payload
          getThings()[thingName]?.handleCommand(command)
          break

        case 'delete-thing':
          delete getThings()[thingName]
          send(makeListPacket())
          break

        case 'delete-state-key':
          let { key, trigger } = msg.payload
          let thing = getThings()[thingName]
          delete thing.state[key]
          if (trigger) stateBus.emit(thingName)
          send({ topic: 'update', payload: thing })
          break
      }
    })
  })

  RED.events.on('runtime-event', event => {
    // On re-deployment
    if (event.id == 'runtime-deploy') {
      // Cleanup list of things
      let allThingsSetup = []
      RED.nodes.eachNode(setupConfig => {
        if (RED.nodes.getNode(setupConfig.id) && setupConfig.type == 'Thing Setup')
          allThingsSetup.push(...setupConfig.things.filter(t => !t.disabled).map(t => t.name))
      })
      let things = getThings()
      Object.values(things)
        .filter(t => !allThingsSetup.includes(t.name))
        .forEach(t => delete things[t.name])

      // Send list of things to any connected clients
      send(makeListPacket())
    }
  })

  let libPath = __dirname.endsWith('lib')
    ? __dirname // Windows
    : __dirname.split('/').slice(0, -1).concat('lib').join('/') // Other OS
  RED.httpAdmin.get('/things/*', function (req, res) {
    res.sendFile(`${libPath}/${req.params[0]}`)
  })
}

module.exports = { init, link, send }
