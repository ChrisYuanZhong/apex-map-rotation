import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { ROTATIONS } from "../../rotation.mjs";

export const REPORT_LIFETIME_DAYS = 45;
export const ALLOWED_MAPS = Object.freeze([
  "Broken Moon",
  "E-District",
  "Kings Canyon",
  "Olympus",
  "Storm Point",
  "World's Edge",
]);

const REPORT_MARKER = /<!-- apex-rotation-report (\{[^\n]+\}) -->/;
const REPORT_TITLE = "[Schedule report]";
const DAY_MS = 24 * 60 * 60 * 1000;

export function parseReport(body = "") {
  const match = body.match(REPORT_MARKER);
  if (!match) return null;
  try {
    return JSON.parse(match[1]);
  } catch {
    return null;
  }
}

export function validateReport(report) {
  if (!report || report.version !== 1) return false;
  if (!Object.hasOwn(ROTATIONS, report.mode)) return false;
  if (!Array.isArray(report.maps) || report.maps.length < 2 || report.maps.length > ALLOWED_MAPS.length) return false;
  if (new Set(report.maps).size !== report.maps.length) return false;
  if (!report.maps.every((map) => ALLOWED_MAPS.includes(map))) return false;
  if (!Number.isInteger(report.durationMinutes) || report.durationMinutes < 15 || report.durationMinutes > 1440) return false;
  const startsAt = new Date(report.startsAt);
  return !Number.isNaN(startsAt.getTime()) && startsAt.toISOString() === report.startsAt;
}

export function canonicalReportKey(report) {
  return [report.mode, report.maps.join("→"), new Date(report.startsAt).toISOString(), report.durationMinutes].join("|");
}

export function replaceSchedule(source, report) {
  const blockPattern = new RegExp(`  ${report.mode}: Object\\.freeze\\(\\{[\\s\\S]*?\\n  \\}\\),`);
  const block = source.match(blockPattern)?.[0];
  if (!block) throw new Error(`Could not find the ${report.mode} schedule block.`);

  const updatedBlock = block
    .replace(/anchor: "[^"]+"/, `anchor: "${report.startsAt}"`)
    .replace(/durationMinutes: \d+/, `durationMinutes: ${report.durationMinutes}`)
    .replace(/maps: Object\.freeze\(\[[^\]]*\]\)/, `maps: Object.freeze(${JSON.stringify(report.maps)})`);

  return source.replace(blockPattern, updatedBlock);
}

export function isExpired(issue, now = new Date()) {
  return now.getTime() - new Date(issue.created_at).getTime() >= REPORT_LIFETIME_DAYS * DAY_MS;
}

function sameAsCurrent(report) {
  const current = ROTATIONS[report.mode];
  return (
    new Date(current.anchor).toISOString() === report.startsAt &&
    current.durationMinutes === report.durationMinutes &&
    current.maps.join("|") === report.maps.join("|")
  );
}

async function api(path, options = {}) {
  const response = await fetch(`https://api.github.com${path}`, {
    ...options,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
      "X-GitHub-Api-Version": "2022-11-28",
      ...options.headers,
    },
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`GitHub API ${response.status}: ${text}`);
  return text ? JSON.parse(text) : null;
}

async function getOpenIssues(repository) {
  const issues = [];
  for (let page = 1; page <= 5; page += 1) {
    const batch = await api(`/repos/${repository}/issues?state=open&per_page=100&page=${page}`);
    issues.push(...batch.filter((issue) => !issue.pull_request));
    if (batch.length < 100) break;
  }
  return issues;
}

async function comment(repository, issueNumber, body) {
  await api(`/repos/${repository}/issues/${issueNumber}/comments`, {
    method: "POST",
    body: JSON.stringify({ body }),
  });
}

async function closeIssue(repository, issueNumber) {
  await api(`/repos/${repository}/issues/${issueNumber}`, {
    method: "PATCH",
    body: JSON.stringify({ state: "closed", state_reason: "completed" }),
  });
}

async function expireOldReports(repository, issues, now) {
  for (const issue of issues) {
    if (!issue.title.startsWith(REPORT_TITLE) || !validateReport(parseReport(issue.body)) || !isExpired(issue, now)) continue;
    await comment(repository, issue.number, "This schedule report has expired after 45 days and no longer counts toward consensus.");
    await closeIssue(repository, issue.number);
  }
}

function updateFiles(report, now) {
  const rotationPath = resolve("rotation.mjs");
  const indexPath = resolve("index.html");
  const rotationSource = readFileSync(rotationPath, "utf8");
  writeFileSync(rotationPath, replaceSchedule(rotationSource, report));

  const isoDate = now.toISOString().slice(0, 10);
  const displayDate = new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  }).format(now);
  const indexSource = readFileSync(indexPath, "utf8");
  writeFileSync(
    indexPath,
    indexSource.replace(
      /Last updated: <time datetime="[^"]+">[^<]+<\/time>/,
      `Last updated: <time datetime="${isoDate}">${displayDate}</time>`,
    ),
  );
}

function commitUpdate(report) {
  const label = ROTATIONS[report.mode].label;
  execFileSync("git", ["config", "user.name", "github-actions[bot]"]);
  execFileSync("git", ["config", "user.email", "41898282+github-actions[bot]@users.noreply.github.com"]);
  execFileSync("git", ["add", "rotation.mjs", "index.html"]);
  execFileSync("git", ["commit", "-m", `Update ${label} rotation from matching reports`], { stdio: "inherit" });
  execFileSync("git", ["push", "origin", "HEAD:main"], { stdio: "inherit" });
  return execFileSync("git", ["rev-parse", "--short", "HEAD"], { encoding: "utf8" }).trim();
}

async function main() {
  const event = JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, "utf8"));
  const repository = process.env.GITHUB_REPOSITORY;
  const now = new Date();
  const issues = await getOpenIssues(repository);
  await expireOldReports(repository, issues, now);

  const currentIssue = event.issue;
  if (!currentIssue || !currentIssue.title.startsWith(REPORT_TITLE)) return;

  const report = parseReport(currentIssue.body);
  if (!validateReport(report)) {
    await comment(repository, currentIssue.number, "This report could not be validated. Please submit it again from the Update flow on the site.");
    await closeIssue(repository, currentIssue.number);
    return;
  }

  const key = canonicalReportKey(report);
  const eligible = issues.filter((issue) => {
    const parsed = parseReport(issue.body);
    return issue.number !== currentIssue.number && !isExpired(issue, now) && validateReport(parsed) && canonicalReportKey(parsed) === key;
  });
  const sameReporter = eligible.find(
    (issue) => issue.user.login.toLowerCase() === currentIssue.user.login.toLowerCase(),
  );
  if (sameReporter) {
    await comment(
      repository,
      currentIssue.number,
      `This duplicates your report in #${sameReporter.number}. Repeat reports from the same GitHub username count only once.`,
    );
    await closeIssue(repository, currentIssue.number);
    return;
  }

  const match = eligible.find(
    (issue) => issue.user.login.toLowerCase() !== currentIssue.user.login.toLowerCase(),
  );
  if (!match) {
    await comment(
      repository,
      currentIssue.number,
      "Report recorded. The schedule will update after one different GitHub user submits the exact same mode, map order, start time, and duration. This report expires after 45 days.",
    );
    return;
  }

  if (sameAsCurrent(report)) {
    await comment(repository, currentIssue.number, "This matching report describes the schedule already shown on the site.");
    await closeIssue(repository, currentIssue.number);
    await closeIssue(repository, match.number);
    return;
  }

  updateFiles(report, now);
  const commit = commitUpdate(report);
  const message = `Confirmed by two different GitHub users (@${match.user.login} and @${currentIssue.user.login}). The site schedule was updated in commit ${commit}.`;
  await comment(repository, currentIssue.number, message);
  await comment(repository, match.number, message);
  await closeIssue(repository, currentIssue.number);
  await closeIssue(repository, match.number);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
