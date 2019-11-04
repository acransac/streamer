const { Source, makeEmitter, mergeEvents, now, later, value, floatOn, commit, continuation, forget } = require('./streamer.js');
const Test = require('tester');
const StreamerTest = require('./testutils.js');

function test_eventsStream(finish, check) {
  const simpleFlow = async (stream) => {
    if (value(now(stream)) === "end") {
      return [];
    }
    else {
      return [value(now(stream))].concat(await simpleFlow(await later(stream)));
    }
  }

  Source.from(StreamerTest.emitSequence(["a", "b", "c", "end"]), "onevent").withDownstream(async (stream) => {
    return finish(check(Test.sameSequences(await simpleFlow(stream), ["a", "b", "c"])));
  });
}

function test_floatOn(finish, check) {
  const floatValue = async (stream) => floatOn(stream, "b");

  Source.from(StreamerTest.emitSequence(["a"]), "onevent").withDownstream(async (stream) => {
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

  Source.from(StreamerTest.emitSequence(["a", "b", "c", "end"]), "onevent").withDownstream(async (stream) => {
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

  Source.from(mergeEvents([makeEmitter(StreamerTest.emitSequence(["a", "b", "c", "end"], 200), "event"),
                           makeEmitter(StreamerTest.emitSequence(["x", "y", "z", "end"], 210), "event")]), "onevent")
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
