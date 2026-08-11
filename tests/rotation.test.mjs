import assert from "node:assert/strict";
import test from "node:test";

import { ROTATIONS, formatCountdown, getRotationState, getUpcoming } from "../rotation.mjs";

test("pubs starts on Storm Point at the PT anchor", () => {
  const state = getRotationState(ROTATIONS.pubs, new Date("2026-08-11T11:30:00-07:00"));
  assert.equal(state.map, "Storm Point");
  assert.equal(formatCountdown(state.remainingMs), "01:30:00");
});

test("pubs advances every 90 minutes and loops", () => {
  assert.equal(getRotationState(ROTATIONS.pubs, new Date("2026-08-11T13:00:00-07:00")).map, "E-District");
  assert.equal(getRotationState(ROTATIONS.pubs, new Date("2026-08-11T14:30:00-07:00")).map, "World's Edge");
  assert.equal(getRotationState(ROTATIONS.pubs, new Date("2026-08-11T16:00:00-07:00")).map, "Storm Point");
});

test("ranked advances every 4.5 hours and loops", () => {
  assert.equal(getRotationState(ROTATIONS.ranked, new Date("2026-08-11T13:00:00-07:00")).map, "World's Edge");
  assert.equal(getRotationState(ROTATIONS.ranked, new Date("2026-08-11T17:30:00-07:00")).map, "Storm Point");
  assert.equal(getRotationState(ROTATIONS.ranked, new Date("2026-08-11T22:00:00-07:00")).map, "E-District");
  assert.equal(getRotationState(ROTATIONS.ranked, new Date("2026-08-12T02:30:00-07:00")).map, "World's Edge");
});

test("upcoming entries include localizable Date instances", () => {
  const state = getRotationState(ROTATIONS.ranked, new Date("2026-08-11T14:00:00-07:00"));
  const upcoming = getUpcoming(ROTATIONS.ranked, state);
  assert.deepEqual(upcoming.map((entry) => entry.map), ["Storm Point", "E-District"]);
  assert.equal(upcoming[0].startsAt.toISOString(), "2026-08-12T00:30:00.000Z");
});

test("countdown formatting is stable at boundaries", () => {
  assert.equal(formatCountdown(0), "00:00:00");
  assert.equal(formatCountdown(3_600_000), "01:00:00");
  assert.equal(formatCountdown(3_600_001), "01:00:01");
});
