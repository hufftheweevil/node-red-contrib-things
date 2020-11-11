let EventEmitter = require('events')
let stateBus = new EventEmitter()
let commandBus = new EventEmitter()

module.exports = { stateBus, commandBus }
