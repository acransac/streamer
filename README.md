Introduction
------------
**streamer** provides an easy-to-reason-about model of a stream of events. There is a _Source_ of events to which is attached a composition of processes, the _Downstream_, which sees all events emitted by the source. These processes receive and output the _stream_. The latter models the sequence of events as follows:

[Graph of the now and afterwards events]

As a result, processes can be defined by recurring on the sequence of events, retrieving the available value from the stream and awaiting on the ones coming afterwards.

To make composition easier, the downstream can be defined step by step with each process having the possibility to record a variation of itself 
