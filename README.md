# Apex Map Rotation

A tiny, dependency-free GitHub Pages site that shows the current Apex Legends pubs and ranked maps, time remaining, and the next two rotations. All times are calculated in the visitor's browser and displayed in their local timezone.

## Updating the schedule

Edit `rotation.mjs`:

- `anchor` is the start of the first listed map. Keep an explicit Pacific offset (`-07:00` during PDT or `-08:00` during PST).
- `durationMinutes` applies to every map in that mode.
- `maps` lists the maps in rotation order.

Then update the visible **Last updated** date in `index.html`, commit, and push. There is no service worker or offline cache.

## Community schedule reports

The **Update** button walks a visitor through the mode, maps, order, next start time, and duration. It then opens a prefilled public GitHub issue for the visitor to review and submit.

- Two identical reports from two different GitHub usernames update the schedule automatically.
- Repeat reports from the same username count only once.
- Reports expire after 45 days and are closed by a daily workflow.
- Matching uses only the public GitHub username attached to the issue. The site does not collect IP addresses, cookies, VPN status, or device fingerprints.
- A determined person can still create multiple GitHub accounts, so the repository owner retains the Git history and can revert a bad consensus update.

## Verify locally

```powershell
node --test tests/rotation.test.mjs
```

Serve the folder with any static web server to preview it. Opening `index.html` directly may be blocked by browser module security rules.
