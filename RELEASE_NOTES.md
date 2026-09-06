## 🔥 Welcome to Smart Tinder v1.0.0!

We are thrilled to announce the official **v1.0.0** release of **Smart Tinder** — an intelligent, cross-platform desktop client and automation engine featuring deterministic criteria filtering, natural human-like swiping behavior, and a sleek Glassmorphic HUD overlay.

---

### ✨ What's Inside

#### 🛡️ Deterministic Criteria & Negative Filters
- **Auto-Pass Keyword Engine**: Automatically passes profiles containing excluded tags, pronouns, couples, or spam keywords before dispatching any like.
- **One-Click Presets**:
  - ⚧️ **Gender & Pronouns**: `he/him`, `they/them`, `trans`, `transgender`, `ladyboy`, `ftm`, `mtf`, and more.
  - 👥 **Couples & Poly**: `couple`, `looking for third`, `dreier`, `paar`, `unicorn`.
  - 💸 **Promo & Spam**: `onlyfans`, `cashapp`, `paypal.me`, `sugar baby`, `insta:`, `ig:`, `snap:`, `sc:`.
- **Advanced Profile Filters**:
  - 📝 **Bio Required**: Auto-passes profiles with blank or low-effort bios (< 6 characters).
  - ☑️ **Verified Only**: Auto-passes accounts lacking Tinder's blue checkmark.
  - 🎂 **Age Range Cap**: Enforce strict minimum and maximum age brackets directly in the HUD.
- **Distance Limit**: Cap match discovery by kilometer radius.
- **Configurable Pass Rate**: Random pass rate slider (0%–50%) for customizable like ratios.
- **Preset Portability**: 1-click JSON configuration export and import to swap and backup setups.

#### ⚡ Anti-Detection & Human Simulation
- **☕ Anti-Shadowban Cooldowns**: Natural periodic breaks (40–60s) every 20–30 swipes with live countdown timer and instant `[Skip Break]` override.
- **Micro-Inspection Gazing**: Subtle 15% random photo viewing pauses before deciding to mimic authentic human gaze patterns.
- **Natural Timing & Jitter**: Configurable base swipe delays with random jitter variance.
- **Dual-Action Fallback**: Dispatches native arrow key events with automated button-click fallback.

#### 🗂️ Explore Category Looping & Queue Management
- **Zero-Reload SPA Navigation**: Fast, native client-side navigation between Explore categories and regular stacks with no page flushes.
- **Explore Category Scanner**: Discovers active Tinder Explore categories and lets you configure per-category swipe quotas.
- **Auto-Loop Mode**: Automatically rotates stacks and re-queues once exhausted.

#### 🎨 Modern Glassmorphic HUD & Live Decision Feed
- **📋 Live Decision Feed**: Real-time audit log of the last 10 profile evaluations (name, age, action: LIKE/PASS, reason, timestamp).
- **Neon Glow Visuals**: Dynamic green (LIKE) and red (PASS) card glow feedback.
- **Dockable & Compact**: Drag anywhere on screen with boundary clamping, or collapse into an ultra-minimal horizontal status bar (`🗕`).
- **🔄 In-App Update Checker**: Automatic startup check and on-demand check button notifying you of newer releases with a 1-click download link.

---

### 📦 Installation Guide

| Operating System | Download | Quick Instructions |
| :--- | :--- | :--- |
| 🍏 **macOS (Apple Silicon M1–M4)** | [`Smart.Tinder-1.0.0-arm64.dmg`](https://github.com/Crypto90/smart-tinder/releases/download/v1.0.0/Smart.Tinder-1.0.0-arm64.dmg) | Open DMG and drag to Applications. |
| 🍏 **macOS (Intel x64)** | [`Smart.Tinder-1.0.0.dmg`](https://github.com/Crypto90/smart-tinder/releases/download/v1.0.0/Smart.Tinder-1.0.0.dmg) | Open DMG and drag to Applications. |
| 🪟 **Windows (Installer)** | [`Smart.Tinder.Setup.1.0.0.exe`](https://github.com/Crypto90/smart-tinder/releases/download/v1.0.0/Smart.Tinder.Setup.1.0.0.exe) | Run setup to install with Desktop & Start Menu shortcuts. |
| 🪟 **Windows (Portable)** | [`Smart.Tinder.1.0.0.exe`](https://github.com/Crypto90/smart-tinder/releases/download/v1.0.0/Smart.Tinder.1.0.0.exe) | Standalone executable — run anywhere without installation. |
| 🐧 **Linux (Universal)** | [`Smart.Tinder-1.0.0.AppImage`](https://github.com/Crypto90/smart-tinder/releases/download/v1.0.0/Smart.Tinder-1.0.0.AppImage) | Run `chmod +x Smart.Tinder-1.0.0.AppImage && ./Smart.Tinder-1.0.0.AppImage` |
| 🐧 **Linux (Debian / Ubuntu)** | [`smarttinder_1.0.0_amd64.deb`](https://github.com/Crypto90/smart-tinder/releases/download/v1.0.0/smarttinder_1.0.0_amd64.deb) | Install via `sudo dpkg -i smarttinder_1.0.0_amd64.deb` |

> [!TIP]
> **macOS First Launch Note**: Because this is an open-source project without Apple's $99/yr developer certificate, if macOS Gatekeeper flags it on first launch, go to **System Settings ➔ Privacy & Security** and click **"Open Anyway"**, or run:
> ```bash
> xattr -cr /Applications/"Smart Tinder.app"
> ```

---

### 🔒 Privacy & Security
- **100% Local**: All processing runs strictly inside your local Chromium context.
- **Zero Telemetry**: No credentials, swipes, or profile data are ever sent to external servers.

---
**Full Changelog**: https://github.com/Crypto90/smart-tinder/commits/v1.0.0
