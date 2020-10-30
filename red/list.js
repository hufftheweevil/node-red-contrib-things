let { TESTS, makeParam } = require('./shared')

module.exports = function (RED) {
  function Node(config) {
    RED.nodes.createNode(this, config)

    // THIS LINE ONLY: ADJUST FROM (BAD) OLD VERSION
    if (config.outputValue == 'names') config.outputValue = 'name'

    const node = this
    const global = this.context().global

    function getGroupList(name) {
      let group = global.get('things')[name]
      if (!group) return []
      if (!group.things) return [name]
      return group.things.map(getGroupList).flat()
    }

    node.on('input', function (msg) {
      // Get list of things
      let list = Object.values(global.get('things'))

      // For each rule, filter the list
      config.rules.forEach(rule => {
        try {
          let b = makeParam('b', rule, null, node, msg, RED)

          // For "is in group" rule, convert group name into list of things in group
          if (rule.thingProp == 'group') b = getGroupList(b).filter((v, i, a) => a.indexOf(v) == i)

          let c = makeParam('c', rule, null, node, msg, RED)
          list = list.filter(thing => {
            let a = makeParam('a', rule, thing, node, msg, RED)
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
            ? RED.util.cloneMessage(list)
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
