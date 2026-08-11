export const ROTATIONS = Object.freeze({
  pubs: Object.freeze({
    label: "Pubs",
    anchor: "2026-08-11T11:30:00-07:00",
    durationMinutes: 90,
    maps: Object.freeze(["Storm Point", "E-District", "World's Edge"]),
  }),
  ranked: Object.freeze({
    label: "Ranked",
    anchor: "2026-08-11T13:00:00-07:00",
    durationMinutes: 270,
    maps: Object.freeze(["World's Edge", "Storm Point", "E-District"]),
  }),
});

const positiveModulo = (value, divisor) => ((value % divisor) + divisor) % divisor;

export function getRotationState(schedule, now = new Date()) {
  const anchorMs = new Date(schedule.anchor).getTime();
  const durationMs = schedule.durationMinutes * 60 * 1000;
  const cycleMs = schedule.maps.length * durationMs;
  const elapsedMs = now.getTime() - anchorMs;
  const cycleOffsetMs = positiveModulo(elapsedMs, cycleMs);
  const index = Math.floor(cycleOffsetMs / durationMs);
  const elapsedInMapMs = cycleOffsetMs - index * durationMs;
  const remainingMs = durationMs - elapsedInMapMs;
  const currentStartMs = now.getTime() - elapsedInMapMs;

  return {
    index,
    map: schedule.maps[index],
    elapsedInMapMs,
    remainingMs,
    durationMs,
    startsAt: new Date(currentStartMs),
    endsAt: new Date(currentStartMs + durationMs),
  };
}

export function getUpcoming(schedule, state, count = 2) {
  return Array.from({ length: count }, (_, offset) => {
    const index = (state.index + offset + 1) % schedule.maps.length;
    const startsAt = new Date(state.endsAt.getTime() + offset * state.durationMs);

    return {
      map: schedule.maps[index],
      startsAt,
      endsAt: new Date(startsAt.getTime() + state.durationMs),
    };
  });
}

export function getUpcomingThrough(schedule, state, horizon) {
  const availableMs = horizon.getTime() - state.endsAt.getTime();
  if (availableMs <= 0) return [];
  const count = Math.ceil(availableMs / state.durationMs);
  return getUpcoming(schedule, state, count).filter((entry) => entry.startsAt < horizon);
}

export function formatCountdown(milliseconds) {
  const totalSeconds = Math.max(0, Math.ceil(milliseconds / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return [hours, minutes, seconds].map((part) => String(part).padStart(2, "0")).join(":");
}
