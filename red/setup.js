let { stateBus, pushUnique } = require('./shared')

module.exports = function (RED) {
  function Node(config) {
    RED.nodes.createNode(this, config)

    let node = this

    node.status({
      shape: 'dot',
      fill: 'blue',
      text: 'Initializing...'
    })

    // Initialize global.things if it doesn't exist
    const global = this.context().global
    if (!global.get('things')) global.set('things', {})
    const THINGS = global.get('things')

    let errors = 0

    config.things.forEach((newThing, i) => {
      if (!newThing.name) {
        node.error(`Thing name missing during setup (${config.thingType}:${i})`)
        return errors++
      }

      if (config.thingType == 'Group') {
        let { name, things } = newThing

        THINGS[name] = {
          name,
          type: 'Group',
          things,
          status: () => {}, // Placeholder; TODO: Somehow combine status of all things in group
          state: {}, // Placeholder (without it, can cause crash)
          props: {} // Placeholder (without it, can cause crash)
        }
      } else {
        // config.thingType != 'Group'

        let { name, id } = newThing

        if (id.trim() === '') id = name
        else if (!isNaN(id)) id = +id

        let oldThing = THINGS[name]

        // Check for known parents
        let parents = []
        Object.values(THINGS)
          .filter(t => t.proxy)
          .forEach(possibleParent => {
            let proxyDef = possibleParent.proxy[name]
            if (proxyDef && proxyDef.state) parents.push(possibleParent.name)
          })

        if (config.debug)
          node.warn(`Setting up ${name} with parents ${parents.length ? parents : '<none>'}`)

        // Sets defaults first, then includes the payload from input
        THINGS[name] = {
          id,
          name,
          type: config.thingType,
          props: newThing.props ? JSON.parse(newThing.props) : {},
          state: (oldThing && oldThing.state) || (newThing.state ? JSON.parse(newThing.state) : {}),
          status: config.statusFunction
            ? new Function('state', 'props', config.statusFunction)
            : state => ({ text: JSON.stringify(state) }),
          proxy: JSON.parse(newThing.proxy || null) || undefined,
          parents
        }
        let thing = THINGS[name]

        // If proxies are specified
        if (newThing.proxy) {
          //
          // For each proxied thing
          Object.entries(JSON.parse(newThing.proxy)).forEach(
            ([proxyThingName, { state: stateMap }]) => {
              if (!stateMap) return
              //
              // Link states with getter
              Object.entries(stateMap).forEach(([from, to]) => {
                delete thing.state[from] // Clear it first if it exists
                Object.defineProperty(thing.state, from, {
                  get: () => {
                    // This check for the thing is mostly just in case it attempts to
                    // use this state to update the status before the child has been setup
                    const THINGS = global.get('things')
                    if (config.debug)
                      node.warn(
                        `Calling getter for '${name}'.state.${from} -- Will return '${
                          THINGS[proxyThingName] && THINGS[proxyThingName].state[to]
                        }'`
                      )
                    return THINGS[proxyThingName] && THINGS[proxyThingName].state[to]
                  },
                  enumerable: true,
                  configurable: true
                })
              })

              // Find proxied thing (i.e. the child)
              let proxyThing = THINGS[proxyThingName]
              if (proxyThing) {
                // If it is already setup, note parent in proxied thing
                if (config.debug)
                  node.warn(`Adding parent ${name} to proxy child ${proxyThing.name}`)
                pushUnique(proxyThing.parents, name)
              }
            }
          )
        } // End if proxies are specified
      } // End if config.thingType != 'Group'

      // Emit to the bus so that all other nodes that
      // are configured to output on changes/updates
      // will be triggered. (And update their status)
      stateBus.emit(newThing.name)
    })

    // Sort things first (only for ease of access in UI)
    const ABC_THINGS = {}
    Object.keys(THINGS)
      .sort()
      .forEach(key => (ABC_THINGS[key] = THINGS[key]))
    global.set('things', ABC_THINGS)

    node.status({
      shape: 'dot',
      fill: errors ? 'red' : 'green',
      text: errors ? 'Errors during setup, see debug log' : 'Complete'
    })

    setTimeout(() => {
      // Make list of all active things of this type
      let allThingsThisType = []
      RED.nodes.eachNode(otherConfig => {
        if (
          RED.nodes.getNode(otherConfig.id) &&
          otherConfig.type == 'Thing Setup' &&
          otherConfig.thingType == config.thingType
        )
          allThingsThisType.push(...otherConfig.things.map(t => t.name))
      })

      // Garbage collect inactive things of this type
      const THINGS = global.get('things')
      Object.values(THINGS)
        .filter(t => t.type == config.thingType && !allThingsThisType.includes(t.name))
        .forEach(t => delete THINGS[t.name])
    }, 0)
  }
  RED.nodes.registerType('Thing Setup', Node)
}
