/// <reference types="node" />

import { ChildProcess } from 'child_process'
import { EventEmitter } from 'events'

declare class Wormhole {
  /**
   * Instantiates a new Wormhole instance for `process` or the given `ChildProcess`.
   * @param  {NodeJS.Process|ChildProcess} channel The channel to use
   * @return {Wormhole}                            The new Wormhole instance
   */
  public constructor (channel?: NodeJS.Process|ChildProcess)

  /**
   * The connection state.
   * @return {boolean} True if the channel is connected
   */
  public get connected (): boolean

  /**
   * The amount of pending command callbacks
   * @return {number} Number of pending callbacks
   */
  public get pendingCallbacks (): number

  /**
   * Getter to get the events `EventEmitter`.
   * @return {EventEmitter} The events emitter
   */
  public get events (): EventEmitter

  /**
   * Defines a command so it can be called from the other side.
   * @param  {String}   name    The name of the command
   * @param  {Function} fn      The command itself
   * @param  {any}      context The command context
   */
  public define (name: string, fn: Function, context: any): void

  /**
   * Writes an event with optional arguments.
   * @param  {String}  name The name of the event
   * @param  {any}  ...args The event arguments
   * @return {Promise}      Resolves when the event is sent
   */
  public event (name: string, ...args: any[]): Promise<void>

  /**
   * Calls a command from the other side.
   * @param  {String}  name The name of the command
   * @param  {any}  ...args The command arguments
   * @return {Promise}      Resolves with the result
   */
  public command (name: string, ...args: any[]): Promise<any>

  /**
   * Writes a message over the channel.
   * @param  {*} message The message to send
   */
  public write (message: any): Promise<void>

  /**
   * Disconnects the channel.
   */
  public disconnect (): void

  // Private

  private _onMessage (message: any): void
  private _executeCommandCallback (message: any)
  private _handleCommandCall (name: string, args: any[], id: string): Promise<void>
  private _call (name: string, args: any[]): Promise<any>
  private _onDisconnect (): void
}

export = Wormhole
