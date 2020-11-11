const { convertOldThing } = require('../lib/convert.js')
const { stateBus } = require('../lib/bus.js')
const ws = require('../lib/ws.js')

module.exports = function (RED) {
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

    // Start TD server if not started
    ws.init(RED, global)

    class Thing {
      constructor(config) {
        this.config = config

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
            // Grab 'current' state if thing already exists
            // if (
            //   oldState.hasOwnProperty(s.key) &&
            //   !Object.getOwnPropertyDescriptor(oldState, s.key).hasOwnProperty('get')
            // )
            //   this.state[s.key] = oldState[s.key]
            // // Otherwise initialize static value
            // else
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
                      return values.every(v => v === true)
                    case 'anyFalse':
                      return values.some(v => v === false)
                    case 'anyFalse':
                      return values.every(v => v === false)
                    case 'min':
                      return Math.min(...values)
                    case 'max':
                      return Math.max(...values)
                    default:
                      return new Function('values', s.fn)(values)
                  }
                } catch (err) {
                  node.warn(`Unable to get generate ${this.name}.state.${s.key}: ${err}`)
                }
              },
              enumerable: true,
              configurable: true
            })
            return
          }
        }
        this.state = {}
        let oldState = THINGS[this.name] ? THINGS[this.name].state : {}
        Object.entries(oldState).forEach(
          ([key, value]) =>
            !Object.getOwnPropertyDescriptor(oldState, key).hasOwnProperty('get') &&
            initState({ key, value })
        )
        if (nodeConfig.state) nodeConfig.state.forEach(initState)
        if (config.state) config.state.forEach(initState)

        // STATUS FUNCTION
        if (config.statusFn) {
          this._status = new Function('state', 'props', config.statusFn)
        } else if (nodeConfig.statusFunction) {
          this._status = new Function('state', 'props', nodeConfig.statusFunction)
        }

        // Emit to the bus so that all other nodes that
        // are configured to output on changes/updates
        // will be triggered. (And update their status)
        // stateBus.emit(this.name)

        // Add to global things map
        THINGS[this.name] = this
      }
      get status() {
        try {
          if (!this._status) return {}
          let _status = this._status(
            RED.util.cloneMessage(this.state),
            RED.util.cloneMessage(this.props)
          )
          if (_status == null)
            return {
              fill: 'red',
              shape: 'ring',
              text: 'Unknown'
            }
          return _status
        } catch (err) {
          node.warn(`Unable to generate status for ${this.name}: ${err}`)
        }
      }
    }

    nodeConfig.things.forEach(thing => {
      // Adjust config format from old versions
      convertOldThing(thing)

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
