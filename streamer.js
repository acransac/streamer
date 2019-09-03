function Source(emitter, emissionCallbackName) {
  this.emitter = emitter;

  this.emissionCallbackName = emissionCallbackName;
}

Source.from = function (eventEmitter, emissionCallbackName) {
  return new Source(eventEmitter, emissionCallbackName);
};

Source.prototype.withDownstream = function (continuation) {
  this.emitter[this.emissionCallbackName] = (value) => continuation(makeStream([value, null], new Promise((resolve) => {
    this.emitter[this.emissionCallbackName] = (value) => resolve(value);
  }), this));

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
  return makeStream([await afterwards(stream), continuation(now(stream))], new Promise((resolve) => {
    source(stream).emitter[source(stream).emissionCallbackName] = (value) => resolve(value);
  }), source(stream));
}

function floatOn(stream, jsValue) {
  return makeStream([jsValue, continuation(now(stream))], afterwards(stream), source(stream));
}

function commit(stream, contract) {
  if (continuation(now(stream)) === null) {
    return makeStream([value(now(stream)), contract], afterwards(stream), source(stream));
  }
  else {
    return makeStream([value(now(stream)), async (futureStream) => contract(await continuation(now(stream))(futureStream))], afterwards(stream), source(stream));
  }
}

function IO(procedure, ioChannel) {
  return (stream) => procedure(ioChannel)(stream);
}

module.exports = { Source, now, later, value, continuation, floatOn, commit, IO };
