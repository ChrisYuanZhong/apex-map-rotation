const rotationModuleUrl = new URL("./rotation.mjs", import.meta.url);
rotationModuleUrl.searchParams.set("v", window.__APEX_ASSET_VERSION__ || Date.now().toString());
const { ROTATIONS, formatCountdown, getRotationState, getUpcomingThrough } = await import(rotationModuleUrl.href);

const REPORT_REPOSITORY = "ChrisYuanZhong/apex-map-rotation";
const PLANNING_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
const ALL_MAPS = ["Broken Moon", "E-District", "Kings Canyon", "Olympus", "Storm Point", "World's Edge"];

const mapAccents = {
  "Broken Moon": "#f0ae5b",
  "E-District": "#bd7cff",
  "Kings Canyon": "#e49a55",
  Olympus: "#68a9ed",
  "Storm Point": "#53c2ad",
  "World's Edge": "#ff5a36",
};

const elements = {
  currentMap: document.querySelector("#current-map"),
  countdown: document.querySelector("#countdown"),
  currentWindow: document.querySelector("#current-window"),
  duration: document.querySelector("#mode-duration"),
  progress: document.querySelector("#progress-bar"),
  nextList: document.querySelector("#next-list"),
  timezone: document.querySelector("#timezone-label"),
  modeButtons: [...document.querySelectorAll(".mode-button")],
  updateButton: document.querySelector("#update-button"),
  dialog: document.querySelector("#update-dialog"),
  dialogClose: document.querySelector("#dialog-close"),
  reportForm: document.querySelector("#report-form"),
  reportSteps: [...document.querySelectorAll("[data-report-step]")],
  reportStepLabel: document.querySelector("#report-step-label"),
  mapOptions: document.querySelector("#map-options"),
  orderList: document.querySelector("#order-list"),
  nextRotationTime: document.querySelector("#next-rotation-time"),
  rotationDuration: document.querySelector("#rotation-duration"),
  durationUnit: document.querySelector("#duration-unit"),
  reportSummary: document.querySelector("#report-summary"),
  reportError: document.querySelector("#report-error"),
  reportBack: document.querySelector("#report-back"),
  reportNext: document.querySelector("#report-next"),
  reportSubmit: document.querySelector("#report-submit"),
};

const localZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "Your local time";
const timeFormatter = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" });
const reportDateFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "short",
});
const scheduleDayFormatter = new Intl.DateTimeFormat(undefined, {
  weekday: "short",
  month: "short",
  day: "numeric",
});

let selectedMode = window.location.hash === "#ranked" ? "ranked" : "pubs";
let reportStep = 0;
let selectedMaps = [];
let previousDurationUnit = "hours";
let upcomingRenderKey = "";

function formatWindow(start, end) {
  return `${timeFormatter.format(start)} – ${timeFormatter.format(end)}`;
}

function render() {
  const schedule = ROTATIONS[selectedMode];
  const state = getRotationState(schedule);

  document.documentElement.style.setProperty("--accent", mapAccents[state.map] || "#ff5a36");
  elements.currentMap.textContent = state.map;
  elements.countdown.textContent = formatCountdown(state.remainingMs);
  elements.countdown.setAttribute("datetime", `PT${Math.ceil(state.remainingMs / 1000)}S`);
  elements.currentWindow.textContent = formatWindow(state.startsAt, state.endsAt);
  elements.duration.textContent = `${formatDuration(schedule.durationMinutes)} rotation`;
  elements.progress.style.width = `${(state.elapsedInMapMs / state.durationMs) * 100}%`;
  elements.timezone.textContent = `${localZone} · 7 days`;

  const renderKey = `${selectedMode}|${state.endsAt.toISOString()}`;
  if (renderKey !== upcomingRenderKey) {
    renderUpcoming(schedule, state);
    upcomingRenderKey = renderKey;
  }
}

function renderUpcoming(schedule, state) {
  const now = new Date();
  const horizon = new Date(now.getTime() + PLANNING_WINDOW_MS);
  const upcoming = getUpcomingThrough(schedule, state, horizon);

  elements.nextList.replaceChildren(
    ...upcoming.map((item, index) => {
      const row = document.createElement("li");
      row.className = "next-item";
      row.innerHTML = `
        <div>
          <span class="next-position"></span>
          <span class="next-map"></span>
        </div>
        <time class="next-time"></time>
      `;
      row.querySelector(".next-position").textContent = `${index === 0 ? "Next · " : ""}${formatScheduleDay(item.startsAt, now)}`;
      row.querySelector(".next-map").textContent = item.map;
      const time = row.querySelector(".next-time");
      time.textContent = formatWindow(item.startsAt, item.endsAt);
      time.dateTime = item.startsAt.toISOString();
      return row;
    }),
  );
}

function localDateKey(date) {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function formatScheduleDay(date, now) {
  if (localDateKey(date) === localDateKey(now)) return "Today";
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (localDateKey(date) === localDateKey(tomorrow)) return "Tomorrow";
  return scheduleDayFormatter.format(date);
}

function formatDuration(minutes) {
  if (minutes < 60) return `${minutes} min`;
  const hours = minutes / 60;
  return `${Number.isInteger(hours) ? hours : hours.toFixed(1)} hr`;
}

function chooseMode(mode) {
  selectedMode = mode;
  window.history.replaceState(null, "", `#${mode}`);
  elements.modeButtons.forEach((button) => {
    const active = button.dataset.mode === mode;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  upcomingRenderKey = "";
  render();
}

function renderMapOptions() {
  elements.mapOptions.replaceChildren(
    ...ALL_MAPS.map((map) => {
      const label = document.createElement("label");
      label.className = "map-choice";
      const input = document.createElement("input");
      input.type = "checkbox";
      input.name = "report-map";
      input.value = map;
      const text = document.createElement("span");
      text.textContent = map;
      label.append(input, text);
      return label;
    }),
  );
}

function openReportDialog() {
  elements.reportForm.reset();
  selectedMaps = [];
  reportStep = 0;
  elements.reportForm.querySelector(`input[name="report-mode"][value="${selectedMode}"]`).checked = true;
  elements.nextRotationTime.value = "";
  clearReportError();
  showReportStep();
  elements.dialog.showModal();
}

function showReportStep() {
  elements.reportSteps.forEach((step, index) => {
    step.hidden = index !== reportStep;
  });
  elements.reportStepLabel.textContent = `Step ${reportStep + 1} of 4`;
  elements.reportBack.hidden = reportStep === 0;
  elements.reportNext.hidden = reportStep === 3;
  elements.reportSubmit.hidden = reportStep !== 3;

  if (reportStep === 2) {
    renderMapOrder();
    setScheduleDefaults();
  }
  if (reportStep === 3) renderReportSummary();
}

function getReportMode() {
  return elements.reportForm.querySelector('input[name="report-mode"]:checked')?.value;
}

function collectSelectedMaps() {
  return [...elements.reportForm.querySelectorAll('input[name="report-map"]:checked')].map((input) => input.value);
}

function validateReportStep() {
  clearReportError();
  if (reportStep === 0 && !getReportMode()) return showReportError("Choose pubs or ranked to continue.");

  if (reportStep === 1) {
    const maps = collectSelectedMaps();
    if (maps.length < 2) return showReportError("Select at least two maps in the rotation.");
    selectedMaps = maps;
  }

  if (reportStep === 2) {
    const startsAt = new Date(elements.nextRotationTime.value);
    const durationMinutes = getReportedDurationMinutes();
    if (Number.isNaN(startsAt.getTime())) return showReportError("Enter the date and time when the first map starts.");
    if (!Number.isInteger(durationMinutes) || durationMinutes < 15 || durationMinutes > 1440) {
      return showReportError("Enter a duration between 15 minutes and 24 hours.");
    }
  }
  return true;
}

function showReportError(message) {
  elements.reportError.textContent = message;
  elements.reportError.hidden = false;
  return false;
}

function clearReportError() {
  elements.reportError.hidden = true;
  elements.reportError.textContent = "";
}

function renderMapOrder() {
  elements.orderList.replaceChildren(
    ...selectedMaps.map((map, index) => {
      const row = document.createElement("li");
      const name = document.createElement("span");
      name.textContent = map;
      const controls = document.createElement("div");
      controls.className = "order-controls";
      const up = document.createElement("button");
      up.type = "button";
      up.textContent = "↑";
      up.setAttribute("aria-label", `Move ${map} up`);
      up.disabled = index === 0;
      up.addEventListener("click", () => moveMap(index, -1));
      const down = document.createElement("button");
      down.type = "button";
      down.textContent = "↓";
      down.setAttribute("aria-label", `Move ${map} down`);
      down.disabled = index === selectedMaps.length - 1;
      down.addEventListener("click", () => moveMap(index, 1));
      controls.append(up, down);
      row.append(name, controls);
      return row;
    }),
  );
}

function moveMap(index, direction) {
  const target = index + direction;
  [selectedMaps[index], selectedMaps[target]] = [selectedMaps[target], selectedMaps[index]];
  renderMapOrder();
}

function setScheduleDefaults() {
  const schedule = ROTATIONS[getReportMode()];
  if (!elements.nextRotationTime.value) {
    elements.nextRotationTime.value = toLocalDateTimeValue(getRotationState(schedule).endsAt);
  }
  if (!elements.rotationDuration.value) {
    elements.durationUnit.value = "hours";
    previousDurationUnit = "hours";
    elements.rotationDuration.value = schedule.durationMinutes / 60;
    updateDurationInputLimits();
  }
}

function toLocalDateTimeValue(date) {
  const pad = (number) => String(number).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function updateDurationInputLimits() {
  const minutes = elements.durationUnit.value === "minutes";
  elements.rotationDuration.min = minutes ? "15" : "0.25";
  elements.rotationDuration.max = minutes ? "1440" : "24";
  elements.rotationDuration.step = minutes ? "5" : "0.25";
}

function changeDurationUnit() {
  const value = Number(elements.rotationDuration.value);
  if (Number.isFinite(value)) {
    if (previousDurationUnit === "hours" && elements.durationUnit.value === "minutes") {
      elements.rotationDuration.value = Math.round(value * 60);
    } else if (previousDurationUnit === "minutes" && elements.durationUnit.value === "hours") {
      elements.rotationDuration.value = Number((value / 60).toFixed(2));
    }
  }
  previousDurationUnit = elements.durationUnit.value;
  updateDurationInputLimits();
}

function getReportedDurationMinutes() {
  const value = Number(elements.rotationDuration.value);
  if (!Number.isFinite(value)) return Number.NaN;
  return Math.round(elements.durationUnit.value === "hours" ? value * 60 : value);
}

function getReport() {
  return {
    version: 1,
    mode: getReportMode(),
    maps: [...selectedMaps],
    startsAt: new Date(elements.nextRotationTime.value).toISOString(),
    durationMinutes: getReportedDurationMinutes(),
  };
}

function renderReportSummary() {
  const report = getReport();
  const entries = [
    ["Mode", ROTATIONS[report.mode].label],
    ["Map order", report.maps.join(" → ")],
    ["First map starts", reportDateFormatter.format(new Date(report.startsAt))],
    ["Duration", `${formatDuration(report.durationMinutes)} per map`],
  ];
  elements.reportSummary.replaceChildren(
    ...entries.flatMap(([term, detail]) => {
      const dt = document.createElement("dt");
      dt.textContent = term;
      const dd = document.createElement("dd");
      dd.textContent = detail;
      return [dt, dd];
    }),
  );
}

function buildIssueUrl(report) {
  const label = ROTATIONS[report.mode].label;
  const localStart = reportDateFormatter.format(new Date(report.startsAt));
  const machineReport = JSON.stringify(report);
  const body = `## Schedule report

**Mode:** ${label}
**Map order:** ${report.maps.join(" → ")}
**First map starts:** ${localStart} (${localZone})
**Start time in UTC:** ${report.startsAt}
**Duration:** ${formatDuration(report.durationMinutes)} per map

The first listed map begins at the reported start time. This report expires after 45 days.

<!-- apex-rotation-report ${machineReport} -->`;
  const parameters = new URLSearchParams({
    title: `[Schedule report] ${label} rotation`,
    body,
  });
  return `https://github.com/${REPORT_REPOSITORY}/issues/new?${parameters}`;
}

elements.modeButtons.forEach((button) => {
  button.addEventListener("click", () => chooseMode(button.dataset.mode));
});

elements.reportForm.querySelectorAll('input[name="report-mode"]').forEach((input) => {
  input.addEventListener("change", () => {
    elements.nextRotationTime.value = "";
    elements.rotationDuration.value = "";
  });
});

elements.updateButton.addEventListener("click", openReportDialog);
elements.dialogClose.addEventListener("click", () => elements.dialog.close());
elements.reportBack.addEventListener("click", () => {
  reportStep -= 1;
  clearReportError();
  showReportStep();
});
elements.reportNext.addEventListener("click", () => {
  if (!validateReportStep()) return;
  reportStep += 1;
  showReportStep();
});
elements.durationUnit.addEventListener("change", changeDurationUnit);
elements.reportForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const report = getReport();
  window.location.assign(buildIssueUrl(report));
});

renderMapOptions();
chooseMode(selectedMode);
window.setInterval(render, 1000);
