# Perplexity Selection Search (Chrome Extension)

A lightweight Chrome extension that sends selected text or page URL to Perplexity from the right-click menu.

## Features

- Right-click selected text and choose:
  - **[Edit] Fill prompt on Perplexity**: opens Perplexity and pre-fills the prompt (does not submit).
  - **[Go] Search on Perplexity now**: opens Perplexity search and submits immediately.
- Right-click empty page space and choose the same options:
  - Uses the current page URL as the prompt/search text.
- Includes extension icons (`16x16`, `48x48`, `128x128`).

## Project Structure

- `manifest.json` - Chrome extension manifest (MV3)
- `background.js` - context menu logic + Perplexity tab/prompt handling
- `icons/` - extension icon assets

## Installation (Developer Mode)

1. Open `chrome://extensions`
2. Turn on **Developer mode**
3. Click **Load unpacked**
4. Select this folder: `extension-perplexity`
5. Click **Reload** after any code changes

## How To Use

1. Open any webpage.
2. Either:
   - Highlight text and right-click, or
   - Right-click on empty page space.
3. Go to **Perplexity** in the context menu.
4. Choose one:
   - **[Edit] Fill prompt on Perplexity**
   - **[Go] Search on Perplexity now**

## Notes

- Chrome does not support custom image icons for individual context-menu items.
- The extension icon is shown in Chrome's extension UI, while menu items use text labels.

## License

MIT