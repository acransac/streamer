const EventEmitter = require('events');

class SequenceEmitter extends EventEmitter {
  constructor(sequence, delay) {
    super();

    this.onevent = () => {};

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

module.exports = { emitSequence: emitSequence };
