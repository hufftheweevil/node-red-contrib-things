function pushUnique(array, item) {
  if (!array.includes(item)) array.push(item)
}

let p = n => ('' + n).padStart(2, '0')
let now = (d = new Date()) =>
  `${d.getMonth() + 1}/${d.getDate()} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`

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
  ntrue: a => a !== true,
  false: a => a === false,
  nfalse: a => a !== false,
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
  hask: (a, b) => typeof b !== 'object' && a.hasOwnProperty(b + ''),
  inc: (a, b) => (Array.isArray(a) ? a.includes(b) : Array.isArray(b) ? b.includes(a) : false)
}

function makeParam(part, rule, thing, node, msg, RED) {
  switch (part) {
    case 'a':
      if (/child|descendant/.test(rule.thingProp)) return thing.name
      return RED.util.getObjectProperty(thing, rule.thingProp)

    case 'b':
      if (rule.compare == 'isType') return rule.value
      if (rule.thingProp == 'child') return thing.children

      if (rule.value) {
        let b = RED.util.evaluateNodeProperty(rule.value, rule.valType, node, msg)
        if (rule.thingProp == 'descendant') {
          const THINGS = node.context().global.get('things')
          function getDescendantList(name) {
            let group = THINGS[name]
            if (!group) return []
            if (!group.things) return [name]
            return group.things.map(getDescendantList).flat()
          }
          return getDescendantList(b).filter((v, i, a) => a.indexOf(v) == i)
        } else {
          return b
        }
      }
      return

    case 'c':
      if (rule.compare == 'btwn')
        return RED.util.evaluateNodeProperty(rule.value2, rule.valType2, node, msg)
      if (rule.compare == 'regex') return rule.case
      return
  }
}

module.exports = { pushUnique, now, TESTS, makeParam }
