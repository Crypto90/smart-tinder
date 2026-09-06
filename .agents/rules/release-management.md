---
trigger: always_on
---

# Release Management & Release Notes Standard

This rule enforces standards for GitHub Releases and CI/CD pipelines in the repository:

1. **Release Notes Quality**:
   - Never accept or output low-effort, repetitive auto-generated commit dumps (e.g. repeated "Full Changelog: ...").
   - Release notes must always be comprehensive, professional, and visually engaging:
     - Clear title with release name & version
     - Categorized feature breakdown (Filters, Anti-Detection, UI, Safety)
     - Multi-platform installation guide and download tables with direct links
     - Privacy & security guarantees.
   - **Release Title Format**: Release titles must always strictly follow `<tag> - <Descriptive Subtitle>` (e.g. `v1.0.0 - Initial Release & Cross-Platform Launch`, `v1.0.1 - Empty Category Detection & Auto-Transition`), never `Smart Tinder <tag>`.

2. **CI/CD Pipeline Architecture**:
   - Multi-platform matrix jobs (macOS, Windows, Linux) must **never** call `action-gh-release` in parallel.
   - Always separate CI/CD into two stages:
     1. `build` matrix: compiles binaries and uploads them as temporary workflow artifacts.
     2. `publish-release` downstream job (`needs: build`): downloads all artifacts and publishes a single, unified release once.
   - Configure `electron-builder --publish never` in scripts and package config so local and runner builds never conflict with GitHub token requirements.
