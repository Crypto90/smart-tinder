# Smart Tinder Agent Guidelines

## Release Management Standard
- **No Raw / Duplicate Changelogs**: GitHub Release notes must always be beautifully curated, structured with badges, categorized feature breakdowns, installation guides, and direct download links.
- **Two-Stage CI/CD Release Architecture**:
  - Never publish releases concurrently from matrix build jobs.
  - Multi-platform matrices must upload build artifacts, followed by a single downstream `publish-release` job that runs once to publish assets cleanly.
  - `electron-builder` must always use `--publish never` to prevent unauthorized or duplicate draft creations.
