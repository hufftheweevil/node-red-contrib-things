let { stateBus, pushUnique } = require('./shared')
const { wss, sendToWs } = require('../ws')

module.exports = function (RED) {
  let globalRef

  function Node(config) {
    RED.nodes.createNode(this, config)

    const node = this

    function debug(msg) {
      if (config.debug) node.warn(msg)
    }

    node.status({
      shape: 'dot',
      fill: 'blue',
      text: 'Initializing...'
    })

    // Initialize global.things if it doesn't exist
    const global = this.context().global
    globalRef = global
    if (!global.get('things')) global.set('things', {})
    const THINGS = global.get('things')

    let errors = 0

    config.things.forEach((newThing, i) => {
      // ADJUST FORMATTING FROM OLD VERSIONS
      // This reformatting will only be temporary.
      // Must open node editor for each node to make permanent.
      ;['props', 'state', 'proxy'].forEach(key => {
        if (typeof newThing[key] == 'string') newThing[key] = JSON.parse(newThing[key] || '{}')
      })
      if (newThing.proxy && !Array.isArray(newThing.proxy)) {
        let array = []
        Object.entries(newThing.proxy).forEach(([child, proxies]) =>
          ['state', 'command'].forEach(type =>
            Object.entries(proxies[type] || {}).forEach(([thisKey, that]) => {
              if (thisKey == that) that = null
              let proxyDef = { child, type, this: thisKey, that }
              if (type == 'command') proxyDef.cmdType = 'str'
              array.push(proxyDef)
            })
          )
        )
        newThing.proxy = array
      }
      // END RE-FORMATTING

      let { name } = newThing

      if (name === '') {
        node.error(`Thing name missing during setup (${config.thingType}:${i})`)
        return errors++
      }

      if (config.thingType == 'Group') {
        // Create thing/group
        THINGS[name] = {
          name,
          type: 'Group',
          things: newThing.things,
          props: {}, // Placeholder (without it, can cause crash)
          state: {}
        }

        // Build state getters
        Object.entries(newThing.state || {}).forEach(([key, opts]) => {
          Object.defineProperty(THINGS[name].state, key, {
            get: function () {
              try {
                let values = THINGS[name].things
                  .map(childName => THINGS[childName])
                  .map(child => child && (opts.use === null ? child.state : child.state[opts.use]))
                  .filter(v => v !== null && v !== undefined)
                switch (opts.type) {
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
                  case 'fn':
                    return new Function('values', opts.fn)(values)
                }
              } catch (err) {
                node.warn(`Unable to get generate ${name}.state.${key}: ${err}`)
              }
            },
            enumerable: true
          })
        })
      } else {
        // This means config.thingType != 'Group'

        let { id } = newThing

        if (id.trim() === '') id = name
        else if (!isNaN(id)) id = +id

        let oldThing = THINGS[name]

        // Build state
        let state = {}
        if (newThing.state) Object.assign(state, newThing.state)
        if (oldThing) Object.assign(state, oldThing.state)

        // Create thing
        THINGS[name] = {
          id,
          name,
          type: config.thingType,
          state,
          props: newThing.props ? newThing.props : {},
          proxy: newThing.proxy || []
        }

        // For each proxied definition
        THINGS[name].proxy
          .filter(proxyDef => proxyDef.type == 'state')
          .forEach(proxyDef => {
            // Link state with getter
            let proxyName = proxyDef.child
            let from = proxyDef.this
            let to = proxyDef.that === null ? from : proxyDef.that
            Object.defineProperty(THINGS[name].state, from, {
              get: () => {
                // This check for the thing is mostly just in case it attempts to
                // use this state to update the status before the child has been setup
                const THINGS = global.get('things')
                let value = THINGS[proxyName] && THINGS[proxyName].state[to]
                debug(`Calling getter for '${name}'.state.${from} -- Will return '${value}'`)
                return value
              },
              enumerable: true,
              configurable: true
            })
          })
      } // End if config.thingType != 'Group'

      // Rest is common between Group and Non-Group

      // Save status function
      THINGS[name]._status =
        (newThing.statusFn && new Function('state', 'props', newThing.statusFn)) ||
        (config.statusFunction && new Function('state', 'props', config.statusFunction))

      // Make status getter
      Object.defineProperty(THINGS[name], 'status', {
        get: function () {
          if (!this._status) return {}
          try {
            return (
              this._status(
                RED.util.cloneMessage(this.state),
                RED.util.cloneMessage(this.props)
              ) || {
                fill: 'red',
                shape: 'ring',
                text: 'Unknown'
              }
            )
          } catch (err) {
            node.warn(`Unable to generate status for type ${config.thingType}: ${err}`)
            return {}
          }
        },
        enumerable: true,
        configurable: true
      })

      // Emit to the bus so that all other nodes that
      // are configured to output on changes/updates
      // will be triggered. (And update their status)
      stateBus.emit(newThing.name)
    }) // End of forEach newThing

    node.status({
      shape: 'dot',
      fill: errors ? 'red' : 'green',
      text: errors ? 'Errors during setup, see debug log' : 'Complete'
    })
  }
  RED.nodes.registerType('Thing Setup', Node)

  // -------------------------------------------------------------

  let getThings = () => (globalRef && globalRef.get('things')) || {}
  let makeListPacket = () => ({ topic: 'list', payload: Object.values(getThings()) })

  wss.on('connection', socket => {
    socket.on('message', msg => {
      // When client requests list of things, send it back
      if (msg == 'list') return socket.send(JSON.stringify(makeListPacket()))

      // Must be JSON msg
      try {
        msg = JSON.parse(msg)
      } catch (e) {
        console.error(e)
      }
      switch (msg.topic) {
        case 'delete-thing':
          delete getThings()[msg.payload.thing]
          sendToWs(makeListPacket())
          break

        case 'delete-state-key':
          let { thing: thingName, key, trigger } = msg.payload
          let thing = getThings()[thingName]
          delete thing.state[key]
          if (trigger) stateBus.emit(thingName)
          sendToWs({ topic: 'update', payload: thing })
          break
      }
    })
  })

  RED.events.on('runtime-event', event => {
    // On re-deployment
    if (event.id == 'runtime-deploy') {
      // Cleanup list of things
      let allThingsSetup = []
      RED.nodes.eachNode(setupConfig => {
        if (RED.nodes.getNode(setupConfig.id) && setupConfig.type == 'Thing Setup')
          allThingsSetup.push(...setupConfig.things.map(t => t.name))
      })
      let things = getThings()
      Object.values(things)
        .filter(t => !allThingsSetup.includes(t.name))
        .forEach(t => delete things[t.name])

      // Send list of things to any connected clients
      sendToWs(makeListPacket())
    }
  })

  RED.httpAdmin.get('/things/ui-utils.js', function (req, res) {
    res.sendFile(__dirname + '/ui-utils.js')
  })
}
