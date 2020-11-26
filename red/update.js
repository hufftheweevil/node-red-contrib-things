let { stateBus } = require('../lib/bus.js')
let { pushUnique, now } = require('../lib/utils.js')
const ws = require('../lib/ws.js')

module.exports = function (RED) {
  function Node(config) {
    RED.nodes.createNode(this, config)

    const node = this
    const global = this.context().global

    let heardFrom = []

    node.on('input', function (msg) {
      const THINGS = global.get('things')
      const things = Object.values(THINGS)

      // Name should be set in properties, or provided on input.
      // Property takes precedence.
      let name = config.name || msg.topic

      if (!name) return node.error('Thing name is required in properties or input')

      // Pointer to the thing
      let thing = THINGS[name]

      // If not found and thing type is set, Try finding by ID (assuming topic is ID)
      if (!thing && config.thingType && msg.topic) {
        thing = things.find(t => t.type == config.thingType && t.id == msg.topic)
        if (thing) name = thing.name
      }

      // If still not found, error
      if (!thing) return node.error(`Unknown thing ${name}`)

      // Determine update packet
      let update = {}
      if (config.updates && config.updates.length) {
        config.updates.forEach(({ key, type, val }) => {
          let value = RED.util.evaluateNodeProperty(val, type, node, msg)
          RED.util.setMessageProperty(update, key, value, true)
        })
      } else {
        update = msg.payload
      }

      // Update state accordingly
      if (msg.replace) {
        thing.state = update
      } else {
        Object.assign(thing.state, update)
      }

      function triggerUpdate(thingName) {
        // Emit to the bus; wake up trigger nodes
        stateBus.emit(thingName)

        // Get thing
        let thing = THINGS[thingName]

        // Send to websockets to update sidebar
        ws.send({ topic: 'update', payload: thing })

        // Trigger for all proxies
        thing.proxies.forEach(proxyName => triggerUpdate(proxyName))
      }

      // Begin trigger process
      triggerUpdate(name)

      // If configured with `type`, update status
      if (config.thingType) {
        pushUnique(heardFrom, name)

        let waitingOn = things
          .filter(t => t.type == config.thingType && !heardFrom.includes(t.name))
          .map(t => t.name)

        node.status({
          text: `${config.thingType} ${
            waitingOn.length ? `waiting on (${waitingOn.length}) ${waitingOn.join(', ')}` : 'ready'
          }`
        })
      } else {
        // Not configured with `type`, so show status of this update
        node.status({
          text: `${thing.name} | ${JSON.stringify(update)} | ${now()}`
        })
      }
    })
  }
  RED.nodes.registerType('Thing Update', Node)
}
