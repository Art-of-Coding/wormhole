'use strict'

const childProcess = require('child_process')
const Wormhole = require('./index')

const child = childProcess.fork('./example-child.js')
const wormhole = new Wormhole(child)

// Register a `startup` event handler
wormhole.events.on('startup', () => {
  console.log('received startup event!')
})

// Register an `add` command
wormhole.define('add', function (a, b) {
  return a + b
})

// Send the `quit` event to the child
setTimeout(() => wormhole.event('quit'), 5000)
