let { makeStatus } = require('../lib/utils.js')

module.exports = function (RED) {
  function Node(config) {
    RED.nodes.createNode(this, config)

    const node = this
    const global = this.context().global

    function debug(msg) {
      if (config.debug) node.warn(msg)
    }
    function err(msg) {
      node.error(`Error: ${msg}`)
      return null
    }

    function getThing(name) {
      let thing = global.get('things')[name]
      if (!thing) return err(`Unknown thing ${name}`)
      return thing
    }

    node.on('input', function (msg) {
      debug(`Input message: ${JSON.stringify(msg)}`)

      let name = config.name || msg.topic
      let command =
        config.command === ''
          ? msg.payload
          : RED.util.evaluateNodeProperty(config.command, config.commandType, node, msg)

      if (!name) return err(`Thing name not specified in properties or input`)
      if (typeof command == 'undefined' || command === '')
        return err(`Command not specified in properties or input`)

      node.status(makeStatus(name, command))

      getThing(name) && getThing(name).handleCommand(command, {}, debug)
    })
  }
  RED.nodes.registerType('Thing Command', Node)
}
