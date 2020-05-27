Introduction
------------
**streamer** provides an easy-to-reason-about model to process a stream of events with Node.js. There is a _Source_ of events to which is attached a composition of processes, the _Downstream_, which sees all events emitted by the source. These processes receive and output the _stream_. The latter models the sequence of events as follows:

[Graph of the now and afterwards events]

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
* `Source.withDownstream` takes an asynchronous function whose input and output are _streams_.

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
## Make A Composition Of Processes
## Transform Events
## Reuse Patterns
(Loop, Filter, Parser)
## Test Your Downstream
