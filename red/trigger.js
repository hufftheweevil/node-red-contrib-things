let { stateBus, _get } = require('./shared')

module.exports = function (RED) {

  function Node(config) {
    RED.nodes.createNode(this, config)

    let node = this
    let global = this.context().global

    node.on('input', function (msg) {
      // Future use
    })

    // This will setup a listener on the bus to trigger
    // off of any update node that updates this thing's
    // state. This will change the node's status and
    // output a message (if configured as such)

    // Helper to retrieve thing
    let getThing = () => global.get('things')[config.name]

    // Helper to get state (or part of state) as string
    let stringifyState = () => {
      let thing = getThing()
      return thing && JSON.stringify(
        config.output == 'path' ? _get(thing.state, config.outputPath) : thing.state
      )
    }

    // Keep last known state (only used when config.output != 'all')
    let lastKnownState = stringifyState()

    // The function to be called when triggered
    let action = () => {
      let thing = getThing()
      if (!thing) return

      updateStatus()

      // Serialize latest state (or specific path, if configured)
      let latestState = stringifyState()

      // Output state message accordingly
      if (config.output == 'all' || lastKnownState != latestState)
        output(thing)

      // Update last known state
      lastKnownState = latestState

      // Check for parents and trigger
      thing.parents && thing.parents.forEach(parent => stateBus.emit(parent))
    }

    // Listen for state updates for this thing
    stateBus.on(config.name, action)

    // When node destroyed, stop listening
    node.on('close', function () {
      stateBus.removeListener(config.name, action)
    })

    // Updates the node status
    function updateStatus() {
      let thing = getThing()
      if (!thing) return

      // Catch any errors that occur when running the thing.status function
      try {
        let statusMsg = thing.status(thing.state, thing.props) || {
          fill: 'red',
          shape: 'ring',
          text: 'Unknown'
        }
        node.status(statusMsg)
      } catch (err) {
        node.warn(`Unable to set status for ${thing.name}: ${err}`)
      }
    }

    // Sends output message
    function output(thing) {
      let msg = {
        topic: thing.name,
        payload: config.payload == 'path' ? _get(thing.state, config.payloadPath) : thing.state
      }
      if (config.incThing) msg.thing = thing
      node.send(msg)
    }

    // Initialize status (if thing already exists)
    updateStatus()
  }
  RED.nodes.registerType('Thing Trigger', Node)
}
