let { commandBus, now } = require('./shared')

module.exports = function (RED) {

  function Node(config) {
    RED.nodes.createNode(this, config)

    let node = this

    function debug(msg) {
      if (config.debug) node.warn(msg)
    }

    // The function to be called when triggered
    let action = ({ thing, command, origThing, origCommand }) => {
      debug(`Received command for ${thing.type}/${thing.id}: ${JSON.stringify(command)}`)
      node.send({
        topic: thing.id,
        payload: command,
        thing,
        origThing,
        origCommand
      })
      node.status({
        text: `${thing.name} | ${JSON.stringify(command)} | ${now()}`
      })
    }

    // Listen for command requests for this thing type
    commandBus.on(config.thingType, action)

    // When node destroyed, stop listening
    node.on('close', function () {
      commandBus.removeListener(config.thingType, action)
    })
  }
  RED.nodes.registerType('Thing Process', Node)
}