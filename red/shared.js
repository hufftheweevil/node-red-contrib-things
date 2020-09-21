let EventEmitter = require('events')
let systemBus = new EventEmitter()
let stateBus = new EventEmitter()
let commandBus = new EventEmitter()

let ready = new Set()

systemBus.on('ready', part => ready.add(part))

systemBus.on('not-ready', () => ready.clear())

function pushUnique(array, item) {
  if (!array.includes(item)) array.push(item)
}

let p = n => ('' + n).padStart(2, '0')

function now() {
  let d = new Date()

  return `${d.getMonth() + 1}/${d.getDate()} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}

module.exports = { ready, systemBus, stateBus, commandBus, pushUnique, now }