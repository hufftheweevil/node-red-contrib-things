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
        thing.things.forEach(subName => handleCommand(subName, command))
        return
      }

      // Check for proxies
      let passCommand = command
      let proxy = Object.entries(thing.proxy || {})
      if (proxy.length) {
        debug(`Checking proxy for ${name}; Type of original command: ${typeof command}`)
        if (Array.isArray(command)) {
          // Unable to deal with array commands at this time
          node.warn(`Unable to handle proxies for array type commands`)
        } else if (typeof command !== 'object') {
          // Simple command type (i.e. string, number, boolean)
          command = command.toString() // All proxy commands will be keys of an object, hence must be a string
          let proxied = false
          proxy.forEach(
            ([proxyThingName, { command: commandMap }]) =>
              commandMap &&
              Object.entries(commandMap).forEach(([thisCommand, thatCommand]) => {
                if (command == thisCommand) {
                  debug(
                    `Using command proxy from ${name} to ${proxyThingName} for '${thisCommand}'=>'${thatCommand}'`
                  )
                  handleCommand(proxyThingName, thatCommand, {
                    origThing: thing,
                    origCommand: command
                  })
                  // TODO: If proxied more than once, will lose true original thing/command. Should be passed in a tree or something
                  proxied = true
                }
              })
          )
          if (proxied) return
          debug(`No proxy found for command ${command}`)
        } else {
          // Complex command type (i.e. object)
          passCommand = { ...command } // Shallow copy, so that keys can be deleted if used by proxy
          let proxiedKeys = []
          proxy.forEach(([proxyThingName, { command: commandMap }]) => {
            if (commandMap) {
              let proxyMap = Object.entries(commandMap).filter(([thisCommand]) =>
                command.hasOwnProperty(thisCommand)
              )

              if (proxyMap.length) {
                let proxyCommand = {}
                proxyMap.forEach(([thisCommand, thatCommand]) => {
                  proxyCommand[thatCommand] = command[thisCommand]
                  proxiedKeys.push(thisCommand)
                })
                debug(
                  `Using command proxy from ${name} to ${proxyThingName} for ${JSON.stringify(
                    proxyCommand
                  )}`
                )
                handleCommand(proxyThingName, proxyCommand, {
                  origThing: thing,
                  origCommand: command
                })
                // TODO: If proxied more than once, will lose true original thing/command. Should be passed in a tree or something
              }
            }
          })
          if (proxiedKeys.length) proxiedKeys.forEach(key => delete passCommand[key])
          if (Object.keys(passCommand).length == 0) return debug('All commands proxied')
        }
      }

      emitCommand({ thing, command: passCommand, ...meta })
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
