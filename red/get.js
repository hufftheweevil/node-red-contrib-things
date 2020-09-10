module.exports = function (RED) {

  function Node(config) {
    RED.nodes.createNode(this, config)

    let node = this

    node.on('input', function (msg) {

      let errors = []

      // Get reference to thing
      let name = config.name || msg.topic
      let thing = this.context().global.get('things')[name]

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

      // For each prop configured...
      config.props.forEach(({ msgProp, thingProp, path }) => {

        if (!msgProp) return

        try {
          // Get path of thing object and set to prop on msg
          let thingPath = path ? `${thingProp}.${path}` : thingProp
          let value = RED.util.getObjectProperty(thing, thingPath)
          RED.util.setMessageProperty(msg, msgProp, value, true)
        } catch (err) {
          errors.push(err.toString())
        }
      })

      // Output or error
      if (errors.length) {
        node.error(errors.join('; '), msg)
        node.status({
          fill: 'red',
          shape: 'dot',
          text: 'Error during parsing; See log'
        })
      } else {
        node.status(thing.status(thing.state, thing.props))
        node.send(msg)
      }
    })

  }
  RED.nodes.registerType('Thing Get', Node)
}