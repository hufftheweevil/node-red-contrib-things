let { TESTS } = require('./shared')

module.exports = function (RED) {
  function Node(config) {
    RED.nodes.createNode(this, config)

    const node = this
    const global = this.context().global

    node.on('input', function (msg) {
      // Get reference to thing
      let name = config.name || msg.topic
      let thing = global.get('things')[name]

      // Check for thing
      if (!thing) {
        node.error(`Thing '${name}' not found`)
        node.status({
          fill: 'red',
          shape: 'ring',
          text: 'Thing not found'
        })
        return
      }

      // Set status (only if configured for specific thing)
      if (config.name) node.status(thing.status)

      // Check all rules
      let pass = config.rules.every(rule => {
        try {
          let test = TESTS[rule.compare]

          let a = RED.util.getObjectProperty(thing, rule.thingProp)

          let b = makeParam('b', rule, node, msg, RED)
          let c = makeParam('c', rule, node, msg, RED)
          // let b =
          //   (rule.compare = 'istype' && rule.value) ||
          //   (rule.value && RED.util.evaluateNodeProperty(rule.value, rule.valType, node, msg))

          // let c =
          //   (rule.compare == 'btwn' &&
          //     RED.util.evaluateNodeProperty(rule.value2, rule.valType2, node, msg)) ||
          //   (rule.compare == 'regex' && rule.case)

          return test(a, b, c)
        } catch (err) {
          node.warn(`Error during test: ${err}`)
          return false
        }
      })

      // Output, maybe
      if (pass) node.send(msg)
      else if (config.secondOutput) node.send([null, msg])
    })
  }
  RED.nodes.registerType('Thing Test', Node)
}
