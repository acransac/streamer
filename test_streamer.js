const EventEmitter = require('events');
const { Source, now, later, value } = require('./streamer.js');
const Test = require('tester');

class SequenceEmitter extends EventEmitter {
  constructor(sequence, delay) {
    super();

    this.onevent = undefined;

    this.on('event', event => this.onevent(event));

    const emitSequence = sequence => {
      if (sequence.length === 0) {
        return;   
      }
      else {
        setTimeout(() => {
          this.emit('event', sequence[0]);

	  emitSequence(sequence.slice(1));
        }, delay ? delay : 200);
      }
    };

    emitSequence(sequence);
  }
};

function emitSequence(sequence, delay) {
  return new SequenceEmitter(sequence, delay);
}

function test_eventsStream(finish, check) {
  const simpleFlow = async (stream) => {
    if (value(now(stream)) === "end") {
      return [];
    }
    else {
      return [value(now(stream))].concat(await simpleFlow(await later(stream)));
    }
  }

  Source.from(emitSequence(["a", "b", "c", "end"]), "onevent").withDownstream(async (stream) => {
    return finish(check(Test.sameSequences(await simpleFlow(stream), ["a", "b", "c"])));
  });
}

Test.run([
  Test.makeTest(test_eventsStream, "Events Stream"),
]);
