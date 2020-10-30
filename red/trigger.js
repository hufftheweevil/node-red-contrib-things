let { stateBus, TESTS } = require('./shared')

module.exports = function (RED) {
  function Node(config) {
    RED.nodes.createNode(this, config)

    const node = this
    const global = this.context().global

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
        let things = global.get('things')
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
        const things = global.get('things')
        const THINGS = Object.values(things)
        let compareValue = RED.util.evaluateNodeProperty(config.multiValue, config.multiTest)
        let test =
          compareValue instanceof RegExp
            ? value => compareValue.test(value)
            : value => compareValue == value

        function recurFindThings(name) {
          let thing = things[name] || {}
          return thing.type == 'Group' ? thing.things.flatMap(recurFindThings) : [thing.name]
        }

        // Generate list of things that match conditions
        watchers = (config.multiKey == 'group'
          ? THINGS.filter(thing => thing.type == 'Group' && test(thing.name)).flatMap(group =>
              recurFindThings(group.name)
            )
          : THINGS.filter(thing => {
              try {
                return test(RED.util.getObjectProperty(thing, config.multiKey))
              } catch (err) {
                node.warn(`Unable to test ${thing.name} for ${config.multiKey}: ${err}`)
                return false
              }
            }).map(thing => thing.name)
        )
          .filter((v, i, a) => a.indexOf(v) == i)
          .map(name => new ThingWatcher(name))

        // Listen for state updates for each thing
        registerThingListeners()
      }, 0)
    }

    function registerThingListeners() {
      watchers.forEach(w => stateBus.on(w.name, w.callback))
    }
    function removeAllListeners() {
      watchers.forEach(w => stateBus.removeListener(w.name, w.callback))
    }

    // When node destroyed, stop listening
    node.on('close', function () {
      removeAllListeners()
    })
  }
  RED.nodes.registerType('Thing Trigger', Node)
}
