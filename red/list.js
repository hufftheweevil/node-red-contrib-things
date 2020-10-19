let { TESTS } = require('./shared')

module.exports = function (RED) {
  function Node(config) {
    RED.nodes.createNode(this, config)

    const node = this
    const global = this.context().global

    node.on('input', function (msg) {
      // Get list of things
      let list = Object.values(global.get('things'))

      // For each rule, filter the list
      config.rules.forEach(rule => {
        try {
          let test = TESTS[rule.compare]

          let b =
            !/true|false|null|nnull|empty|nempty|istype/.test(rule.compare) &&
            RED.util.evaluateNodeProperty(rule.value, rule.valType, node, msg)

          let c =
            /btwn/.test(rule.compare) &&
            RED.util.evaluateNodeProperty(rule.value2, rule.valType2, node, msg)

          list = list.filter(thing => {
            let a = RED.util.getObjectProperty(thing, rule.thingProp)

            if (/true|false|null|nnull|empty|nempty/.test(rule.compare)) return test(a)

            if (/istype/.test(rule.compare)) return test(a, rule.value)

            if (/btwn/.test(rule.compare)) return test(a, b, c)

            if (/regex/.test(rule.compare)) return test(a, b, rule.case)

            return test(a, b)
          })
        } catch (err) {
          node.warn(`Error during test: ${err}`)
          return false
        }
      })

      // Convert to names or ids (if configured) or clone to prevent changes
      list =
        config.outputValue == 'thing'
          ? RED.util.cloneMessage(list)
          : list.map(thing => thing[config.outputValue])

      // Discard input, if configured
      if (config.discardInput) msg = {}

      // Output
      if (config.outputType == 'array') appendAndSend(list)
      else list.forEach(appendAndSend)

      function appendAndSend(value) {
        RED.util.setObjectProperty(msg, config.property, value, true)
        node.send(msg)
      }
    })
  }
  RED.nodes.registerType('Thing List', Node)
}
