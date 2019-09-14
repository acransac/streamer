const EventEmitter = require('events');
const Readline = require('readline');
const { Source, now, later, value } = require('./streamer.js');

class dummyEventEmitter extends EventEmitter {
  constructor() {
    super();

    this.onevent = undefined;

    this.on('event', (event) => this.onevent(event));
  }
};

initialize();

function initialize() {
  const repl = Readline.createInterface({ input: process.stdin });

  const events = new dummyEventEmitter();

  repl.on('line', (line) => events.emit('event', line));

  Source.from(events, "onevent").withDownstream(test);
}

async function test(stream) {
  if (value(now(stream)) === 'a') {
    console.log('GOOD');

    return test(await later(stream));
  }

  return test(await later(stream));
}
