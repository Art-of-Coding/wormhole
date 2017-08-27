'use strict'

const Wormhole = require('./index')

// Without the `channel` argument, `process` is selected by default
const wormhole = new Wormhole()

// Register a `quit` event handler
wormhole.events.once('quit', () => {
  process.exit(-1)
})

// Send and event
wormhole.event('startup')

// Call a remote command
wormhole.command('add', 5, 6).then(result => {
  console.log(`5 + 6 = ${result}`)
})
