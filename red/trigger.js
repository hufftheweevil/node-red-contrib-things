let { stateBus, TESTS } = require('./shared')

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
        this.init = true
      }
      get thing() {
        let things = GLOBAL.get('things')
        return things ? things[this.name] : { state: {} } // Placeholder if called before setup in single mode
      }
      getState() {
        return this.thing && JSON.stringify(this.pathOrWhole(config.output, config.outputPath))
      }
      pathOrWhole(flag, path) {
        try {
          return flag == 'path' && path != ''
            ? RED.util.getObjectProperty(this.thing.state, path)
            : this.thing.state
        } catch (err) {
          node.warn(`Error getting path: ${err}`)
        }
      }
      callback() {
        let thing = this.thing

        // Serialize latest state (or specific path, if configured)
        let latestState = this.getState()

        // Determine if need to output
        let shouldOutput = config.output == 'all' || this.lastKnownState != latestState
        if (shouldOutput && config.output == 'path') {
          // Extra checks if using path-mode
          if (config.ignoreInit && this.lastKnownState == undefined) shouldOutput = false
          else if (config.outputTest) {
            let { compare, type, value } = config.outputTest
            try {
              let a = RED.util.getObjectProperty(thing.state, config.outputPath)
              let b = RED.util.evaluateNodeProperty(value, type, node)
              let test = TESTS[compare]
              shouldOutput = test(a, b)
            } catch (err) {
              node.warn(`Error during test: ${err}`)
              shouldOutput = false
            }
          }
          this.init = false // Used for path config only
        }

        // Output state message accordingly
        if (shouldOutput) {
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
        if (!config.multiMode) node.status(thing.status)
      }
    }

    let watchers = []

    if (!config.multiMode) {
      // Create watcher and register
      watchers = [new ThingWatcher(config.name)]
      registerThingListeners()
    } else {
      // Erase status
      node.status({})
      // Instant timeout causes this to run async (after all setup)
      setTimeout(() => {
        // Get list of all things and setup test
        const THINGS = Object.values(GLOBAL.get('things'))
        let compareValue = RED.util.evaluateNodeProperty(config.multiValue, config.multiTest)
        let test =
          compareValue instanceof RegExp
            ? value => compareValue.test(value)
            : value => compareValue == value

        // Generate list of things that match conditions
        watchers =
          config.multiKey == 'group'
            ? THINGS.filter(thing => thing.type == 'Group' && test(thing.name))
                .reduce((list, group) => [...list, ...group.things], [])
                .map(thingName => new ThingWatcher(thingName))
            : THINGS.filter(thing => {
                let thingValue = RED.util.getObjectProperty(thing, config.multiKey)
                return config.multiKey == 'parents' ? thingValue.some(test) : test(thingValue)
              }).map(thing => new ThingWatcher(thing.name))

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
