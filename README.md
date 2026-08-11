# Apex Map Rotation

A tiny, dependency-free GitHub Pages site that shows the current Apex Legends pubs and ranked maps, time remaining, and the next two rotations. All times are calculated in the visitor's browser and displayed in their local timezone.

## Updating the schedule

Edit `rotation.mjs`:

- `anchor` is the start of the first listed map. Keep an explicit Pacific offset (`-07:00` during PDT or `-08:00` during PST).
- `durationMinutes` applies to every map in that mode.
- `maps` lists the maps in rotation order.

Then update the visible **Last updated** date in `index.html`, commit, and push. There is no service worker or offline cache.

## Verify locally

```powershell
node --test tests/rotation.test.mjs
```

Serve the folder with any static web server to preview it. Opening `index.html` directly may be blocked by browser module security rules.
