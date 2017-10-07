'use strict'

const EventEmitter = require('events').EventEmitter
const ChildProcess = require('child_process').ChildProcess

const Ultron = require('ultron')
const shortid = require('shortid')

class Wormhole extends EventEmitter {
  constructor (channel = process) {
    super()

    if (channel !== process && !(channel instanceof ChildProcess)) {
      throw new TypeError('channel needs to be \'process\' or an instance of child_process.ChildProcess')
    }

    if (!channel.connected) {
      throw new Error('Not connected')
    }

    this._channel = channel

    this._commands = new Map()
    this._commandCallbacks = new Map()
    this._events = new EventEmitter()

    this._channelEvents = new Ultron(this._channel)
    this._channelEvents.on('message', this._onMessage.bind(this))
    this._channelEvents.once('disconnect', this._onDisconnect.bind(this))
  }

  get connected () {
    return this._channel && this._channel.connected
  }

  get pendingCallbacks () {
    return this._commandCallbacks.size
  }

  get events () {
    return this._events
  }

  /**
   * Defines a command so it can be called from the other side.
   * @param  {String}   name    The name of the command
   * @param  {Function} fn      The command itself
   * @param  {any}      context The command context
   */
  define (name, fn, context) {
    if (!name || typeof name !== 'string') {
      throw new TypeError('name must be a string')
    }

    if (!fn || typeof fn !== 'function') {
      throw new TypeError('fn must be a function')
    }

    if (this._commands.has(name)) {
      throw new Error(`'${name}' already defined`)
    }

    this._commands.set(name, { fn: fn, context: context })
  }

  /**
   * Writes an event with optional arguments.
   * @param  {String}  name The name of the event
   * @param  {any}  ...args The event arguments
   * @return {Promise}      Resolves when the event is sent
   */
  event (name, ...args) {
    if (!name || typeof name !== 'string') {
      throw new TypeError('name must be a string')
    }

    const request = {
      cmd: 'event',
      data: {
        name: name
      }
    }

    if (args && args.length) {
      request.data.args = args
    }

    return this.write(request)
  }

  /**
   * Calls a command from the other side.
   * @param  {String}  name The name of the command
   * @param  {any}  ...args The command arguments
   * @return {Promise}      Resolves with the result
   */
  command (name, ...args) {
    if (!name || typeof name !== 'string') {
      throw new TypeError('name must be a string')
    }

    return new Promise((resolve, reject) => {
      if (!this.connected) {
        return reject(new Error('Not connected'))
      }

      const message = {
        id: shortid.generate(),
        cmd: 'call_command',
        data: {
          name: name
        }
      }

      if (args && args.length) {
        message.data.args = args
      }

      this._commandCallbacks.set(message.id, response => {
        if (response.status !== 'ok') {
          reject(new Error(response.data.message || `Invalid status (${response.status || 'none'})`))
        } else {
          resolve(response.data.result)
        }
      })

      this.write(message).catch(err => {
        this._commandCallbacks.delete(message.id)
        reject(err)
      })
    })
  }

  /**
   * Writes a message over the channel.
   * @param  {*} message The message to send
   */
  write (message) {
    if (message === undefined) {
      throw new TypeError('message must not be undefined')
    }

    if (typeof message === 'object' && !Object.keys(message).length) {
      throw new TypeError('message must not be empty')
    }

    return new Promise((resolve, reject) => {
      if (!this.connected) {
        return reject(new Error('channel not connected'))
      }

      this._channel.send(message, () => resolve())
    })
  }

  /**
   * Disconnects the channel.
   */
  disconnect () {
    if (!this.connected) {
      throw new Error('Not connected')
    }

    return this._channel.disconnect()
  }

  _onMessage (message) {
    if (message.requestId) {
      if (!this._executeCommandCallback(message)) {
        setImmediate(() => this.emit('error', new Error('unknown requestId received')))
      }
      return
    }

    if (message.cmd) {
      switch (message.cmd) {
        case 'call_command':
          return this._handleCommandCall(message.data.name, message.data.args || [], message.id).catch(err => {
            setImmediate(() => this.emit('error', new Error(`unable to execute command: ${err.message}`)))
          })
        case 'event':
          return setImmediate(() => this._events.emit.apply(this._events, [ message.data.name ].concat(message.data.args || [])))
        default:
          return setImmediate(() => this.emit('error', new Error('invalid command received')))
      }
    }

    this.emit('message', message)
  }

  _executeCommandCallback (message) {
    if (!this._commandCallbacks.has(message.requestId)) {
      return false
    }

    const cb = this._commandCallbacks.get(message.requestId)
    this._commandCallbacks.delete(message.requestId)

    setImmediate(() => cb(message))
    return true
  }

  _handleCommandCall (name, args, id) {
    const response = {
      requestId: id,
      data: {}
    }

    const writeResult = result => {
      if (result instanceof Error) {
        response.status = 'error'
        response.data.name = result.name || 'Error'
        response.data.message = result.message
      } else {
        response.status = 'ok'
        response.data.result = result
      }

      return this.write(response)
    }

    if (!name || typeof name !== 'string') {
      return writeResult(new TypeError('name must be a string'))
    }

    if (!args || !Array.isArray(args)) {
      return writeResult(new TypeError('args must be an array'))
    }

    if (!this._commands.has(name)) {
      return writeResult(new Error(`'${name}' is not defined`))
    }

    return this._call(name, args).then(result => {
      return writeResult(result)
    }).catch(err => {
      return writeResult(err)
    })
  }

  _call (name, args) {
    const cmd = this._commands.get(name)
    let result = null

    try {
      result = cmd.fn.apply(cmd.context, args)
    } catch (e) {
      result = e
    }

    if (result.then && result.then === 'function') {
      return result
    }

    if (result instanceof Error) {
      return Promise.reject(result)
    }

    return Promise.resolve(result)
  }

  _onDisconnect () {
    if (this.pendingCallbacks) this._commandCallbacks.clear()
    this._channelEvents.destroy()
    this._channelEvents = null
    this._channel = null

    this.emit('disconnect')
  }
}

module.exports = exports = Wormhole
