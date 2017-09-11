'use strict'

class CommandCallbackMap extends Map {
  act (id, msg) {
    if (!id || typeof id !== 'string') {
      throw new TypeError('id must be a string')
    }

    if (!this.has(id)) {
      throw new TypeError(`missing callback for id ${id}`)
    }

    const cb = this.get(id)

    this.delete(id)

    cb(msg)
  }
}

module.exports = exports = CommandCallbackMap
