'use strict'

const shortid = require('shortid')

class CommandCallbackMap extends Map {
  act (id, msg) {
    if (!id || !shortid.isValid(id)) {
      throw new TypeError('invalid id')
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
