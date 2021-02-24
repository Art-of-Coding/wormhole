'use strict'

import Wormhole from './index'

const wormhole = new Wormhole(process)

wormhole.events.once('quit', () => {
  console.log('[child]: received quit event')
  process.exit(-1)
})

wormhole.event('startup')

wormhole.command<number>('add', 5, 6).then(result => {
  console.log(`[child]: 5 + 6 = ${result}`)
})
