import { ROTATIONS, formatCountdown, getRotationState, getUpcoming } from "./rotation.mjs";

const mapAccents = {
  "Storm Point": "#53c2ad",
  "E-District": "#bd7cff",
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
};

const localZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "Your local time";
const timeFormatter = new Intl.DateTimeFormat(undefined, {
  hour: "numeric",
  minute: "2-digit",
});

let selectedMode = window.location.hash === "#ranked" ? "ranked" : "pubs";

function formatWindow(start, end) {
  return `${timeFormatter.format(start)} – ${timeFormatter.format(end)}`;
}

function render() {
  const schedule = ROTATIONS[selectedMode];
  const state = getRotationState(schedule);
  const upcoming = getUpcoming(schedule, state, 2);

  document.documentElement.style.setProperty("--accent", mapAccents[state.map]);
  elements.currentMap.textContent = state.map;
  elements.countdown.textContent = formatCountdown(state.remainingMs);
  elements.countdown.setAttribute("datetime", `PT${Math.ceil(state.remainingMs / 1000)}S`);
  elements.currentWindow.textContent = formatWindow(state.startsAt, state.endsAt);
  elements.duration.textContent = `${schedule.durationMinutes / 60 === 1.5 ? "90 min" : "4.5 hr"} rotation`;
  elements.progress.style.width = `${(state.elapsedInMapMs / state.durationMs) * 100}%`;
  elements.timezone.textContent = localZone;

  elements.nextList.replaceChildren(
    ...upcoming.map((item, index) => {
      const row = document.createElement("li");
      row.className = "next-item";
      row.innerHTML = `
        <div>
          <span class="next-position">${index === 0 ? "Next" : "Then"}</span>
          <span class="next-map"></span>
        </div>
        <time class="next-time"></time>
      `;
      row.querySelector(".next-map").textContent = item.map;
      const time = row.querySelector(".next-time");
      time.textContent = formatWindow(item.startsAt, item.endsAt);
      time.dateTime = item.startsAt.toISOString();
      return row;
    }),
  );
}

function chooseMode(mode) {
  selectedMode = mode;
  window.history.replaceState(null, "", `#${mode}`);
  elements.modeButtons.forEach((button) => {
    const active = button.dataset.mode === mode;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  render();
}

elements.modeButtons.forEach((button) => {
  button.addEventListener("click", () => chooseMode(button.dataset.mode));
});

chooseMode(selectedMode);
window.setInterval(render, 1000);
