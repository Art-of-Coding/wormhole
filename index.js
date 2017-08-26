'use strict'

const EventEmitter = require('events').EventEmitter
const Ultron = require('ultron')
const shortid = require('shortid')

/**
 * Represents a Wormhole class.
 * @type {Class}
 */
class Wormhole extends EventEmitter {
  /**
   * Instantiates a new Wormhole.
   * @param  {any} [channel=process] The communications channel
   */
  constructor (channel = process) {
    super()

    this._events = new EventEmitter()
    this._commands = new Map()
    this._commandCallbacks = new Map()

    this._channel = channel
    this._channelEvents = new Ultron(channel)

    this._channelEvents.on('message', msg => {
      if (msg.msgId && shortid.isValid(msg.msgId)) {
        this._handleCommand(msg).catch(err => {
          err.message = `Unable to handle command: ${err.message}`
          this.emit('error', err)
        })
      } else if (msg.event) {
        this._events.emit.apply(this._events, [ msg.event ].concat(msg.args || []))
      } else {
        this.emit('message', msg)
      }
    })

    this._channelEvents.once('disconnect', () => {
      this._events.removeAllListeners()
      this._events = null

      this._commands.clear()
      this._commands = null

      this._channel = null
      this._channelEvents.destroy()
      this._channelEvents = null

      this.emit('disconnect')
    })
  }

  get events () { return this._events }
  get connected () { return this._channel && this._channel.connected }

  /**
   * Defines a command.
   * @param  {String}   name             The command name
   * @param  {Function} fn               The command function
   * @param  {Boolean}  [override=false] Override command
   */
  defineCommand (name, fn, override = false) {
    if (!name || typeof name !== 'string') {
      throw new TypeError('name must be a string')
    }

    if (!fn || typeof fn !== 'function') {
      throw new TypeError('fn must be a function')
    }

    if (!override && this._commands.has(name)) {
      throw new Error(`${name} already defined`)
    }

    this._commands.set(name, fn)
  }

  /**
   * Sends an event.
   * @param  {String} event The name of the event
   * @param  {any} ...args  The event's arguments
   * @return {Promise}      Resolves on sent
   */
  event (event, ...args) {
    const msg = { event: event }

    if (args && args.length) {
      msg.args = args
    }

    return this.send(msg)
  }

  /**
   * Calls a remote command.
   * @param  {String} name The name of the command
   * @param  {and} ...args The command's arguments
   * @return {Promise}     Resolves with the command's result
   */
  command (name, ...args) {
    if (!name || typeof name !== 'string') {
      throw new TypeError('name must be a string')
    }

    return new Promise((resolve, reject) => {
      const msgId = shortid.generate()

      this._commandCallbacks.set(msgId, msg => {
        this._commandCallbacks.delete(msgId)

        if (msg.error) {
          return reject(msg.error)
        }

        resolve(msg.result)
      })

      this.send({
        msgId: msgId,
        name: name,
        args: args
      }).catch(err => {
        this._commandCallbacks.delete(msgId)
        reject(err)
      })
    })
  }

  /**
   * Sends a message.
   * @param  {Object} msg The message to send
   * @return {Promise}    Resolves on sent
   */
  send (msg) {
    if (!this.connected) {
      throw new Error('ipc not connected')
    }

    return new Promise((resolve, reject) => {
      this._channel.send(msg, err => {
        if (err) return reject(err)
        resolve()
      })
    })
  }

  _handleCommand (msg) {
    if (msg.name && msg.args) {
      return this._dispatchCommand(msg.msgId, msg.name, msg.args)
    }

    if (msg.result || msg.error) {
      if (!this._commandCallbacks.has(msg.msgId)) {
        return Promise.reject(new Error(`unknown msgId received (${msg.msgId})`))
      } else {
        this._commandCallbacks.get(msg.msgId)(msg)
        return Promise.resolve()
      }
    }

    return Promise.reject(new Error('invalid rpc message received'))
  }

  _dispatchCommand (msgId, name, args) {
    const sendResult = (result, success = true) => {
      if (success && result instanceof Error) {
        success = false
      }

      const toSend = { msgId: msgId }

      if (success) {
        toSend.result = result
      } else {
        toSend.error = {
          name: result.name || 'CallError',
          message: result.message || 'No message provided'
        }
      }

      return this.send(toSend)
    }

    if (!name || typeof name !== 'string') {
      return sendResult(new TypeError('name must be a string'))
    }

    if (!args) args = []

    if (!Array.isArray(args)) {
      return sendResult(new TypeError('args must be an array'))
    }

    if (!this._commands.has(name)) {
      return sendResult(new Error(`${name} is not defined`))
    }

    return this._callCommand(name, args).then(result => {
      return sendResult(result)
    }).catch(error => {
      return sendResult(error, false)
    })
  }

  _callCommand (name, args) {
    const command = this._commands.get(name)
    let result = null

    try {
      result = command.apply(null, args)
    } catch (e) {
      result = e
    }

    if (result.then && typeof result.then === 'function') {
      return result
    }

    if (result instanceof Error) {
      return Promise.reject(result)
    }

    return Promise.resolve(result)
  }
}

module.exports = exports = Wormhole
