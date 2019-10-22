const EventEmitter = require('events');

function Source(emitter, emissionCallbackName) {
  this.emitter = emitter;

  this.emissionCallbackName = emissionCallbackName;

  this.events = [];
}

Source.from = function (emitter, emissionCallbackName) {
  return new Source(emitter, emissionCallbackName);
};

Source.prototype.withDownstream = function (downstream) {
  const handleNextEvent = () => {
    this.events = [...this.events, new Promise(resolve => {
      this.emitter[this.emissionCallbackName] = value => {
        handleNextEvent();

        resolve(value);
      };
    })];
  };

  this.emitter[this.emissionCallbackName] = value => {
    handleNextEvent();

    return downstream(makeStream([value, null], this.events.shift(), this));
  };

  return this;
};

function makeStream(now, afterwards, source) {
  return [now, afterwards, source];
}

function now(stream) {
  return stream[0];
}

function afterwards(stream) {
  return stream[1];
}

function source(stream) {
  return stream[2];
}

function value(now) {
  return now[0];
}

function continuation(now) {
  return now[1];
}

async function later(stream) {
  return makeStream([await afterwards(stream), continuation(now(stream))], source(stream).events.shift(), source(stream));
}

function floatOn(stream, jsValue) {
  return makeStream([jsValue, continuation(now(stream))], afterwards(stream), source(stream));
}

function commit(stream, contract) {
  if (continuation(now(stream)) === null) {
    return makeStream([value(now(stream)), contract], afterwards(stream), source(stream));
  }
  else {
    return makeStream([value(now(stream)), async (futureStream) => contract(await continuation(now(stream))(futureStream))],
	              afterwards(stream),
	              source(stream));
  }
}

function forget(stream) {
  return makeStream([value(now(stream)), null], afterwards(stream), source(stream));
}

class MergedEventEmitters extends EventEmitter {
  constructor(emitters) {
    super();

    emitters.forEach(emitter => emitter[0].on(emitter[1], event => this.emit('event', event)));

    this.onevent = event => {};

    this.on('event', event => this.onevent(event));
  }
};

function mergeEvents(emitters) {
  return new MergedEventEmitters(emitters);
}

module.exports = { Source, mergeEvents, now, later, value, continuation, floatOn, commit, forget };
