let { systemBus, ready, now } = require('./shared')

module.exports = function (RED) {

  function Node(config) {
    RED.nodes.createNode(this, config)

    let node = this

    // The function to be called when ready
    function onReady(type) {
      if (type != config.thingType) return  // Also works for 'all', if applicable

      let msg = {}

      let errors = []

      config.props.forEach(p => {
        let property = p.p;
        let value = p.v ? p.v : ''
        let valueType = p.vt ? p.vt : 'str'

        if (!property) return

        if (valueType === "jsonata") {
          if (p.exp) {
            try {
              let val = RED.util.evaluateJSONataExpression(p.exp, msg)
              RED.util.setMessageProperty(msg, property, val, true)
            }
            catch (err) {
              errors.push(err.message)
            }
          }
          return
        }
        try {
          RED.util.setMessageProperty(msg, property, RED.util.evaluateNodeProperty(value, valueType, null, msg), true)
        } catch (err) {
          errors.push(err.toString())
        }
      })

      if (errors.length) {
        node.error(errors.join('; '), msg)
      } else {
        // Timeout required (actually runs with a timeout of 1ms)
        // because if done synchronously, then the next node may not
        // be defined yet, and so the msg will never be delivered.
        // Handling asynchronously allows the next node to be loaded
        // so we can ensure the message is received.
        setTimeout(() => node.send(msg), 0)
        node.status({
          text: `Triggered at ${now()}`
        })
      }
    }

    // Check if ready now, if not listen for when ready
    if (ready.has(config.thingType)) {
      onReady(config.thingType)

    } else {
      systemBus.on('ready', onReady)

      // When node destroyed, stop listening
      node.on('close', () => systemBus.removeListener('ready', onReady))
    }

  }
  RED.nodes.registerType('Thing Ready', Node)
}
