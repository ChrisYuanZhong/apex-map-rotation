# Apex Map Rotation

A tiny, dependency-free GitHub Pages site that shows the current Apex Legends pubs and ranked maps, time remaining, and the next two rotations. All times are calculated in the visitor's browser and displayed in their local timezone. This project was vibe coded.

## Community schedule reports

The **Update** button walks a visitor through the mode, maps, order, next start time, and duration. It then opens a prefilled public GitHub issue for the visitor to review and submit.

- Two identical reports from two different GitHub usernames update the schedule automatically.
- Repeat reports from the same username count only once.
- Reports expire after 45 days and are closed by a daily workflow.
- Matching uses only the public GitHub username attached to the issue. The site does not collect IP addresses, cookies, VPN status, or device fingerprints.
- A determined person can still create multiple GitHub accounts, so the repository owner retains the Git history and can revert a bad consensus update.
