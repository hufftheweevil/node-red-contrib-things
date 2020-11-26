let { stateBus } = require('../lib/bus.js')
let { TESTS, now } = require('../lib/utils.js')
let { convertOldTrigger } = require('../lib/convert.js')

module.exports = function (RED) {
  function Node(config) {
    convertOldTrigger(config)

    RED.nodes.createNode(this, config)

    const node = this
    const global = this.context().global

    // This will setup a listener on the bus to trigger
    // off of any update node that updates this thing's
    // state. This will change the node's status and
    // output a message (if configured as such)

    // Each thing that matches the conditions
    // will be added to the `watchers` list to track each
    // one individually. In single mode, only one is used.
    class ThingWatcher {
      constructor(thingName) {
        this.name = thingName
        this.lastKnownState = this.getState()
        this.callback = this.callback.bind(this)
      }
      get thing() {
        let things = global.get('things')
        return things ? things[this.name] : { state: {} } // Placeholder if called before setup in single mode
      }
      getState() {
        return this.thing && JSON.stringify(this.get(config.triggerState || 'state'))
      }
      get(path) {
        try {
          return RED.util.getObjectProperty(this.thing, path)
        } catch (err) {
          node.warn(`Error getting path ${path}: ${err}`)
          return ''
        }
      }
      callback() {
        let thing = this.thing

        // Serialize latest state at specific path (or entire state if using 'All Updates')
        this.latestState = this.getState()

        // Ignore init
        if (config.ignoreInit && this.lastKnownState == undefined) return this.finish()

        // Determine if need to output
        if (config.triggerState === null || this.lastKnownState != this.latestState) {
          // Extra checks if using test
          if (config.triggerTest) {
            let { compare, type, value } = config.triggerTest
            try {
              let a = this.get(config.triggerState)
              let b = RED.util.evaluateNodeProperty(value, type, node)
              let test = TESTS[compare]
              this.finish(test(a, b))
            } catch (err) {
              node.warn(`Error during test: ${err}`)
              this.finish()
            }
          } else {
            // No other tests, just output
            this.finish(true)
          }
        }
      }
      finish(trigger) {
        if (trigger) {
          // Output state message accordingly
          try {
            let msg = {
              topic: this.thing.name,
              payload:
                config.payload.type == 'state'
                  ? this.get('state' + (config.payload.value ? '.' + config.payload.value : ''))
                  : RED.util.evaluateNodeProperty(config.payload.value, config.payload.type, node)
            }
            setTimeout(() => node.send(msg), 1)
          } catch (err) {
            node.warn(`Error making payload: ${err}`)
          }
        }

        // Update last known state
        this.lastKnownState = this.latestState

        // Update status
        node.status({
          text: `${this.thing.name} | ${now()}`
        })
      }
    }

    let watchers = []

    // Erase status
    node.status({})
    // Instant timeout causes this to run async (after all setup)
    setTimeout(() => {
      // Get list of all things and setup test
      const things = global.get('things')
      const THINGS = Object.values(things)
      // This util is used in place of getTypedValue()
      let compareValue = RED.util.evaluateNodeProperty(
        config.triggerThing.value,
        config.triggerThing.type
      )
      let test =
        compareValue instanceof RegExp
          ? value => compareValue.test(value)
          : value => compareValue == value

      // Generate list of things that match conditions
      watchers = THINGS.filter(thing => {
        try {
          let val = RED.util.getObjectProperty(thing, config.triggerThing.path)
          if (/children|parents|ancestors|descendants/.test(config.triggerThing.path))
            return val.some(test)
          return test(val)
        } catch (err) {
          node.warn(`Unable to test ${thing.name} for ${config.triggerThing.path}: ${err}`)
          return false
        }
      }).map(thing => new ThingWatcher(thing.name))

      // Listen for state updates for each thing
      registerThingListeners()
    }, 0)

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
