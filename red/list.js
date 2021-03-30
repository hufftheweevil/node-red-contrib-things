let { TESTS, makeParams } = require('../lib/utils.js')
// let { convertOldRule } = require('../lib/convert.js')

module.exports = function (RED) {
  function Node(config) {
    RED.nodes.createNode(this, config)

    // THIS LINE ONLY: ADJUST FROM (BAD) OLD VERSION
    if (config.outputValue == 'names') config.outputValue = 'name'

    const node = this
    const global = this.context().global

    node.on('input', function (msg) {
      // Get list of things
      let list = Object.values(global.get('things'))

      // For each rule, filter the list
      config.rules.forEach(rule => {
        // convertOldRule(rule)
        try {
          // `b` and `c` is the same for all things
          let { b, c } = makeParams('bc', rule, null, node, msg, RED)

          list = list.filter(thing => {
            // `a` is different for each thing
            let { a } = makeParams('a', rule, thing, node, msg, RED)

            // Run test for this thing + rule
            return TESTS[rule.compare](a, b, c)
          })
        } catch (err) {
          node.warn(`Error during test: ${err}`)
          return false
        }
      })

      // Convert to output value configured (or clone whole thing to prevent mods)
      try {
        list =
          config.outputValue == 'thing'
            ? RED.util.cloneMessage(list).map(t => {
                delete t.config
                delete t._status
                return t
              })
            : list.map(thing => RED.util.getObjectProperty(thing, config.outputValue))
      } catch (err) {
        node.warn(`Unable to build list: ${err}`)
        return
      }

      // Discard input, if configured
      if (config.discardInput) msg = {}

      // Output
      if (config.outputType == 'array') appendAndSend(list)
      else list.forEach(appendAndSend)

      function appendAndSend(value) {
        msg = RED.util.cloneMessage(msg)
        RED.util.setObjectProperty(msg, config.property, value, true)
        node.send(msg)
      }
    })
  }
  RED.nodes.registerType('Thing List', Node)
}
