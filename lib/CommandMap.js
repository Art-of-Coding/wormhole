'use strict'

class CommandMap extends Map {
  set (name, fn, context) {
    super.set(name, {
      fn: fn,
      context: context
    })

    return this
  }

  act (name, args) {
    const command = this.get(name)

    return command.fn.apply(command.context, args)
  }
}

module.exports = exports = CommandMap
