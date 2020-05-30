const EventEmitter = require('events');

/**
 * @typedef EventEmitter
 */

// # Source
/**
 * @typedef Source
 */
function Source(emitter, emissionCallbackName) {
  this.emitter = emitter;

  this.emissionCallbackName = emissionCallbackName;

  this.events = [];
}

/**
 * Make a Source
 * @param {EventEmitter} emitter - An event emitter to listen to
 * @param {string} emissionCallbackName - The name of the exposed callback of the event listened to
 * @return {Source}
 */
Source.from = function (emitter, emissionCallbackName) {
  return new Source(emitter, emissionCallbackName);
};

/*
 * @typedef Stream
 */

/*
 * @async
 * @typedef {function} Process
 * @param {Stream} stream
 * @return {Stream}
 */

/**
 * Attach a process to the Source
 * @param {Process} downstream - The composition of processes to execute when events are emitted
 * @return {Source}
 */
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

// # Event emitters wrapper
class MergedEventEmitters extends EventEmitter {
  constructor(emitters) {
    super();

    emitters.forEach(emitter => eventEmitter(emitter).on(eventName(emitter), event => this.emit('event', event)));

    this.onevent = event => {};

    this.on('event', event => this.onevent(event));
  }
};

/**
 * @typedef Emitter
 */

/**
 * Make an Emitter
 * @param {EventEmitter} - A Node.js event emitter
 * @param {string} - The name of the event to listen to
 * @return {Emitter}
 */
function makeEmitter(eventEmitter, eventName) {
  return [eventEmitter, eventName];
}

function eventEmitter(emitter) {
  return emitter[0];
}

function eventName(emitter) {
  return emitter[1];
}

/**
 * Wrap several event emitters into one
 * @param {Emitter[]} emitters - The emitters to listen to
 * @return {EventEmitter} - The returned event emitter which exposes the callback "onevent"
 */
function mergeEvents(emitters) {
  return new MergedEventEmitters(emitters);
}

// # Stream
function makeStream(now, afterwards, source) {
  return [now, afterwards, source];
}

/**
 * @typedef AvailableStream
 */

/**
 * Retrieve the available stream
 * @param {Stream}
 * @return {AvailableStream}
 */
function now(stream) {
  return stream[0];
}

/**
 * Retrieve the future stream
 * @param {Stream}
 * @return {Promise<Stream>}
 */
async function later(stream) {
  return makeStream([await afterwards(stream), continuation(now(stream))], source(stream).events.shift(), source(stream));
}

function afterwards(stream) {
  return stream[1];
}

function source(stream) {
  return stream[2];
}

/**
 * Retrieve the value defining the event
 * @param {AvailableStream} now
 * @return {*}
 */
function value(now) {
  return now[0];
}

/**
 * Retrieve the process to execute with the next event
 * @param {AvailableStream} now
 * @return {Process}
 */
function continuation(now) {
  return now[1];
}

// # Stream operations
/**
 * Record a process to execute on the next event
 * @param {Stream}
 * @param {Process}
 * @return {Stream}
 */
function commit(stream, process) {
  if (continuation(now(stream)) === null) {
    return makeStream([value(now(stream)), process], afterwards(stream), source(stream));
  }
  else {
    return makeStream([value(now(stream)), async (futureStream) => process(await continuation(now(stream))(futureStream))],
                      afterwards(stream),
                      source(stream));
  }
}

/**
 * Attach a value to the available stream
 * @param {Stream}
 * @param {*}
 * @return {Stream}
 */
function floatOn(stream, jsValue) {
  return makeStream([jsValue, continuation(now(stream))], afterwards(stream), source(stream));
}

/**
 * Clears the process to execute on the next event
 * @param {Stream}
 * @return {Stream}
 */
function forget(stream) {
  return makeStream([value(now(stream)), null], afterwards(stream), source(stream));
}

module.exports = { commit, continuation, floatOn, forget, later, makeEmitter, mergeEvents, now, Source, value };
