function convertOldThing(thing) {
  // ADJUST FORMATTING FROM OLD VERSIONS
  // This reformatting will only be temporary.
  // Must open node editor for each node to make permanent.

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
}

module.exports = { convertOldThing }
