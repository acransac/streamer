# Introduction
**streamer** provides an easy-to-reason-about model to process a stream of events with Node.js. There is a _source_ of events to which is attached a composition of _processes_ which see all events emitted by the source. These processes receive and output the _stream_. The latter is defined recursively as the pair of a current event with a later stream.

As a result, processes can be defined by recurring on the sequence of events, retrieving the available event from the stream and awaiting the ones coming afterwards.

To make composition easier, each process can record a variation of itself to execute on the next event carried by the stream. Also, one process can transform the value defining the event and return it to the following steps.

# How To Use Streamer
**streamer** is a small helper library. Add it to a project with:

    npm install acransac/streamer

and import the needed functionalities:

```javascript
    const { commit, continuation, floatOn, forget, later, makeEmitter, mergeEvents, now, Source, StreamerTest, value } = require('streamer');
```

## Make A Source
A `Source` is built up with `Source.from` chained with `Source.withDownstream`:
* _Source.from:: (EventEmitter, String) -> Source_
  | Parameter            | Type         | Description          |
  |----------------------|--------------|----------------------|
  | eventEmitter         | EventEmitter | A Node event emitter |
  | emissionCallbackName | String       | The name of the callback of the event to listen to, as used in the statement `eventEmitter.on('someEvent', callbackName)` |

* _Source.withDownstream:: Process -> Source_
  | Parameter  | Type    | Description |
  |------------|---------|-------------|
  | downstream | Process | The composition of processes to execute when an event is emitted |
where _Process:: async Stream -> Stream_

Example:

```javascript
    const EventEmitter = require('events');
    const { Source } = require('streamer');

    class Emitter extends EventEmitter {
      constructor() {
        super();

        this.onevent = () => {};

        this.on('event', event => this.onevent(event));
      }
    };

    const emitter = new Emitter();

    Source.from(emitter, "onevent").withDownstream(async (stream) => {
      console.log("event emitted and processed");

      return stream;
    });

    emitter.emit('event');
```

    $node example.js
    event emitted and processed

**streamer** also provides the wrapper `mergeEvents` that can merge several event emitters into one. These emitters have to be constructed with `makeEmitter`:
* _mergeEvents:: [Emitter] -> EventEmitter_
  | Parameter | Type      | Description                     |
  |-----------|-----------|---------------------------------|
  | emitters  | [Emitter] | The event emitters to listen to |
The returned event emitter exposes an emission callback named "onevent" which is used as the second parameter to `Source.from`.

* _makeEmitter:: (EventEmitter, String) -> Emitter_
  | Parameter    | Type         | Description                       |
  |--------------|--------------|-----------------------------------|
  | eventEmitter | EventEmitter | The event emitter to listen to    |
  | eventName    | String       | The name of the event listened to, as used in the statement `eventEmitter.on('eventName', someCallback)` |

Note: it is then possible to wrap an emitter that does not expose a callback into one that does with the combination of `mergeEvents` and `makeEmitter`.

Example:

```javascript
    const EventEmitter = require('events');
    const { makeEmitter, mergeEvents, Source } = require('streamer');

    const emitter1 = new EventEmitter();

    const emitter2 = new EventEmitter();

    Source.from(mergeEvents([makeEmitter(emitter1, "someEvent"), makeEmitter(emitter2, "anotherEvent")]), "onevent")
          .withDownstream(async (stream) => {
      console.log("event emitted and processed")

      return stream;
    });

    emitter1.emit('someEvent'); // or emitter2.emit('anotherEvent');
```

    $node example.js
    event emitted and processed`

## Make A Process
A process is an asynchronous function that receives and outputs a _stream_. It can be a composition of smaller such functions. From within a process, the value attached to the available event is retrieved with `value(now(stream))`. Events that are not yet produced can be awaited on with `await later(stream)`. Because the stream is defined in terms of itself, the processes lend themselves to a recursive style.

Example:
   const { later, now, Source, StreamerTest, value } = require('streamer');

   const processA = async (stream) => {
     if (value(now(stream)) > 3) {
       return stream;
     }
     else {
       console.log(value(now(stream)));

       return processA(await later(stream));
     }
   };

   const processB = async (stream) => {
     console.log("stream processed");

     return stream;
   };

   Source.from(StreamerTest.emitSequence([1, 2, 3, 4]), "onevent")
         .withDownstream(async (stream) => processB(await processA(stream)));

`$node example.js
1
2
3
stream processed`

## Make A Composition Of Processes
Complex processes are more easily defined by chaining smaller functions implementing a specific task each. One event has to pass through every step so it is not possible to await on the later stream in each of these. Instead, a function records to the stream what should be executed on the next event. The chain of future processes constitute the _continuation_.
* `commit` is used to record the next iteration of a process. It takes the stream as first argument and the function to execute later as second. It returns a stream and should be called in the return statement.
* `continuation` returns the future processing sequence from the current event passed as argument (`continuation(now(stream))`).
* `forget` clears out the continuation from the argument _stream_ and returns the latter. Used together with `continuation` in a last step of the composed process, it allows to define loops (see example).

Example:
    const { commit, continuation, forget, later, now, Source, StreamerTest, value } = require('streamer');

    const parseLetters = parsed => async (stream) => {
      if (typeof value(now(stream)) === "string" && value(now(stream)) !== "end") {
        console.log(parsed + value(now(stream)));

        return commit(stream, parseLetters(parsed + value(now(stream))));
      }
      else {
        return commit(stream, parseLetters(parsed));
      }
    };

    const sumNumbers = sum => async (stream) => {
      if (typeof value(now(stream)) === "number") {
        console.log(sum + value(now(stream)));

        return commit(stream, sumNumbers(sum + value(now(stream))));
      }
      else {
        return commit(stream, sumNumbers(sum));
      }
    };

    const loop = async (stream) => {
      if (value(now(stream)) === "end") {
        console.log("stream processed");

        return stream;
      }
      else {
        return loop(await continuation(now(stream))(forget(await later(stream))));
      }
    };

    Source.from(StreamerTest.emitSequence(["a", 1, "b", 2, "end"]), "onevent")
          .withDownstream(async (stream) => loop(await sumNumbers(0)(await parseLetters("")(stream))));

`$node example.js
a
1
ab
3
stream processed`

Note that a conditional loop structure in the middle of the chain of processes effectively filters out choosen events for the subsequent steps.

## Transform Events
One process can push a value downstream. It is done with 'floatOn' which takes the stream as first argument and the value to output as second. It returns a _stream_ and should be used in the return statement, possibly chained with `commit`.

Example:
    const { commit, continuation, floatOn, forget, later, now, Source, StreamerTest, value } = require('streamer');

    const upperCase = async (stream) => {
      if (value(now(stream)) !== "end") {
        return commit(floatOn(stream, value(now(stream)).toUpperCase()), upperCase);
      }
      else {
        return stream;
      }
    };

    const parse = parsed => async (stream) => {
      if (value(now(stream)) !== "end") {
        console.log(parsed + value(now(stream)));

        return commit(stream, parse(parsed + value(now(stream))));
      }
      else {
        return stream;
      }
    };

    const loop = async (stream) => {
      if (value(now(stream)) === "end") {
        console.log("stream processed");

        return stream;
      }
      else {
        return loop(await continuation(now(stream))(forget(await later(stream))));
      }
    };

    Source.from(StreamerTest.emitSequence(["a", "b", "c", "end"]), "onevent")
          .withDownstream(async (stream) => loop(await parse("")(await upperCase(stream))));

`$node example.js
A
AB
ABC
stream processed`

## Test The Downstream
As observed in the examples, **streamer** provides a test event emitter `StreamerTest.emitSequence` with the emission callback name being "onevent". It emits the sequence of values passed in the argument array.
