let { stateBus } = require('./shared')

module.exports = function (RED) {

  function Node(config) {
    RED.nodes.createNode(this, config)

    const node = this
    const GLOBAL = this.context().global

    // This will setup a listener on the bus to trigger
    // off of any update node that updates this thing's
    // state. This will change the node's status and
    // output a message (if configured as such)

    // In multi mode, each thing that matches the conditions
    // will be added to the `watchers` list to track each
    // one individually. In single mode, only one is used.
    class ThingWatcher {
      constructor(thingName) {
        this.name = thingName
        this.lastKnownState = this.getState()
        this.callback = this.callback.bind(this)
      }
      get thing() {
        let things = GLOBAL.get('things')
        return things ? things[this.name] : { state: {} }  // Placeholder if called before setup in single mode
      }
      getState() {
        return this.thing && JSON.stringify(this.pathOrWhole(config.output, config.outputPath))
      }
      pathOrWhole(flag, path) {
        return flag == 'path' ? RED.util.getObjectProperty(this.thing.state, path) : this.thing.state
      }
      callback() {
        let thing = this.thing

        // Serialize latest state (or specific path, if configured)
        let latestState = this.getState()

        // Output state message accordingly
        if (config.output == 'all' || this.lastKnownState != latestState) {
          let msg = {
            topic: this.name,
            payload: this.pathOrWhole(config.payload, config.payloadPath)
          }
          if (config.incThing) msg.thing = thing
          setTimeout(() => node.send(msg), 1)
        }

        // Update last known state
        this.lastKnownState = latestState

        // Update status (single mode only)
        if (!config.multiMode) {
          try {
            let statusMsg = thing.status(thing.state, thing.props) || {
              fill: 'red',
              shape: 'ring',
              text: 'Unknown'
            }
            node.status(statusMsg)
          } catch (err) {
            node.warn(`Unable to set status for ${this.name}: ${err}`)
          }
        }
      }
    }

    let watchers = []

    if (!config.multiMode) {

      // Create watcher and register
      watchers = [new ThingWatcher(config.name)]
      registerThingListeners()

    } else {
      // Instant timeout causes this to run async (after all setup)
      setTimeout(() => {

        // Generate list of things that match conditions
        watchers = Object.values(GLOBAL.get('things'))
          .filter(thing => {
            let thingValue = RED.util.getObjectProperty(thing, config.multiKey)
            let compareValue = RED.util.evaluateNodeProperty(config.multiValue, config.multiTest)

            let test = value => value instanceof RegExp ? value.test(thingValue) : thingValue == value

            return config.multiKey == 'parents' ? thingValue.some(test) : test(compareValue)
          })
          .map(thing => new ThingWatcher(thing.name))

        // Listen for state updates for each thing
        registerThingListeners()
      }, 0)
    }

    function registerThingListeners() {
      watchers.forEach(({ name, callback }) => stateBus.on(name, callback))
    }
    function removeAllListeners() {
      watchers.forEach(({ name, callback }) => stateBus.removeListener(name, callback))
    }

    // When node destroyed, stop listening
    node.on('close', function () {
      removeAllListeners()
    })

  }
  RED.nodes.registerType('Thing Trigger', Node)
}
