let EventEmitter = require('events')
let deepmerge = require('deepmerge')

module.exports = function (RED) {
  // The bus is used to trigger all nodes with a given thing name
  // to output when any node of the same name receives an input.
  let bus = new EventEmitter()

  function ThingNode(config) {
    RED.nodes.createNode(this, config)

    let node = this

    // Initialize global.things if it doesn't exist, then create pointer
    let global = this.context().global
    if (!global.get('things')) global.set('things', {})
    const THINGS = global.get('things')

    node.on('input', function (msg) {
      // Name should be set in properties, or provided on input.
      // Property takes precedence.
      let name = config.name || msg.topic

      // If setup is used, add thing to global.things
      if (msg.setup) {
        let newThing = msg.setup

        if (typeof newThing !== 'object') {
          node.error(
            `Payload for ${name} must be an object; Instead got: ${JSON.stringify(newThing)}`
          )
          return
        }

        // Sets defaults first, then includes the payload from input
        THINGS[name] = {
          id: name,
          name,
          type: '',
          props: {},
          state: {},
          status: () => state => ({ text: JSON.stringify(state) }),
          ...newThing
        }
      } else {
        // Must be state update message
        let stateUpdate = msg.payload

        // Pointer to the thing
        let thing = THINGS[name]

        if (!thing) {
          node.error(`Unknown thing ${name}`)
          return
        }

        // Update state accordingly
        if (msg.replace) {
          thing.state = stateUpdate
        } else {
          thing.state = deepmerge(thing.state, stateUpdate)
        }
      }

      // Emit to the bus so that all other nodes that
      // are configured to output on changes/updates
      // will be triggered. (And update their status)
      bus.emit(name)

      // If configured to output on input (or this is for
      // setup), send message here because it wasn't done
      // by the bus (for simplicity)
      if (config.output == 'input' || msg.setup)
        return {
          topic: name,
          payload: THINGS[name].state
        }
    })

    // During node creation, if name is set in properties,
    // need to setup a listener on the bus to trigger
    // off of any other node that updates this thing's
    // state. This will change the node's status and
    // output a message (if configured as such)
    if (config.name != '') {
      //
      // Keep last known state (only used when config.output == 'change')
      let lastKnownState = ''

      // The function to be called when triggered
      let action = () => {
        let thing = THINGS[config.name]
        if (!thing) return

        updateStatus()

        // Serialize latest state
        let latestState = JSON.stringify(thing.state)

        // Output state message accordingly
        if (config.output == 'all' || (config.output == 'change' && lastKnownState != latestState))
          node.send({
            topic: thing.name,
            payload: thing.state
          })

        // Update last known state
        lastKnownState = latestState
      }

      // Listen for state updates for this thing
      bus.on(config.name, action)

      // When node destroyed, stop listening
      node.on('close', function () {
        bus.off(config.name, action)
      })
    }

    function updateStatus() {
      if (!config.name) return
      let thing = THINGS[config.name]
      if (thing) node.status(thing.status(thing.state))
    }

    // Initialize status (if thing already exists)
    updateStatus()
  }
  RED.nodes.registerType('thing', ThingNode)
}
