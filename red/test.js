module.exports = function (RED) {
  const TESTS = {
    eq: (a, b) => a == b,
    neq: (a, b) => a != b,
    lt: (a, b) => a < b,
    lte: (a, b) => a <= b,
    gt: (a, b) => a > b,
    gte: (a, b) => a >= b,
    btwn: (a, b, c) => (a >= b && a <= c) || (a <= b && a >= c),
    cont: (a, b) => (a + '').indexOf(b) != -1,
    regex: (a, b, c) => (a + '').match(new RegExp(b, c ? 'i' : '')),
    true: a => a === true,
    false: a => a === false,
    null: a => typeof a == 'undefined' || a === null,
    nnull: a => typeof a != 'undefined' && a !== null,
    empty: a => {
      if (typeof a === 'string' || Array.isArray(a) || Buffer.isBuffer(a)) {
        return a.length === 0
      } else if (typeof a === 'object' && a !== null) {
        return Object.keys(a).length === 0
      }
      return false
    },
    nempty: a => {
      if (typeof a === 'string' || Array.isArray(a) || Buffer.isBuffer(a)) {
        return a.length !== 0
      } else if (typeof a === 'object' && a !== null) {
        return Object.keys(a).length !== 0
      }
      return false
    },
    istype: (a, b) => {
      if (b === 'array') {
        return Array.isArray(a)
      } else if (b === 'buffer') {
        return Buffer.isBuffer(a)
      } else if (b === 'json') {
        try {
          JSON.parse(a)
          return true
        } catch (e) {
          return false
        }
      } else if (b === 'null') {
        return a === null
      } else {
        return typeof a === b && !Array.isArray(a) && !Buffer.isBuffer(a) && a !== null
      }
    },
    hask: (a, b) => typeof b !== 'object' && a.hasOwnProperty(b + '')
  }

  function Node(config) {
    RED.nodes.createNode(this, config)

    let node = this

    node.on('input', function (msg) {
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

      // Set status
      try {
        node.status(thing.status(thing.state, thing.props))
      } catch (err) {
        node.warn('Error calling status function:', err)
      }

      // Check all rules
      let pass = config.rules.every(rule => {
        console.log(rule)
        let test = TESTS[rule.compare]

        let a = RED.util.getObjectProperty(thing, rule.thingProp)

        if (/true|false|null|nnull|empty|nempty/.test(rule.compare)) return test(a)

        if (/istype/.test(rule.compare)) return test(a, rule.value)

        let b = RED.util.evaluateNodeProperty(rule.value, rule.valType, node, msg)

        if (/btwn/.test(rule.compare)) {
          let c = RED.util.evaluateNodeProperty(rule.value2, rule.valType2, node, msg)
          return test(a, b, c)
        }

        if (/regex/.test(rule.compare)) {
          return test(a, b, rule.case)
        }

        return test(a, b)
      })

      // Output, maybe
      if (pass) node.send(msg)
    })
  }
  RED.nodes.registerType('Thing Test', Node)
}
