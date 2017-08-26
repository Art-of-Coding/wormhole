'use strict'

const IPCChannel = require('./index')
const childProcess = require('child_process')

const child = childProcess.fork('./example-child.js')
const channel = new IPCChannel(child)

channel.defineCommand('subtract', function (a, b) {
  const result = a - b
  console.log(`[subtract]: ${a} - ${b} = ${result}`)
  return result
})

channel.event('hello')

channel.events.on('hello-back', () => {
  console.log('got hello back!')
})

channel.command('add', 5, 6)
