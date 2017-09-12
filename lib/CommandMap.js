'use strict'

class CommandMap extends Map {
  set (name, fn, context) {
    super.set(name, {
      fn: fn,
      context: context
    })

    return this
  }
}

module.exports = exports = CommandMap
