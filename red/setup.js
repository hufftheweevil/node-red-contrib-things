const { stateBus, commandBus } = require('../lib/bus.js')
const ws = require('../lib/ws.js')

module.exports = function (RED) {
  // Start TD server if not started
  ws.init(RED)

  function Node(nodeConfig) {
    RED.nodes.createNode(this, nodeConfig)

    const node = this

    function debug(msg) {
      if (nodeConfig.debug) node.warn(msg)
    }

    node.status({
      shape: 'dot',
      fill: 'blue',
      text: 'Initializing...'
    })

    let errors = false

    // Initialize global.things if it doesn't exist
    const global = this.context().global
    if (!global.get('things')) global.set('things', {})
    const THINGS = global.get('things')

    // Link global context
    ws.link(global)

    function getFamily(name, down, start) {
      let prop = down ? 'children' : 'parents'
      let next = THINGS[name]
      if (!next) return []
      if (!next[prop] || next[prop].length == 0) return start ? [] : [name]
      return next[prop].map(n => getFamily(n, down)).flat()
    }

    class Thing {
      constructor(config) {
        this.config = config
        this.typeConfig = nodeConfig

        // NAME
        this.name = config.name

        // TYPE
        this.type = nodeConfig.thingType

        // ID
        if (config.hasOwnProperty('id')) this.id = config.id.trim()
        if (this.id === '') this.id = config.name
        else if (!isNaN(this.id)) this.id = +this.id

        // PROPS
        this.props = config.props || {}

        // CHILDREN
        this.children = config.children || []

        // STATE
        let initState = s => {
          if (this.state.hasOwnProperty(s.key)) return // Already defined
          //
          // Static value
          if (s.hasOwnProperty('value')) {
            this.state[s.key] = s.value
            return
          }
          // Single proxy
          if (s.hasOwnProperty('child')) {
            let childKey = s.hasOwnProperty('childKey') ? s.childKey : s.key
            Object.defineProperty(this.state, s.key, {
              get: () => {
                const THINGS = global.get('things')
                let value = THINGS[s.child] && THINGS[s.child].state[childKey]
                debug(`Calling getter for '${this.name}'.state.${s.key} -- Will return '${value}'`)
                return value
              },
              enumerable: true,
              configurable: true
            })
            return
          }
          // Multi proxy
          if (s.hasOwnProperty('fn')) {
            let childKey = s.hasOwnProperty('childKey') ? s.childKey : s.key
            Object.defineProperty(this.state, s.key, {
              get: () => {
                try {
                  const THINGS = global.get('things')
                  let values = this.children
                    .map(childName => THINGS[childName])
                    .map(
                      child => child && (childKey === null ? child.state : child.state[childKey])
                    )
                    .filter(v => v !== null && v !== undefined)
                  switch (s.fn) {
                    case 'anyTrue':
                      return values.some(v => v === true)
                    case 'allTrue':
                      return values.length && values.every(v => v === true)
                    case 'anyFalse':
                      return values.some(v => v === false)
                    case 'allFalse':
                      return values.length && values.every(v => v === false)
                    case 'min':
                      return Math.min(...values)
                    case 'max':
                      return Math.max(...values)
                    default:
                      return new Function('values', s.fn)(values)
                  }
                } catch (err) {
                  node.warn(`Unable to generate ${this.name}.state.${s.key}: ${err}`)
                }
              },
              enumerable: true,
              configurable: true
            })
            return
          }
        }
        this.state = {}
        // State is initialized in 3 steps, in order of priority. Once a
        // state key is defined, nothing will be defined over top of it.
        // 1. Get old (last known) state; only for normally defined values
        let oldState = THINGS[this.name] ? THINGS[this.name].state : {}
        Object.entries(oldState).forEach(
          ([key, value]) =>
            !Object.getOwnPropertyDescriptor(oldState, key).hasOwnProperty('get') &&
            !config.state.some(c => c.key == key && !c.hasOwnProperty('value')) &&
            initState({ key, value })
        )
        // 2. Use own configuration
        if (config.state) config.state.forEach(initState)
        // 3. Use type-level configuration
        if (nodeConfig.state) nodeConfig.state.forEach(initState)

        // STATUS
        let _status
        if (config.statusFn) {
          _status = new Function('state', 'props', config.statusFn)
        } else if (nodeConfig.statusFunction) {
          _status = new Function('state', 'props', nodeConfig.statusFunction)
        }
        Object.defineProperty(this, 'status', {
          enumerable: true,
          get: () => {
            // Returns object {text, shape, fill}
            try {
              if (!_status) return {}
              let status = _status(
                RED.util.cloneMessage(this.state),
                RED.util.cloneMessage(this.props)
              )
              if (status == null)
                return {
                  fill: 'red',
                  shape: 'ring',
                  text: 'Unknown'
                }
              return status
            } catch (err) {
              node.warn(`Unable to generate status for ${this.name}: ${err}`)
            }
          }
        })

        // Emit to the bus so that all other nodes that
        // are configured to output on changes/updates
        // will be triggered. (And update their status)
        // stateBus.emit(this.name)

        // Add to global things map
        THINGS[this.name] = this
      }

      // PARENTS
      get parents() {
        // Return array of all parent things
        return Object.values(THINGS)
          .filter(t => t.children.includes(this.name))
          .map(t => t.name)
      }

      // DESCENDANTS
      get descendants() {
        // Return array of all descendants
        return getFamily(this.name, true, true).filter((v, i, a) => a.indexOf(v) == i)
      }

      // ANCESTORS
      get ancestors() {
        // Return array of all ancestors
        return getFamily(this.name, false, true).filter((v, i, a) => a.indexOf(v) == i)
      }

      // PROXIES
      get proxies() {
        // Return array of all proxied things
        return Object.values(THINGS)
          .filter(t => {
            let proxyStates = [...(t.typeConfig.state || []), ...(t.config.state || [])]
            return (
              proxyStates.some(s => s.child == this.name) ||
              (t.children.includes(this.name) && proxyStates.some(s => s.fn))
            )
          })
          .map(t => t.name)
      }

      // COMMANDS
      get commands() {
        return [...(nodeConfig.commands || []), ...(this.config.commands || [])]
      }

      // HANDLE COMMAND
      handleCommand(command, meta = {}, debug) {
        // debug function is used from command node
        debug?.(`Handling command for ${this.name}: ${JSON.stringify(command)}`)

        let handleProxy = (proxyCmdDef, next) => {
          if (proxyCmdDef.child === undefined) {
            // Process as self only
            // If no transform, skip to emit
            if (proxyCmdDef.as == undefined) return this.emitCommand({ command, ...meta })
            // Otherwise, allow reinsertion to handler process
            next(this.name)
          } else if (proxyCmdDef.child === null) {
            // Forward to children only
            this.children.forEach(next)
          } else {
            // Forward to specific child
            next(proxyCmdDef.child)
          }
        }

        // Used after all command proxies are checked
        // Defaults to processing command as self and forwarding to all children
        let defaultEmit = () => {
          debug?.(
            `Processing as self (${this.name}) and forwarding to all children (${(
              this.children || []
            ).join(', ')})`
          )
          // Process as self
          this.emitCommand({ command, ...meta }, debug)
          // Forward to handlers of all children, if any
          this.children?.forEach(thing => THINGS[thing]?.handleCommand(command, meta))
        }

        // If no command defs, then just skip to last step
        let cmdDefs = this.commands || []
        if (!cmdDefs.length) return defaultEmit()

        // COMMAND TYPE == array
        if (Array.isArray(command)) {
          // Unable to deal with array commands at this time
          node.warn(
            'Unable to handle command routing for array type commands. Command will be processed as self and sent to children. If this is intended, then everything is ok.'
          )
          return defaultEmit()
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
            .filter(cmdDef => cmdDef.type == 'key')
            .forEach(cmdDef => {
              // Check if this key used in command object
              if (!command.hasOwnProperty(cmdDef.cmd)) return
              handleProxy(cmdDef, child => {
                let to = cmdDef.as === undefined ? cmdDef.cmd : cmdDef.as
                proxyCommands[child] = proxyCommands[child] || {}
                proxyCommands[child][to] = command[cmdDef.cmd]
                debug?.(
                  `Forwarding command from ${this.name} to ${child} for '.${cmdDef.cmd}'=>'.${to}'`
                )
              })
              delete command[cmdDef.cmd]
            })
          // Send commands to all child things that have cmdDefs
          Object.entries(proxyCommands).forEach(([child, nextCommand]) =>
            THINGS[child]?.handleCommand(nextCommand, { origThing: this, origCommand, meta })
          )
          // If any keys left, do default emit
          if (Object.keys(command).length) defaultEmit()
          // Otherwise, skip defaultEmit
          return
        }

        // COMMAND TYPE == string | number | boolean
        let cmdDef = cmdDefs.find(cmdDef => {
          switch (cmdDef.type) {
            case 'str':
              return typeof command == 'string' && cmdDef.cmd == command
            case 'num':
              return typeof command == 'number' && cmdDef.cmd == command
            case 'bool':
              return (
                typeof command == 'boolean' && (cmdDef.cmd == command || cmdDef.cmd == 'either')
              )
            case 'test':
              return new RegExp(cmdDef.cmd).test(command)
          }
        })
        if (cmdDef) {
          let nextCommand = cmdDef.as == undefined ? command : cmdDef.as
          handleProxy(cmdDef, thing => {
            debug?.(
              `Forwarding command from ${this.name} to ${cmdDef.child} for '${command}'=>'${nextCommand}'`
            )
            THINGS[thing]?.handleCommand(nextCommand, {
              origThing: thing,
              origCommand: command,
              meta
            })
          })
          // Skip defaultEmit
        } else {
          // No command proxies found
          defaultEmit()
        }
      }

      // EMIT COMMAND
      emitCommand(msg, debug) {
        debug?.(
          `Sending command to type ${this.type}: ${JSON.stringify(msg.command)} -> ${this.name}}`
        )
        // Emit to the bus so that all process nodes that
        // are configured for this thing type will output.
        commandBus.emit(this.type, { thing: this, ...msg })
      }
    }

    nodeConfig.things.forEach(thing => {
      if (thing.disabled) return

      // Build thing
      new Thing(thing)
    })

    node.status({
      shape: 'dot',
      fill: errors ? 'red' : 'green',
      text: errors ? 'Errors during setup, see debug log' : 'Complete'
    })
  }
  RED.nodes.registerType('Thing Setup', Node)
}
