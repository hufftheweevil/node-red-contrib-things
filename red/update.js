let { stateBus, pushUnique, now } = require('./shared')
let { sendToWs } = require('../ws')

module.exports = function (RED) {
  function Node(config) {
    RED.nodes.createNode(this, config)

    const node = this
    const global = this.context().global

    let heardFrom = []

    node.on('input', function (msg) {
      const THINGS = global.get('things')

      // Name should be set in properties, or provided on input.
      // Property takes precedence.
      let name = config.name || msg.topic

      if (!name) return node.error('Thing name is required in properties or input')

      // Pointer to the thing
      let thing = THINGS[name]

      // If not found and thing type is set, Try finding by ID (assuming topic is ID)
      if (!thing && config.thingType && msg.topic) {
        thing = Object.values(THINGS).find(t => t.type == config.thingType && t.id == msg.topic)
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

      // Emit to the bus so that all other nodes that
      // are configured to output on changes/updates
      // will be triggered. (And update their status)
      stateBus.emit(name)

      // Send to websockets to update sidebar
      sendToWs({ topic: 'update', payload: thing })

      // Check for parents and emit for them too
      thing.parents &&
        thing.parents.forEach(parent => {
          stateBus.emit(parent)
          sendToWs({ topic: 'update', payload: THINGS[parent] })
        })

      // If configured with `type`, update status
      if (config.thingType) {
        pushUnique(heardFrom, name)

        let waitingOn = Object.values(THINGS)
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
