# v1.0.2 - Glassmorphic Header UI & Collapsible Controls

We are pleased to release **Smart Tinder v1.0.2**! This release completely overhauls the floating widget header with premium glassmorphic vector icon buttons, interactive animations, and true collapsible container isolation.

---

### ✨ What's New in v1.0.2

#### 🎨 Glassmorphic Vector Icon Buttons
- **Replaced Raw Emojis**: Transformed cheap text emojis into refined, consistent vector SVG buttons:
  - ☕ **Support on Ko-fi**: Elegant coffee cup vector with subtle warm hover glow.
  - 🔄 **Update Checker**: Circular sync arrows with active **360° spin micro-animation** (`st-spin`) when clicked.
  - 🛠️ **DevTools Console**: Sleek `>_` developer terminal monitor icon.
  - 🗕 **Compact Mode**: Minimalist pill-window icon.
  - ▼/▲ **Collapse / Expand**: Smooth chevron arrow with dynamic 180° CSS transition rotation.
  - ▶/⏸ **Compact Run Controls**: Solid geometric play/pause vector icons in the mini-bar.
- **Polished Glassmorphic Styling (`.st-header-btn`)**: 26×26px frosted glass tiles with smooth 7px corners, translucent borders (`rgba(255, 255, 255, 0.16)`), hover-lift micro-animations (`translateY(-1px)` + drop shadow), and click press feedback (`scale(0.92)`).

#### 🗕 Full Collapsible Container Isolation
- **Complete Tabs & Body Hiding**: Both the Swiper/Criteria tab navigation bar (`#st-tabs`) and the scrollable body (`#st-body`) are now wrapped in a unified collapsible container (`#st-collapsible`).
- **Pristine Collapsed Widget**: When minimized, **all tabs and body panels are completely hidden**, leaving only the sleek header visible as a floating pill with all four corners smoothly rounded (`border-radius: 13px`).
- **Interactive Collapse Button State**: The collapse button gains active inset glass highlighting (`.st-collapsed-active`), and the chevron smoothly rotates 180° to clearly communicate its expanded vs. collapsed state.

#### 🎯 Explore Category Auto-Advancement & Anti-Stuck Engine
- **Empty Category Detection**: Automatically detects when all potential matches in an Explore category are exhausted across both German and English interfaces (*"Gibt gerade keine neuen Members in deiner Gegend"*, *"Zurück zu Explore"*, *"There's no one new around you"*).
- **5-Second Debounced Continuous Verification**: Eliminates false positives when profile batches take 1–3s to load over slow networks. Swiping resumes immediately if profiles load; only an uninterrupted 5.0s empty state triggers category transition.
- **One-Click Category Exit**: Automatically triggers *"Zurück zu Explore"* / close buttons to return to the Explore grid and advance the queue.

---

### 📦 Installation & Direct Downloads (v1.0.2)

| Platform | Download Link | Quick Instructions |
| :--- | :--- | :--- |
| 🍏 **macOS (Apple Silicon M1–M4)** | [`Smart.Tinder-1.0.2-arm64.dmg`](https://github.com/Crypto90/smart-tinder/releases/download/v1.0.2/Smart.Tinder-1.0.2-arm64.dmg) | Open DMG and drag to Applications. |
| 🍏 **macOS (Intel x64)** | [`Smart.Tinder-1.0.2.dmg`](https://github.com/Crypto90/smart-tinder/releases/download/v1.0.2/Smart.Tinder-1.0.2.dmg) | Open DMG and drag to Applications. |
| 🪟 **Windows (Installer)** | [`Smart.Tinder.Setup.1.0.2.exe`](https://github.com/Crypto90/smart-tinder/releases/download/v1.0.2/Smart.Tinder.Setup.1.0.2.exe) | Standard installer with Start Menu and Desktop shortcuts. |
| 🪟 **Windows (Portable)** | [`Smart.Tinder.1.0.2.exe`](https://github.com/Crypto90/smart-tinder/releases/download/v1.0.2/Smart.Tinder.1.0.2.exe) | Standalone executable — run directly without installation. |
| 🐧 **Linux (Universal)** | [`Smart.Tinder-1.0.2.AppImage`](https://github.com/Crypto90/smart-tinder/releases/download/v1.0.2/Smart.Tinder-1.0.2.AppImage) | Run `chmod +x Smart.Tinder-1.0.2.AppImage && ./Smart.Tinder-1.0.2.AppImage` |
| 🐧 **Linux (Debian / Ubuntu)** | [`smarttinder_1.0.2_amd64.deb`](https://github.com/Crypto90/smart-tinder/releases/download/v1.0.2/smarttinder_1.0.2_amd64.deb) | Install via `sudo dpkg -i smarttinder_1.0.2_amd64.deb` |

> [!TIP]
> **macOS First Launch Note**: If macOS Gatekeeper flags the app on first launch (common for open-source builds without Apple developer certificates), navigate to **System Settings ➔ Privacy & Security** and click **"Open Anyway"**, or run:
> ```bash
> xattr -cr /Applications/"Smart Tinder.app"
> ```

---

### 🔒 Privacy & Security
- **100% Local Execution**: All criteria evaluation and DOM automation run entirely inside your local client session.
- **Zero Telemetry / Zero Storage**: Your credentials, swipes, and location never leave your device.

---

### ☕ Support the Project
If **Smart Tinder** saves you time and enhances your experience, please consider supporting development:

<div align="center">

[![Buy Me a Coffee](https://img.shields.io/badge/Buy%20Me%20a%20Coffee-Donate-orange?style=for-the-badge&logo=ko-fi&logoColor=white)](https://ko-fi.com/crypto90?ref=smart-tinder-release)

</div>

---
**Full Changelog**: https://github.com/Crypto90/smart-tinder/compare/v1.0.1...v1.0.2
