Introduction
------------
**streamer** provides an easy-to-reason-about model to process a stream of events with Node.js. There is a _Source_ of events to which is attached a composition of processes, the _Downstream_, which sees all events emitted by the source. These processes receive and output the _stream_. The latter models the sequence of events as follows:

[Graph of the now and afterwards events]

As a result, processes can be defined by recurring on the sequence of events, retrieving the available event from the stream and awaiting on the ones coming afterwards.

To make composition easier, the downstream can be defined step by step with each process having the possibility to record a variation of itself to execute on the next event carried by the stream. Also, one process can transform the value defining the event and return it to the following steps.

How To Use Streamer
-------------------
**streamer** is a small helper library. Add it to your project with:
    npm install acransac/streamer

and import the functionalities you need:
    const { commit, continuation, floatOn, forget, later, makeEmitter, mergeEvents, now, Source, StreamerTest, value } = require('streamer');

## Make A Source
## Make A Process
## Make A Composition Of Processes
## Transform Events
## Reuse Patterns
(Loop, Filter, Parser)
## Test Your Downstream
