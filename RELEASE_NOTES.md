## 🔥 Smart Tinder v1.0.1

We are pleased to release **Smart Tinder v1.0.1**! This update introduces intelligent **Empty Category Detection**, continuous **5-second anti-false-positive loading verification**, seamless **SPA category navigation**, and enhanced profile card container isolation.

---

### ✨ What's New in v1.0.1

#### 🎯 Explore Category Auto-Advancement & Anti-Stuck Engine
- **Intelligent Empty Screen Detection**: Automatically detects when all potential matches in an Explore category have been exhausted across both German and English interfaces (*"Gibt gerade keine neuen Members in deiner Gegend"*, *"Es gibt keine potentiellen Matches mehr"*, *"Zurück zu Explore"*, *"There's no one new around you"*).
- **5-Second Debounced Continuous Verification**: Eliminates false positives when profile batches take 1–3 seconds to load over slow networks. The HUD displays real-time countdown progress (`Looking for profiles (X.Xs / 5.0s)...`). If profiles arrive during the window, swiping resumes instantly. Only an uninterrupted 5.0s empty state triggers a category transition.
- **One-Click Category View Exit**: Automatically identifies and triggers the *"Zurück zu Explore"* button or category close controls (`✕`), cleanly returning to the Explore grid without page refreshes.
- **Queue Auto-Progression**: Once an empty category is confirmed, Smart Tinder smoothly advances to the next queued category or normal recommendations stack.

#### 🛡️ Profile Extraction & Container Isolation
- **Strict Profile Card Isolation**: Resolves an issue where generic `main` page containers were falsely treated as active cards during empty states. Fallback containers now strictly require both profile header elements and active swipe controls while rejecting empty-state messages.
- **Live Decision Feed Logging**: Empty category transitions and stack events are recorded directly into the HUD's Live Decision Feed with exact timestamps.

#### 🧪 Test Suite Expansion
- Added **Tests 12, 13, and 14** covering multi-language empty category screen recognition, 5-second continuous threshold logic, timer resets on profile load, and container isolation. All 14 test suites pass 100% cleanly.

---

### 📦 Installation & Direct Downloads (v1.0.1)

| Platform | Download Link | Quick Instructions |
| :--- | :--- | :--- |
| 🍏 **macOS (Apple Silicon M1–M4)** | [`Smart.Tinder-1.0.1-arm64.dmg`](https://github.com/Crypto90/smart-tinder/releases/download/v1.0.1/Smart.Tinder-1.0.1-arm64.dmg) | Open DMG and drag to Applications. |
| 🍏 **macOS (Intel x64)** | [`Smart.Tinder-1.0.1.dmg`](https://github.com/Crypto90/smart-tinder/releases/download/v1.0.1/Smart.Tinder-1.0.1.dmg) | Open DMG and drag to Applications. |
| 🪟 **Windows (Installer)** | [`Smart.Tinder.Setup.1.0.1.exe`](https://github.com/Crypto90/smart-tinder/releases/download/v1.0.1/Smart.Tinder.Setup.1.0.1.exe) | Standard installer with Start Menu and Desktop shortcuts. |
| 🪟 **Windows (Portable)** | [`Smart.Tinder.1.0.1.exe`](https://github.com/Crypto90/smart-tinder/releases/download/v1.0.1/Smart.Tinder.1.0.1.exe) | Standalone executable — run directly without installation. |
| 🐧 **Linux (Universal)** | [`Smart.Tinder-1.0.1.AppImage`](https://github.com/Crypto90/smart-tinder/releases/download/v1.0.1/Smart.Tinder-1.0.1.AppImage) | Run `chmod +x Smart.Tinder-1.0.1.AppImage && ./Smart.Tinder-1.0.1.AppImage` |
| 🐧 **Linux (Debian / Ubuntu)** | [`smarttinder_1.0.1_amd64.deb`](https://github.com/Crypto90/smart-tinder/releases/download/v1.0.1/smarttinder_1.0.1_amd64.deb) | Install via `sudo dpkg -i smarttinder_1.0.1_amd64.deb` |

> [!TIP]
> **macOS First Launch Note**: If macOS Gatekeeper flags the app on first launch (common for open-source builds without Apple developer certificates), navigate to **System Settings ➔ Privacy & Security** and click **"Open Anyway"**, or run:
> ```bash
> xattr -cr /Applications/"Smart Tinder.app"
> ```

---

### 🔒 Privacy & Security
- **100% Local Execution**: All criteria evaluation and DOM automation run entirely inside your local client session.
- **Zero Telemetry / Zero Storage**: Your account credentials, swipes, and location never leave your device.

---

### ☕ Support the Project
If **Smart Tinder** saves you time and enhances your experience, please consider supporting development:

<div align="center">

[![Buy Me a Coffee](https://img.shields.io/badge/Buy%20Me%20a%20Coffee-Donate-orange?style=for-the-badge&logo=ko-fi&logoColor=white)](https://ko-fi.com/crypto90?ref=smart-tinder-release)

</div>

---
**Full Changelog**: https://github.com/Crypto90/smart-tinder/compare/v1.0.0...v1.0.1
