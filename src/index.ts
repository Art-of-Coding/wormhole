'use strict'

import { EventEmitter } from 'events'
import { ChildProcess } from 'child_process'

import { nanoid } from 'nanoid/async'

export interface Message {
  cmd: 'call-command' | 'command-result' | 'event',
  ok?: boolean,
  reqId?: string,
  resId?: string
  data?: {
    name?: string,
    message?: string,
    result?: any,
    args?: any[]
  }
}

interface CommandCallback {
  (message: Message): void
}

export default class Wormhole extends EventEmitter {
  #channel: NodeJS.Process | ChildProcess
  #commands: Map<string, { fn: Function, ctx?: any }> = new Map()
  #commandCallbacks: Map<string, CommandCallback> = new Map()
  #events: EventEmitter = new EventEmitter()

  public constructor (channel: NodeJS.Process | ChildProcess) {
    super()

    if (!channel.connected) {
      throw new Error('Channel not connected')
    }

    this.onMessage = this.onMessage.bind(this)
    this.onDisconnect = this.onDisconnect.bind(this)

    this.#channel = channel
    channel.on('message', this.onMessage)
    channel.once('disconnect', this.onDisconnect)
  }

  public get connected (): boolean {
    return this.#channel?.connected ?? false
  }

  public get channel (): NodeJS.Process | ChildProcess {
    return this.#channel
  }

  public get pendingCallbacks (): number {
    return this.#commandCallbacks.size
  }

  public get events () {
    return this.#events
  }

  /**
   * Define a command.
   * @param name The name of the command
   * @param fn The command function
   * @param ctx The command context
   */
  public define (name: string, fn: (...args: any[]) => any, ctx?: any): this {
    const mapped: { fn: any, ctx?: any } = { fn }

    if (ctx) {
      mapped.ctx = ctx
    }

    this.#commands.set(name, mapped)
    return this
  }

  /**
   * Call a remote command.
   * @param name The name of the command
   * @param args The arguments of the command
   */
  public async command<TResult = any> (name: string, ...args: any[]): Promise<TResult> {
    const message: Message = {
      cmd: 'call-command',
      reqId: await nanoid(),
      data: { name }
    }

    if (args.length) {
      message.data.args = args
    }

    return new Promise<TResult>(async (resolve, reject) => {
      this.#commandCallbacks.set(message.reqId, response => {
        if (!response.ok) {
          reject(new Error(response.data.message))
        } else {
          resolve(response.data?.result)
        }
      })

      try {
        await this.write(message)
      } catch (e) {
        this.#commandCallbacks.delete(message.reqId)
        reject(e)
      }
    })
  }

  /**
   * Emit a remote event.
   * @param name The name of the event
   * @param args The arguments of the event
   */
  public async event (name: string, ...args: any[]) {
    const request: Message = {
      cmd: 'event',
      data: {
        name
      }
    }

    if (args.length) {
      request.data.args = args
    }

    return this.write(request)
  }

  /**
   * Write a message to the channel.
   * @param message The message
   */
  public async write (message: Message): Promise<void> {
    if (!this.#channel) {
      throw new Error('No channel')
    }

    return new Promise<void>((resolve, reject) => {
      this.#channel.send(message, err => {
        if (err) return reject(err)
        resolve()
      })
    })
  }

  public disconnect () {
    if (!this.#channel) {
      throw new Error('No channel')
    }

    this.#channel.disconnect()
  }

  private async onMessage (message: Message) {
    try {
      switch (message.cmd) {
        case 'call-command':
          // Call the command
          await this.handleCommandCall(message.reqId, message.data.name, ...(message.data.args ?? []))
          break
        case 'command-result':
          // Handle command result
          this.executeCommandCallback(message)
          break
        case 'event':
          this.#events.emit.apply(this.#events, [ message.data.name ].concat(message.data.args ?? []))
          break
        default:
          this.emit('message', message)
      }
    } catch (e) {
      this.emit('error', e)
    }
  }

  private onDisconnect () {
    if (this.#commandCallbacks.size) {
      this.#commandCallbacks.clear()
    }

    this.#channel.removeListener('message', this.onMessage)
    this.#channel = null

    this.emit('disconnect')
  }

  private async handleCommandCall (reqId: string, name: string, ...args: any[]): Promise<void> {
    const response: Message = {
      cmd: 'command-result',
      resId: reqId
    }

    try {
      const result = await this.callCommand(name, ...args)
      response.ok = true

      if (result) {
        response.data = {
          result
        }
      }

    } catch (e) {
      response.ok = false
      response.data.message = e.message
    }

    return this.write(response)
  }

  private executeCommandCallback (message: Message) {
    const cb = this.#commandCallbacks.get(message.resId)

    if (!cb) {
      throw new Error(`Missing callback for request id '${message.resId}'`)
    }

    this.#commandCallbacks.delete(message.resId)
    setImmediate(() => cb(message))
  }

  private async callCommand (name: string, ...args: any[]): Promise<any> {
    const { fn, ctx } = this.#commands.get(name)

    if (!fn) {
      throw new Error(`Missing function for command '${name ?? 'none'}'`)
    }

    return fn.apply(ctx, args)
  }
}
