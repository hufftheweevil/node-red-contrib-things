let { TESTS } = require('./shared')

module.exports = function (RED) {
  function Node(config) {
    RED.nodes.createNode(this, config)

    const node = this
    const global = this.context().global

    function getGroupList(groupName) {
      let group = global.get('things')[groupName]
      if (!group.things) return
      return group.things.map(thing => getGroupList(thing.name) || thing.name).flat()
    }

    node.on('input', function (msg) {
      // Get list of things
      let list = Object.values(global.get('things'))

      // For each rule, filter the list
      config.rules.forEach(rule => {
        try {
          let b = makeParam('b', rule, node, msg, RED)
          // let b =
          //   (rule.compare = 'istype' && rule.value) ||
          //   (rule.value && RED.util.evaluateNodeProperty(rule.value, rule.valType, node, msg))

          if (rule.thingProp == 'group') {
            let thingsInGroup = getGroupList(b)
            list = list.filter(thing => thingsInGroup.includes(thing.name))
          } else {
            let b = makeParam('c', rule, node, msg, RED)
            // let c =
            //   (rule.compare == 'btwn' &&
            //     RED.util.evaluateNodeProperty(rule.value2, rule.valType2, node, msg)) ||
            //   (rule.compare == 'regex' && rule.case)

            list = list.filter(thing => {
              let a = RED.util.getObjectProperty(thing, rule.thingProp)

              return TESTS[rule.compare](a, b, c)
            })
          }
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
        msg = RED.util.cloneMessage(msg)
        RED.util.setObjectProperty(msg, config.property, value, true)
        node.send(msg)
      }
    })
  }
  RED.nodes.registerType('Thing List', Node)
}
