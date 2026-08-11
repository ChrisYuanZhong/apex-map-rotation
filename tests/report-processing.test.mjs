import assert from "node:assert/strict";
import test from "node:test";

import {
  REPORT_LIFETIME_DAYS,
  canonicalReportKey,
  isExpired,
  parseReport,
  replaceSchedule,
  validateReport,
} from "../.github/scripts/process-report.mjs";

const report = {
  version: 1,
  mode: "pubs",
  maps: ["World's Edge", "Olympus", "Storm Point"],
  startsAt: "2026-08-12T20:00:00.000Z",
  durationMinutes: 120,
};

test("parses and validates a machine-readable report", () => {
  const body = `Human summary\n\n<!-- apex-rotation-report ${JSON.stringify(report)} -->`;
  assert.deepEqual(parseReport(body), report);
  assert.equal(validateReport(report), true);
});

test("rejects duplicate or unknown maps and invalid duration", () => {
  assert.equal(validateReport({ ...report, maps: ["Olympus", "Olympus"] }), false);
  assert.equal(validateReport({ ...report, maps: ["Olympus", "Not a map"] }), false);
  assert.equal(validateReport({ ...report, durationMinutes: 0 }), false);
});

test("canonical key includes mode, order, time, and duration", () => {
  assert.notEqual(canonicalReportKey(report), canonicalReportKey({ ...report, durationMinutes: 90 }));
  assert.notEqual(canonicalReportKey(report), canonicalReportKey({ ...report, maps: [...report.maps].reverse() }));
});

test("replaces only the reported schedule block", () => {
  const source = `export const ROTATIONS = Object.freeze({
  pubs: Object.freeze({
    label: "Pubs",
    anchor: "2026-01-01T00:00:00.000Z",
    durationMinutes: 90,
    maps: Object.freeze(["Olympus", "Storm Point"]),
  }),
  ranked: Object.freeze({
    label: "Ranked",
    anchor: "2026-01-02T00:00:00.000Z",
    durationMinutes: 270,
    maps: Object.freeze(["Kings Canyon", "Broken Moon"]),
  }),
});`;
  const updated = replaceSchedule(source, report);
  assert.match(updated, /anchor: "2026-08-12T20:00:00.000Z"/);
  assert.match(updated, /durationMinutes: 120/);
  assert.match(updated, /maps: Object\.freeze\(\["World's Edge","Olympus","Storm Point"\]\)/);
  assert.match(updated, /anchor: "2026-01-02T00:00:00.000Z"/);
});

test(`reports expire after ${REPORT_LIFETIME_DAYS} days`, () => {
  const issue = { created_at: "2026-01-01T00:00:00.000Z" };
  assert.equal(isExpired(issue, new Date("2026-02-14T23:59:59.999Z")), false);
  assert.equal(isExpired(issue, new Date("2026-02-15T00:00:00.000Z")), true);
});
