function convertOldThing(thing) {
  ;['props', 'state', 'proxy'].forEach(key => {
    if (typeof thing[key] == 'string') thing[key] = JSON.parse(thing[key] || '{}')
  })
  if (thing.proxy && !Array.isArray(thing.proxy)) {
    let array = []
    Object.entries(thing.proxy).forEach(([child, proxies]) =>
      ['state', 'command'].forEach(type =>
        Object.entries(proxies[type] || {}).forEach(([thisKey, that]) => {
          if (thisKey == that) that = null
          let proxyDef = { child, type, this: thisKey, that }
          if (type == 'command') proxyDef.cmdType = 'str'
          array.push(proxyDef)
        })
      )
    )
    thing.proxy = array
  }
  // Stage 2 - Don't mind this silliness. Just pretend it's not here.
  if (thing.things) {
    thing.children = thing.things
    delete thing.things
  }
  if (thing.state && !Array.isArray(thing.state)) {
    thing.state = Object.entries(thing.state).map(([key, value]) => {
      if (/^(allTrue|anyTrue|allFalse|anyFalse|min|max|fn)$/.test(value.type)) {
        let newStateObj = {
          key,
          fn: value.type == 'fn' ? value.fn : value.type
        }
        if (value.use != key) newStateObj.childKey = value.use
        return newStateObj
      } else {
        return { key, value }
      }
    })
  }
  if (thing.proxy) {
    thing.commands = []
    thing.proxy.forEach(p => {
      if (p.type == 'state') {
        let newStateObj = { key: p.this, child: p.child }
        if (p.that !== null) newStateObj.childKey = p.that
        thing.state.push(newStateObj)
      } else if (p.type == 'command') {
        let newCmdObj = { cmd: p.this, type: p.cmdType, child: p.child }
        if (p.that != null) newCmdObj.as = p.that
        thing.commands.push(newCmdObj)
      }
    })
    delete thing.proxy
  }
  if (!thing.props) thing.props = {}
}

function convertOldTrigger(config) {
  if (config.triggerThing === undefined) {
    config.triggerThing = config.multiMode
      ? {
          path: config.multiKey,
          type: config.multiTest,
          value: config.multiValue
        }
      : {
          path: 'name',
          type: 'str',
          value: config.name || ''
        }
    if (config.triggerThing.path == 'group') config.triggerThing.path = 'descendants'
    config.triggerState =
      config.output == 'all'
        ? null
        : config.output == 'change'
        ? 'state'
        : `state.${config.outputPath}`
    config.triggerTest = config.outputTest
    config.payload = {
      type: 'state',
      value: config.payload == 'whole' ? '' : config.payloadPath
    }
    delete config.name
    delete config.multiMode
    delete config.multiKey
    delete config.multiTest
    delete config.multiValue
    delete config.output
    delete config.outputPath
    delete config.outputTest
    delete config.payloadPath
    delete config.incThing
  }
}

function convertOldRule(rule) {
  if (rule.thingProp == 'group') rule.thingProp = 'ancestors'
  if (rule.valType) {
    rule.type = rule.valType
    delete rule.valType
  }
  if (rule.valType2) {
    rule.type2 = rule.valType2
    delete rule.valType2
  }
}

module.exports = { convertOldThing, convertOldTrigger, convertOldRule }
