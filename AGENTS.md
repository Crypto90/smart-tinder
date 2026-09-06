# Smart Tinder Agent Guidelines

## Release Management Standard
- **No Raw / Duplicate Changelogs**: GitHub Release notes must always be beautifully curated, structured with badges, categorized feature breakdowns, installation guides, and direct download links.
- **Release Title Format**: Release titles must always strictly follow `<tag> - <Descriptive Subtitle>` (e.g. `v1.0.0 - Initial Release & Cross-Platform Launch`, `v1.0.1 - Empty Category Detection & Auto-Transition`), never `Smart Tinder <tag>`.
- **Two-Stage CI/CD Release Architecture**:
  - Never publish releases concurrently from matrix build jobs.
  - Multi-platform matrices must upload build artifacts, followed by a single downstream `publish-release` job that runs once to publish assets cleanly.
  - `electron-builder` must always use `--publish never` to prevent unauthorized or duplicate draft creations.
