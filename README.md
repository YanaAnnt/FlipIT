# FlipIT - Hebrew RTL Chrome Extension

A lightweight Chrome extension that automatically detects Hebrew text and aligns it right-to-left on any website.

No configuration needed. Install and forget.

---

## Why

Browsers don't always infer text direction correctly, especially in chat interfaces and rich text editors. FlipIT watches the page in real time and fixes alignment the moment Hebrew appears - whether you're typing or reading a response.

Works everywhere: Claude, ChatGPT, SharePoint, Notion, Gmail, and any other site.

---

## How it works

- Any block element (`p`, `li`, `div`, heading, table cell…) that contains Hebrew text gets `direction: rtl` applied.
- Mixed Hebrew + English content stays in one unified direction — no back-and-forth flipping mid-sentence.
- Input fields and `contenteditable` areas are handled live as you type.
- A `MutationObserver` catches dynamically loaded content (AI responses, lazy-loaded feeds, etc.).

---

## Install (Developer Mode)

1. Download or clone this repo
2. Go to `chrome://extensions`
3. Enable **Developer mode** (top right)
4. Click **Load unpacked** → select the `flipit` folder

Chrome Web Store release coming soon.

---

## Project structure

```
flipit/
├── manifest.json
├── src/
│   ├── content.js       # Core detection & RTL logic
│   ├── content.css      # Minimal RTL override styles
│   └── background.js    # Service worker (storage init)
├── popup/
│   ├── popup.html
│   ├── popup.css
│   └── popup.js
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

---

## Versioning

This project uses [Semantic Versioning](https://semver.org).  
See [CHANGELOG.md](CHANGELOG.md) for release history.

---

## License

MIT
