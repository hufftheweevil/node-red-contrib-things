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

      handleCommand(name, command)
    })

    // This function is fully recursive; It handles all command definitions and forwarding
    // until there no more pathes to follow, then calls emitCommand()
    function handleCommand(name, command, meta = {}) {
      // Pointer to the thing
      let thing = getThing(name)
      if (!thing) return

      // If no command defs, then just skip to last step
      let cmdDefs = thing.commands || []
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
        // Clone command to prevent mutating if the same command was sent to multiple things
        command = { ...command }
        // Clone again to new variable - to track what keys are being forwarded elsewhere and what isn't
        let origCommand = { ...command }
        // Dictionary to store which key/value pairs are being sent to which things
        let proxyCommands = {}
        // Go through cmdDefs with key type
        cmdDefs
          .filter(cd => cd.type == 'key')
          .forEach(cd => {
            // Check if this key used in command object
            if (!command.hasOwnProperty(cd.cmd)) return
            handleProxy(cd, child => {
              let to = cd.as === undefined ? cd.cmd : cd.as
              proxyCommands[child] = proxyCommands[child] || {}
              proxyCommands[child][to] = command[cd.cmd]
              debug(`Forwarding command from ${name} to ${child} for '.${cd.cmd}'=>'.${to}'`)
            })
            delete command[cd.cmd]
          })
        // Send commands to all child things that have cmdDefs
        Object.entries(proxyCommands).forEach(([child, nextCommand]) =>
          handleCommand(child, nextCommand, { origThing: thing, origCommand, meta })
        )
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
        if (pd.child === undefined) {
          // Process as self only
          emitCommand({ thing, command, ...meta })
        } else if (pd.child === null) {
          // Forward to children only
          thing.children.forEach(next)
        } else {
          // Forward to specific child
          next(pd.child)
        }
      }

      function last() {
        debug(
          `Processing as self (${thing.name}) and forwarding to all children (${(
            thing.children || []
          ).join(', ')})`
        )
        // Process as self
        emitCommand({ thing, command, ...meta })
        // Forward to children, if any
        thing.children && thing.children.forEach(thing => handleCommand(thing, command, meta))
      }
    }

    function emitCommand(msg) {
      if (!msg.thing) return
      debug(
        `Sending command to type ${msg.thing.type}: ${JSON.stringify(msg.command)} -> ${
          msg.thing.name
        }}`
      )
      // Emit to the bus so that all other nodes that
      // are configured for this thing type will output.
      commandBus.emit(msg.thing.type, msg)
    }
  }
  RED.nodes.registerType('Thing Command', Node)
}
