Introduction
------------
**streamer** provides an easy-to-reason-about model to process a stream of events with Node.js. There is a _Source_ of events to which is attached a composition of processes, the _Downstream_, which sees all events emitted by the source. These processes receive and output the _stream_. The latter is defined recursively as the pair of a current event with a later stream.

As a result, processes can be defined by recurring on the sequence of events, retrieving the available event from the stream and awaiting on the ones coming afterwards.

To make processing easier, the downstream can be defined step by step with each process having the possibility to record a variation of itself to execute on the next event carried by the stream. Also, one process can transform the value defining the event and return it to the following steps.

How To Use Streamer
-------------------
**streamer** is a small helper library. Add it to a project with:
    npm install acransac/streamer

and import the needed functionalities:
    const { commit, continuation, floatOn, forget, later, makeEmitter, mergeEvents, now, Source, StreamerTest, value } = require('streamer');

## Make A Source;
A _Source_ is built up with `Source.from` chained with `Source.withDownstream`:
* `Source.from` takes an `ÈventEmitter` and the name of the callback of the event to listen to, as used in the statement `eventEmitter.on('someEvent', callbackName)`.
* `Source.withDownstream` takes a process, that is an asynchronous function whose input and output are _streams_.

Here is an example:
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

`$node example.js
event emitted and processed`

**streamer** also provides the wrapper `mergeEvents` that can merge several event emitters into one whose emission callback is `onevent`.
`mergeEvents` takes an array of emitters constructed with `makeEmitter`. The latter's arguments are the event emitter and the name of the event, as used in the statement `eventEmitter.on('eventName', someCallback)`.
It is then possible to wrap an emitter that does not expose a callback into one that does with the combination of `mergeEvents` and `makeEmitter`.

Example:
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

`$node example.js
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

## Transform Events
## Reuse Patterns
(Loop, Filter, Parser)
## Test Your Downstream
