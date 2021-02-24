# Wormhole

This module can be used to provide handy functionality on top of remote connections
such as Inter-Process Communication (IPC). It's designed to be small and easy to
use.

It has the following features:

* Send and receive events with arbitrary arguments
* RPC-style remote command calling
* Can be used on both sides of a communication channel

Wormhole is developed with `process` and `ChildProcess` (over IPC) in mind.

## Installing

```
npm i @art-of-coding/wormhole
```

## Example

This is an attempt to write a complete example. In this example we fork a process
and then we want to communicate with it. By using wormhole on both ends, we can
send and receive events and commands in both directions.

The master process:

```js
import { fork } from 'child_process'
import Wormhole from '@art-of-coding/wormhole'

const child = fork('./example-child.js')
const wormhole = new Wormhole(child)

// Register a `startup` event handler
wormhole.events.on('startup', () => {
  console.log('received startup event!')
})

// Register an `add` command
wormhole.define('add', function (a: number, b: number) {
  return a + b
})

// Send the `quit` event to the child
setTimeout(() => wormhole.event('quit'), 5000)
```

The child process:

```js
import Wormhole from '@art-of-coding/wormhole'

const wormhole = new Wormhole(process)

// Register a `quit` event handler
wormhole.events.once('quit', () => {
  process.exit(-1)
})

// Send an event
wormhole.event('startup')

// Call a remote command
wormhole.command('add', 5, 6).then(result => {
  console.log(`5 + 6 = ${result}`)
})
```

## API

### `new Wormhole (channel)`

Instantiates a new wormhole instance.

* `channel`: The channel to use (must either be `process` or an instance of `ChildProcess`)

#### Events

A Wormhole instance is an `EventEmitter` with the following events:

* `error`: There was an error
* `message`: A received message that isn't handled by Wormhole
* `disconnect`: The channel is disconnected

### `wormhole.connected`

Returns `true` if the channel is connected.

### `wormhole.pendingCallbacks`

Returns the amount of pending command callbacks.

### `wormhole.events`

Getter to get the `events` `EventEmitter`.

```js
wormhole.events.on('some-event', () => {
  console.log('some-event emitted')
})
```

### `wormhole.define (name, fn, context)`

Define a command.

If the command is not a promise, the result will be cast into one. Throwing
an `Error` (or subclassed) results in the rejection of the promise.

* `name`: The name for this command
* `fn`: The function for this command
* `context`: The command context (optional)

```js
wormhole.define('add', function (a, b) {
  if (isNaN(a) || isNaN(b)) {
    throw new TypeError('arguments must be numbers')
  }

  return a + b
})
```

### `wormhole.event (event, ...args)`

Emit an event named `event`.

* `event`: The name of the event
* `...args`: The event arguments

### `wormhole.command (name, ...args)`

Call a remote command named `name`.

* `name`: The name of the command to call
* `...args`: The command arguments

```js
wormhole.command('add', 5, 6).then(result => {
  console.log(`5 + 6 = ${result}`)
})
```

### `wormhole.write (message)`

Writes a message over the channel.

* `message`: The message primitive or object

### `wormhole.disconnect ()`

Disconnects the channel and releases all resources. After calling this, the
instance is no longer usable.

## License

Copyright 2017-2021 [Art of Coding](http://artofcoding.nl).

This software is licensed under the [MIT License](LICENSE).
