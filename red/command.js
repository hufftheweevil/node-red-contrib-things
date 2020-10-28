let { commandBus, now } = require('./shared')

module.exports = function (RED) {
  function Node(config) {
    RED.nodes.createNode(this, config)

    const node = this
    const global = this.context().global

    function debug(msg) {
      if (config.debug) node.warn(msg)
    }
    function err(msg) {
      node.error(`Input message: ${JSON.stringify(msg)}`)
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

      handleCommand(name, command)

      node.status({
        text: `${name} | ${JSON.stringify(command)} | ${now()}`
      })
    })

    // This function is fully recursive; It handles all groups and proxy commands
    // until no more pathes to follow, then calls emitCommand()
    function handleCommand(name, command, meta = {}) {
      // Pointer to the thing
      let thing = getThing(name)
      if (!thing) return

      // Check if group
      if (thing.type == 'Group') {
        debug('Thing is a Group, sending to each:', thing.things)
        thing.things.forEach(childName => handleCommand(childName, command))
        return
      }

      // Check for proxies
      let proxies = (thing.proxy || []).filter(proxyDef => proxyDef.type == 'command')
      if (!proxies.length) return doEmit()

      if (Array.isArray(command)) {
        // Unable to deal with array commands at this time
        node.warn(
          `Unable to handle proxies for array type commands. Command will be sent to same thing. If this is intended, then everything is ok.`
        )
        return doEmit()
      }

      if (typeof command === 'object') {
        // Normal object - need to go through proxies with command-key type
        let origCommand = { ...command }
        let proxyCommands = {}
        proxies
          .find(pd => pd.cmdType == 'key')
          .forEach(pd => {
            if (command.hasOwnProperty(pd.this)) {
              proxyCommands[pd.child] = proxyCommands[pd.child] || {}
              proxyCommands[pd.child][pd.that == null ? pd.this : pd.that] = command[pd.this]
              delete command[pd.this]
            }
          })
        // Send commands to all child things that have proxies
        Object.entries(proxyCommands).forEach(([childThing, thatCommand]) => {
          debug(
            `Using command proxy from ${name} to ${childThing} for ${JSON.stringify(thatCommand)}`
          )
          handleCommand(childThing, thatCommand, { origThing: thing, origCommand, meta })
        })
        // If any keys left, send to same thing
        if (Object.keys(command).length) doEmit()
        return
      }

      // Primitive type: string | number | boolean
      let proxyTest =
        typeof command === 'string'
          ? pd =>
              (pd.cmdType == 'str' && pd.this == command) ||
              (pd.cmdType == 'test' && new RegExp(pd.this).test(command))
          : typeof command === 'number'
          ? pd => pd.cmdType == 'num' && pd.this == command
          : typeof command === 'boolean'
          ? pd => pd.cmdType == 'bool' && (pd.this == 'either' || pd.this == command)
          : null
      let proxy = proxyTest && proxies.find(proxyTest)
      if (proxy) {
        let thatCommand = proxy.that == null ? command : proxy.that
        debug(
          `Using command proxy from ${name} to ${proxy.child} for '${command}'=>'${thatCommand}'`
        )
        handleCommand(proxy.child, thatCommand, {
          origThing: thing,
          origCommand: command,
          meta
        })
        return
      }

      function doEmit() {
        emitCommand({ thing, command, ...meta })
      }
    }

    function emitCommand(msg) {
      if (!msg.thing) return
      debug(`Sending command to type ${msg.thing.type}: ${JSON.stringify(msg)}`)
      // Emit to the bus so that all other nodes that
      // are configured for this thing type will output.
      commandBus.emit(msg.thing.type, msg)
    }
  }
  RED.nodes.registerType('Thing Command', Node)
}
