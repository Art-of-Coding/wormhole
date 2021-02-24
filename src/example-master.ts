'use strict'

import { fork } from 'child_process'
import Wormhole from './index'

const child = fork('./dist/example-child.js')
const wormhole = new Wormhole(child)

wormhole.events.on('startup', () => {
  console.log('[master]: received startup event')
})

wormhole.define('add', function (a: number, b: number) {
  return a + b
})

setTimeout(() => {
  wormhole.event('quit')
  console.log('[master]: send quit event')
}, 5000)
