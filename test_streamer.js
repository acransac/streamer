// Copyright (c) Adrien Cransac
// License: MIT

const { commit, continuation, floatOn, forget, later, makeEmitter, mergeEvents, now, Source, value } = require('./streamer.js');
const Test = require('@acransac/tester');
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
    return finish(check(sameSequences(await simpleFlow(stream), ["a", "b", "c"])));
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
    return finish(check(sameSequences(await simpleFlow(stream), ["a", "x", "b", "y", "c", "z"])));
  });
}

function sameSequences(sequenceA, sequenceB) {
  const equalSequences = (sequenceA, sequenceB) => {
    if (sequenceA.length === 0) {
      return true;
    }
    else if (sequenceA[0] !== sequenceB[0]) {
      return false;
    }
    else {
      return equalSequences(sequenceA.slice(1), sequenceB.slice(1));
    }
  };

  return sequenceA.length === sequenceB.length && equalSequences(sequenceA, sequenceB);
}

Test.run([
  Test.makeTest(test_eventsStream, "Events Stream"),
  Test.makeTest(test_floatOn, "Float Value"),
  Test.makeTest(test_continuation, "Continuation"),
  Test.makeTest(test_mergeEvents, "Merge Events"),
]);
