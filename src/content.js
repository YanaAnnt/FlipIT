/**
 * FlipIT - Content Script
 * Detects the dominant language of the page and aligns
 * Hebrew-containing blocks to RTL accordingly.
 *
 * @version 1.0.0
 */

/** @type {RegExp} Matches Hebrew Unicode characters */
const HEBREW_RE = /[\u0590-\u05FF\uFB1D-\uFB4F]/;

/** Block-level elements to evaluate for RTL alignment */
const BLOCK_SELECTOR = 'p, li, h1, h2, h3, h4, h5, h6, blockquote, td, th';

/** Editable elements to handle on user input */
const INPUT_SELECTOR = [
  'input[type="text"]',
  'input[type="search"]',
  'input:not([type])',
  'textarea',
  '[contenteditable="true"]',
  '[contenteditable=""]',
  '[role="textbox"]',
].join(',');

/** @type {boolean} Whether the extension is currently active */
let enabled = true;

/** @type {number|null} Debounce timer handle */
let scanTimer = null;

// Bootstrap
chrome.storage.local.get('enabled', (result) => {
  enabled = result.enabled !== false;
});

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.action === 'enable')  { enabled = true;  scan(); }
  if (msg.action === 'disable') { enabled = false; resetAll(); }
  if (msg.action === 'rescan')  { scan(); }
});

/**
 * Estimates the dominant language of the page by sampling visible text.
 * Checks <html lang> and a character-frequency sample.
 *
 * @returns {'he' | 'en' | 'mixed' | 'unknown'}
 */
function getPageLanguage() {
  const htmlLang = document.documentElement.lang?.toLowerCase() ?? '';
  if (htmlLang.startsWith('he')) return 'he';

  const sample = (document.body?.innerText ?? '').slice(0, 4000);
  const hebrewChars = (sample.match(/[\u0590-\u05FF\uFB1D-\uFB4F]/g) ?? []).length;
  const latinChars  = (sample.match(/[a-zA-Z]/g) ?? []).length;

  if (hebrewChars === 0 && latinChars === 0) return 'unknown';

  const ratio = hebrewChars / (hebrewChars + latinChars);
  if (ratio >= 0.4) return 'he';
  if (ratio >= 0.1) return 'mixed';
  return 'en';
}

/**
 * Applies RTL styles to an element and marks it for later cleanup.
 * @param {HTMLElement} el
 */
function applyRTL(el) {
  el.style.setProperty('direction',    'rtl',       'important');
  el.style.setProperty('text-align',   'right',     'important');
  el.style.setProperty('unicode-bidi', 'plaintext', 'important');
  el.dataset.flipit = '1';
}

/**
 * Removes RTL styles previously applied by FlipIT.
 * @param {HTMLElement} el
 */
function removeRTL(el) {
  el.style.removeProperty('direction');
  el.style.removeProperty('text-align');
  el.style.removeProperty('unicode-bidi');
  delete el.dataset.flipit;
}

/**
 * Decides whether an input/editable field should be RTL
 * based on its current value.
 * @param {HTMLInputElement|HTMLTextAreaElement|HTMLElement} el
 */
function processInput(el) {
  const text = el.value ?? el.innerText ?? '';
  if (HEBREW_RE.test(text)) {
    applyRTL(el);
  } else if (el.dataset.flipit) {
    removeRTL(el);
  }
}

/**
 * Decides whether a block element should be RTL.
 * On Hebrew/mixed pages: any block containing Hebrew → RTL.
 * On English pages: only blocks that start with Hebrew → RTL.
 *
 * @param {HTMLElement} el
 * @param {'he'|'en'|'mixed'|'unknown'} pageLanguage
 */
function processBlock(el, pageLanguage) {
  if (el.querySelector(BLOCK_SELECTOR)) return;
  if (el.matches(INPUT_SELECTOR) || el.querySelector(INPUT_SELECTOR)) return;

  const text = (el.innerText || el.textContent || '').trim();
  if (text.length < 2) return;

  if (pageLanguage === 'he' || pageLanguage === 'mixed') {
    if (HEBREW_RE.test(text)) applyRTL(el);
  } else {
    const firstMeaningfulChar = text.replace(/^[\s\u200e\u200f]+/, '')[0] ?? '';
    if (HEBREW_RE.test(firstMeaningfulChar)) applyRTL(el);
  }
}

/**
 * Scans the full page and applies RTL fixes where needed.
 * Binds input listeners on first encounter.
 */
function scan() {
  if (!enabled) return;

  const lang = getPageLanguage();

  document.querySelectorAll(INPUT_SELECTOR).forEach((el) => {
    if (!el._flipitBound) {
      el.addEventListener('input', () => processInput(el));
      el.addEventListener('paste', () => setTimeout(() => processInput(el), 30));
      el._flipitBound = true;
    }
    processInput(el);
  });

  document.querySelectorAll(BLOCK_SELECTOR).forEach((el) => {
    processBlock(el, lang);
  });
}

/**
 * Removes all RTL overrides applied by FlipIT.
 */
function resetAll() {
  document.querySelectorAll('[data-flipit]').forEach(removeRTL);
}

// MutationObserver - watches for dynamically added content
const observer = new MutationObserver(() => {
  clearTimeout(scanTimer);
  scanTimer = setTimeout(scan, 200);
});

function init() {
  scan();
  observer.observe(document.body, {
    childList:     true,
    subtree:       true,
    characterData: true,
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

window.addEventListener('load', () => setTimeout(scan, 600));
