'use strict'

const Wormhole = require('./index')
const channel = new Wormhole()

channel.defineCommand('add', function (a, b) {
  const result = a + b
  console.log(`[add]: ${a} + ${b} = ${result}`)
  return result
})

channel.events.on('hello', () => {
  console.log('hello!')
  channel.event('hello-back')
})

setTimeout(() => {
  channel.command('subtract', 6, 5).then(result => {
    console.log(`subtract result: ${result}`)
  }).catch(err => console.error(err))
}, 2000)
