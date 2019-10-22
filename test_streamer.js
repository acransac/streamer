const EventEmitter = require('events');
const { Source, makeEmitter, mergeEvents, now, later, value, floatOn, commit, continuation, forget } = require('./streamer.js');
const Test = require('tester');

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

function test_floatOn(finish, check) {
  const floatValue = async (stream) => floatOn(stream, "b");

  Source.from(emitSequence(["a"]), "onevent").withDownstream(async (stream) => {
    return finish(check(value(now(await floatValue(stream))) === "b"));
  });
}

function test_continuation(finish, check) {
  const again = async (stream) => {
    if (value(now(stream)) === "end") {
      return finish();
    }
    else {
      return again(await continuation(now(stream))(forget(await later(stream))));
    }
  };

  const interleave = separator => {
    const joiner = joined => async (stream) => {
      if (value(now(stream)) === "end") {
	check(joined === `a${separator}b${separator}c${separator}`);

        return stream;
      }
      else {
        return commit(stream, joiner(`${joined}${value(now(stream))}${separator}`));
      }
    };

    return joiner("");
  };

  Source.from(emitSequence(["a", "b", "c", "end"]), "onevent").withDownstream(async (stream) => {
    return again(await interleave("O")(await interleave("T")(stream)));
  });
}

function test_mergeEvents(finish, check) {
  const simpleFlow = async (stream) => {
    if (value(now(stream)) === "end") {
      return [];
    }
    else {
      return [value(now(stream))].concat(await simpleFlow(await later(stream)));
    }
  }

  Source.from(mergeEvents([makeEmitter(emitSequence(["a", "b", "c", "end"], 200), "event"),
                           makeEmitter(emitSequence(["x", "y", "z", "end"], 210), "event")]), "onevent")
        .withDownstream(async (stream) => {
    return finish(check(Test.sameSequences(await simpleFlow(stream), ["a", "x", "b", "y", "c", "z"])));
  });
}

Test.run([
  Test.makeTest(test_eventsStream, "Events Stream"),
  Test.makeTest(test_floatOn, "Float Value"),
  Test.makeTest(test_continuation, "Continuation"),
  Test.makeTest(test_mergeEvents, "Merge Events"),
]);
