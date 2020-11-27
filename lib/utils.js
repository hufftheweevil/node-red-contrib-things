function pushUnique(array, item) {
  if (!array.includes(item)) array.push(item)
}

let p = n => ('' + n).padStart(2, '0')
let now = (d = new Date()) =>
  `${d.getMonth() + 1}/${d.getDate()} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`

const MAX_STATUS_LENGTH = 50
let makeStatus = (...parts) => ({
  text: parts
    .map(part => {
      if (typeof part !== 'string') part = JSON.stringify(part)
      if (part.length > MAX_STATUS_LENGTH) return part.slice(0, MAX_STATUS_LENGTH) + '...'
      return part
    })
    .concat([now()])
    .join(' | ')
})

const TESTS = {
  eq: (a, b) => a == b,
  neq: (a, b) => a != b,
  lt: (a, b) => a < b,
  lte: (a, b) => a <= b,
  gt: (a, b) => a > b,
  gte: (a, b) => a >= b,
  btwn: (a, b, c) => (a >= b && a <= c) || (a <= b && a >= c),
  // cont: (a, b) => (a + '').indexOf(b) != -1,
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
  isntype: (a, b) => {
    if (b === 'array') {
      return !Array.isArray(a)
    } else if (b === 'buffer') {
      return !Buffer.isBuffer(a)
    } else if (b === 'json') {
      try {
        JSON.parse(a)
        return false
      } catch (e) {
        return true
      }
    } else if (b === 'null') {
      return a !== null
    } else {
      return typeof a !== b || Array.isArray(a) || Buffer.isBuffer(a) || a === null
    }
  },
  hask: (a, b) => typeof b !== 'object' && a.hasOwnProperty(b + ''),
  inc: (a, b) => (Array.isArray(a) ? a.includes(b) : Array.isArray(b) ? b.includes(a) : false)
}

function makeParams(parts, rule, thing, node, msg, RED) {
  let out = {}
  parts.split('').forEach(part => {
    switch (part) {
      case 'a':
        out.a = RED.util.getObjectProperty(thing, rule.thingProp)
        break

      case 'b':
        if (rule.compare == 'isType') out.b = rule.value
        else if (rule.value) out.b = RED.util.evaluateNodeProperty(rule.value, rule.type, node, msg)
        break

      case 'c':
        if (rule.compare == 'btwn')
          out.c = RED.util.evaluateNodeProperty(rule.value2, rule.type2, node, msg)
        else if (rule.compare == 'regex') out.c = rule.case
    }
  })
  return out
}

module.exports = { pushUnique, now, TESTS, makeParams, makeStatus }
