# Change Log
This project adheres to [Semantic Versioning](http://semver.org/).

## 0.5.0

* Add `context` parameter to `define()` and `defineCommand()`
* Use `shortid` for validation in `CommandCallbackMap`
* Simplify command callback handling

## 0.4.0

* Add `pendingCommands`
* Add type check to `event`

## 0.3.0

* Refactor `_dispatchCommand`
* Refactor message listener
* Emit error when an invalid message id is received
* Move disconnect/destroy logic to separate method
* Collapse `stringifyJson` and `parseJson` options

## 0.2.0

* Add `define()` alias for `defineCommand()`
* Option to parse/stringify JSON on send/receive
* Option to define the `message` and `disconnect` event names

## 0.1.1

* Simplify some error handling
* Don't send empty argument array on events
* Don't send empty argument array on commands

## 0.1.0
* Initial release
