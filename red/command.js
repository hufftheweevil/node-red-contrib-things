let { commandBus } = require('../lib/bus.js')
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

      node.status(makeStatus(name, command))

      handleCommand(name, command)
    })

    // This function is fully recursive; It handles all command definitions and forwarding
    // until there no more pathes to follow, then calls emitCommand()
    function handleCommand(name, command, meta = {}) {
      // Pointer to the thing
      let thing = getThing(name)
      if (!thing) return

      // If no command defs, then just skip to last step
      let cmdDefs = thing.config.commands || []
      if (!cmdDefs.length) return last()

      // COMMAND TYPE == array
      if (Array.isArray(command)) {
        // Unable to deal with array commands at this time
        node.warn(
          'Unable to handle command routing for array type commands. Command will be processed as self and sent to children. If this is intended, then everything is ok.'
        )
        return last()
      }

      // COMMAND TYPE == object
      if (typeof command === 'object') {
        // Need to go through cmdDefs with key type
        let origCommand = { ...command }
        let proxyCommands = {}
        cmdDefs
          .filter(cd => cd.type == 'key')
          .forEach(cd => {
            if (command.hasOwnProperty(cd.cmd)) {
              let next
              if (cd.as === null) {
                // Method is "the same", so include in object to be sent to child thing
                // After done going through all keys, those commands will be sent
                next = child => {
                  proxyCommands[child] = proxyCommands[child] || {}
                  proxyCommands[child][cd.cmd] = command[cd.cmd]
                }
              } else {
                // Method is sending a primitive value as the command, instead
                // of an object. This means the value in the origCommand is lost.
                next = child => handleCommand(child, cd.as, { origThing: thing, origCommand, meta })
              }
              handleProxy(cd, next)
              delete command[cd.cmd]
            }
          })
        // Send commands to all child things that have cmdDefs
        Object.entries(proxyCommands).forEach(([child, nextCommand]) => {
          debug(`Forwarding command from ${name} to ${child} for ${JSON.stringify(nextCommand)}`)
          handleCommand(child, nextCommand, { origThing: thing, origCommand, meta })
        })
        // If any keys left, do default emit
        if (Object.keys(command).length) last()
        return
      }

      // COMMAND TYPE == string | number | boolean
      let proxy = cmdDefs.find(cd => {
        switch (cd.type) {
          case 'str':
            return typeof command == 'string' && cd.cmd == command
          case 'num':
            return typeof command == 'number' && cd.cmd == command
          case 'bool':
            return typeof command == 'boolean' && (cd.cmd == command || cd.cmd == 'either')
          case 'test':
            return new RegExp(cd.cmd).test(command)
        }
      })
      if (proxy) {
        let nextCommand = proxy.as == undefined ? command : proxy.as
        handleProxy(proxy, thing => {
          debug(
            `Forwarding command from ${name} to ${proxy.child} for '${command}'=>'${nextCommand}'`
          )
          handleCommand(thing, nextCommand, {
            origThing: thing,
            origCommand: command,
            meta
          })
        })
      } else {
        last()
      }

      function handleProxy(pd, next) {
        if (pd.child === null) {
          // Process as self only
          next(name)
        } else if (pd.child === undefined) {
          // Forward to children only
          thing.children.forEach(next)
        } else {
          // Forward to specific child
          next(pd.child)
        }
      }

      function last() {
        // Process as self
        emitCommand({ thing, command, ...meta })
        // Forward to children, if any
        thing.children && thing.children.forEach(thing => handleCommand(thing, command, meta))
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
