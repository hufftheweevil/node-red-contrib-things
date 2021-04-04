let { stateBus } = require('../lib/bus.js')
let { pushUnique, makeStatus } = require('../lib/utils.js')
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

      if (!name) return node.error('Thing name is required in properties or input', msg)

      // Pointer to the thing
      let thing = THINGS[name]

      // If not found and thing type is set, Try finding by ID (assuming topic is ID)
      if (!thing && config.thingType && msg.topic) {
        thing = things.find(t => t.type == config.thingType && t.id == msg.topic)
        if (thing) name = thing.name
      }

      // If still not found, error
      if (!thing) return node.error(`Unknown thing ${name}`, msg)

      // Determine update packet
      let update = {}
      if (config.updates && config.updates.length) {
        config.updates.forEach(({ key, type, val }) => {
          let value = RED.util.evaluateNodeProperty(val, type, node, msg)
          RED.util.setMessageProperty(update, key, value, true)
        })
      } else {
        if (typeof msg.payload != 'object')
          return node.error(
            `Invalid update payload provided: '${JSON.stringify(msg.payload)}'`,
            msg
          )

        update = msg.payload
      }

      // Send to thing for update process
      thing.updateState(update, msg.replace)

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
        node.status(makeStatus(thing.name, update))
      }
    })
  }
  RED.nodes.registerType('Thing Update', Node)
}
