const EventEmitter = require('events');
const { Source, now, later, value } = require('./streamer.js');

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

initialize();

function initialize() {
  Source.from(emitSequence(["a", "b"]), "onevent").withDownstream(test);
}

async function test(stream) {
  console.log(value(now(stream)));

  return test(await later(stream));
}
