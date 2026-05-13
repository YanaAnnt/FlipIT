# Changelog

All notable changes to FlipIT will be documented here.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).  
This project uses [Semantic Versioning](https://semver.org/).

---
## [1.2.1] - 2025-03-09

### Fixed
- Math protection regex no longer matches CSS class names like `border-0.5`,
  `text-[0.9rem]`, `px-1`, or other code/CSS tokens
- Added negative lookahead/lookbehind to require operator context for arithmetic
- Skips `<pre>` and `<code>` blocks entirely (display code, not math)
- Skips elements already rendered by KaTeX / MathJax

---


## [1.2.0] - 2025-03-09

### Added
- **Math protection mode** — when enabled, numeric expressions and LaTeX formulas
  stay LTR inside RTL blocks (fixes flipped equations in ChatGPT math chats)
- Detects: plain arithmetic, inline LaTeX `$...$`, block LaTeX `$$...$$`,
  `\(...\)`, `\[...\]`, and common math symbols (², √, ∑, π, ±, ≤, ≥)
- **Reload page** button in popup — reloads the active tab so the extension
  applies cleanly to freshly loaded content
- Popup redesign: cleaner layout, logo in header, descriptive hints per toggle

### Changed
- Settings now persist: `enabled` and `protectMath` saved in `chrome.storage.local`

---

## [1.1.0] - 2025-03-09

### Changed
- Context-aware language detection via `<html lang>` + character frequency sampling
- On Hebrew/mixed pages: any block containing Hebrew → RTL
- On English pages: only blocks starting with Hebrew → RTL
- Rewrote `content.js` with JSDoc documentation

### Fixed
- Mixed Hebrew+English blocks no longer flip direction mid-paragraph

---

## [1.0.0] - 2025-03-09

### Added
- Initial release
- Real-time RTL detection for Hebrew text in any DOM element
- Live input handling for `input`, `textarea`, and `contenteditable` fields
- MutationObserver for dynamically loaded content
- Popup with enable/disable toggle and manual rescan button
- Manifest V3 compliant
