let EventEmitter = require('events')

module.exports = function (RED) {
  // The bus is used to trigger all nodes with a given thing type
  // to output when any command node receives a command for a
  // thing of the same type.
  let bus = new EventEmitter()

  function CommandNode(config) {
    RED.nodes.createNode(this, config)

    let node = this
    let global = this.context().global

    function debug(msg) {
      if (config.debug) node.warn(msg)
    }
    function err(msg, onlyIfDebug = false) {
      node.error(`Input message: ${JSON.stringify(msg)}`)
      return null
    }

    function getThing(name) {
      let thing = global.get('things')[name]
      if (!thing) return err(`Unknown thing ${name}`)
      return thing
    }

    node.on('input', function (msg) {
      if (config.mode != 'in') return err('Process Command mode does not accept input')
      if (!msg.hasOwnProperty('payload')) return err('Input payload is required')

      debug(`Input message: ${JSON.stringify(msg)}`)

      // Name should be set in properties, or provided on input.
      // Property takes precedence.
      processCommand(config.name || msg.topic, msg.payload)
    })

    function processCommand(name, origCommand) {
      // Pointer to the thing
      let thing = getThing(name)
      if (!thing) return

      // Check if group
      if (thing.type == 'Group') {
        debug('Thing is a Group, sending to each:', thing.things)
        thing.things.forEach(subName => processCommand(subName, origCommand))
        return
      }

      // Check for proxies
      let passCommand
      let proxy = Object.entries(thing.proxy || {})
      if (proxy.length) {
        if (typeof origCommand !== 'object') {
          // Simple command type (i.e. string, number, boolean) (hopefully not an array!!!)
          let proxied = false
          proxy.forEach(([proxyThingName, { command }]) => command && Object.entries(command).forEach(([thisCommand, thatCommand]) => {
            if (origCommand == thisCommand) {
              debug(`Using command proxy from ${name} to ${proxyThingName} for '${thisCommand}'=>'${thatCommand}'`)
              emitCommand({ thing: getThing(proxyThingName), command: thatCommand, origThing: thing, origCommand })
              proxied = true
            }
          }))
          if (proxied) return
          passCommand = origCommand
        } else {
          // Complex command type (i.e. object)
          passCommand = { ...origCommand }
          let proxiedKeys = []
          proxy.forEach(([proxyThingName, { command }]) => {
            if (command) {
              let proxyMap = Object.entries(command).filter(([thisCommand]) => origCommand.hasOwnProperty(thisCommand))

              if (proxyMap.length) {
                let proxyCommand = {}
                proxyMap.forEach(([thisCommand, thatCommand]) => {
                  proxyCommand[thatCommand] = origCommand[thisCommand]
                  proxiedKeys.push(thisCommand)
                })
                debug(`Using command proxy from ${name} to ${proxyThingName} for ${JSON.stringify(proxyCommand)}`)
                emitCommand({ thing: getThing(proxyThingName), command: proxyCommand, origThing: thing, origCommand })
              }
            }
          })
          if (proxiedKeys.length) proxiedKeys.forEach(key => delete passCommand[key])
          if (Object.keys(passCommand).length == 0) return debug('All commands proxied')
        }
      }

      emitCommand({ thing, command: passCommand, origCommand })

    }

    function emitCommand(msg) {
      if (!msg.thing) return
      debug(`Sending command to type ${msg.thing.type}: ${JSON.stringify(msg)}`)
      // Emit to the bus so that all other nodes that
      // are configured for this thing type will output.
      bus.emit(msg.thing.type, msg)
    }

    // During node creation, if mode is set to be a
    // command processor (out mode), need to setup a
    // listener on the bus to trigger off of any other
    // node that emits a message with this type.
    if (config.mode == 'out') {

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
      }

      // Listen for command requests for this thing type
      bus.on(config.thingType, action)

      // When node destroyed, stop listening
      node.on('close', function () {
        bus.off(config.thingType, action)
      })
    }
  }
  RED.nodes.registerType('command', CommandNode)
}