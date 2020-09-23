let EventEmitter = require('events')
let stateBus = new EventEmitter()
let commandBus = new EventEmitter()

function pushUnique(array, item) {
  if (!array.includes(item)) array.push(item)
}

let p = n => ('' + n).padStart(2, '0')

function now() {
  let d = new Date()

  return `${d.getMonth() + 1}/${d.getDate()} ${p(d.getHours())}:${p(d.getMinutes())}:${p(
    d.getSeconds()
  )}`
}

module.exports = { stateBus, commandBus, pushUnique, now }
