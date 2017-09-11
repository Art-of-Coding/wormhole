'use strict'

class CommandCallbackMap extends Map {
  act (id) {
    if (!id || typeof id !== 'string') {
      throw new TypeError('id must be a string')
    }

    if (!this.has(id)) {
      throw new TypeError(`missing callback for id ${id}`)
    }

    const cb = this.get(id)

    this.delete(id)

    return cb
  }
}

module.exports = exports = CommandCallbackMap
