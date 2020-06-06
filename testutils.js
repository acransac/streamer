// Copyright (c) Adrien Cransac
// License: MIT

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

/*
 * Make an event emitter with a predefined sequence of events
 * @param {*[]} sequence - The values to emit
 * @param {number} [delay=200] - The time interval in ms between two events
 * @return {EventEmitter}
 */
function emitSequence(sequence, delay) {
  return new SequenceEmitter(sequence, delay);
}

module.exports = { emitSequence: emitSequence };
