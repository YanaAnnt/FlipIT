/**
 * FlipIT - Content Script
 *
 * Detects Hebrew text and applies RTL alignment across the page.
 * Optionally protects math expressions from being flipped.
 *
 * @version 1.2.1
 */

/** Matches Hebrew Unicode characters */
const HEBREW_RE = /[\u0590-\u05FF\uFB1D-\uFB4F]/;

/**
 * Matches real math expressions only — NOT CSS class names or code snippets.
 *
 * Rules:
 *  - LaTeX blocks:  $$...$$ or \[...\]
 *  - LaTeX inline:  $...$ (must contain a letter or operator, not just a word)
 *  - LaTeX commands: \frac, \int, \sum, \sqrt etc.
 *  - Plain arithmetic: must have operator (+−×÷=) between numbers/variables
 *    e.g. "3 + 4", "x² - 2", "f(x) = 3x + 1"
 *  - NOT matched: "border-0.5", "text-[0.9rem]", "px-1", CSS-like tokens
 */
const MATH_RE = new RegExp(
  // LaTeX block: $$...$$ or \[...\]
  '(\\$\\$[\\s\\S]+?\\$\\$' +
  '|\\\\\\[[\\s\\S]+?\\\\\\]' +
  // LaTeX inline: $...$ — must contain a backslash (command) or operator
  '|\\$(?=[^$]*(?:\\\\|[+\\-*/=^_{}]))[^$\\n]{1,80}?\\$' +
  // LaTeX commands like \frac, \int, \sum, \sqrt
  '|\\\\(?:frac|int|sum|sqrt|lim|infty|pi|alpha|beta|theta|Delta|Sigma|times|div|leq|geq|neq|pm)(?:\\{[^}]*\\})*' +
  // Plain arithmetic: number OP number/variable sequences
  // Must start with a digit or variable, contain an operator, end with digit/variable
  '|(?<![\\w\\-\\.\\[])(?:[0-9]+[xyzntk]?|[xyzntk])\\s*[+\\-\\*\\/=]\\s*(?:[0-9]+[xyzntk²³]?|[xyzntk²³])(?:[\\s]*[+\\-\\*\\/=<>]\\s*(?:[0-9]+[xyzntk²³]?|[xyzntk²³]))*(?![\\w\\-\\[])' +
  ')',
  'g'
);

/** Block-level selectors to scan for RTL */
const BLOCK_SELECTOR = 'p, li, h1, h2, h3, h4, h5, h6, blockquote, td, th';

/** Editable input selectors */
const INPUT_SELECTOR = [
  'input[type="text"]',
  'input[type="search"]',
  'input:not([type])',
  'textarea',
  '[contenteditable="true"]',
  '[contenteditable=""]',
  '[role="textbox"]',
].join(',');

/** @type {boolean} */
let enabled     = true;
/** @type {boolean} */
let protectMath = true;
/** @type {number|null} */
let scanTimer   = null;

// ── Bootstrap ─────────────────────────────────────────────────────────────────

chrome.storage.local.get(['enabled', 'protectMath'], (r) => {
  enabled     = r.enabled     !== false;
  protectMath = r.protectMath !== false;
});

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.action === 'enable')  { enabled = true;  scan(); }
  if (msg.action === 'disable') { enabled = false; resetAll(); }
  if (msg.action === 'rescan')  { scan(); }
  if (msg.action === 'setMath') {
    protectMath = msg.protectMath;
    resetAll();
    scan();
  }
});

// ── Language context ──────────────────────────────────────────────────────────

/**
 * Estimates dominant page language via <html lang> and character sampling.
 * @returns {'he'|'en'|'mixed'|'unknown'}
 */
function getPageLanguage() {
  const htmlLang = document.documentElement.lang?.toLowerCase() ?? '';
  if (htmlLang.startsWith('he')) return 'he';

  const sample      = (document.body?.innerText ?? '').slice(0, 4000);
  const hebrewCount = (sample.match(/[\u0590-\u05FF\uFB1D-\uFB4F]/g) ?? []).length;
  const latinCount  = (sample.match(/[a-zA-Z]/g) ?? []).length;

  if (hebrewCount === 0 && latinCount === 0) return 'unknown';

  const ratio = hebrewCount / (hebrewCount + latinCount);
  if (ratio >= 0.4) return 'he';
  if (ratio >= 0.1) return 'mixed';
  return 'en';
}

// ── Math protection ───────────────────────────────────────────────────────────

/**
 * Checks if an element is a rendered math container (KaTeX / MathJax).
 * These are already handled correctly by the math library itself.
 * @param {HTMLElement} el
 * @returns {boolean}
 */
function isRenderedMath(el) {
  return !!(
    el.querySelector('mjx-container, .katex, [class*="MathJax"]') ||
    el.closest('mjx-container, .katex, [class*="MathJax"]')
  );
}

/**
 * Wraps plain-text math expressions in an LTR span so they don't flip
 * inside RTL blocks. Skips elements that contain rendered math or code.
 * @param {HTMLElement} el
 */
function protectMathInElement(el) {
  if (!protectMath) return;
  if (el.dataset.flipitMath) return;
  if (isRenderedMath(el)) return;
  // Skip code blocks — math there is display, not computation
  if (el.closest('pre, code')) return;

  const html = el.innerHTML;
  MATH_RE.lastIndex = 0;
  if (!MATH_RE.test(html)) return;

  MATH_RE.lastIndex = 0;
  el.innerHTML = html.replace(MATH_RE, (match) =>
    `<span data-flipit-math="1" style="display:inline-block;direction:ltr;unicode-bidi:embed;">${match}</span>`
  );
  el.dataset.flipitMath = '1';
}

// ── RTL helpers ───────────────────────────────────────────────────────────────

/** @param {HTMLElement} el */
function applyRTL(el) {
  el.style.setProperty('direction',    'rtl',       'important');
  el.style.setProperty('text-align',   'right',     'important');
  el.style.setProperty('unicode-bidi', 'plaintext', 'important');
  el.dataset.flipit = '1';
  protectMathInElement(el);
}

/** @param {HTMLElement} el */
function removeRTL(el) {
  el.style.removeProperty('direction');
  el.style.removeProperty('text-align');
  el.style.removeProperty('unicode-bidi');
  delete el.dataset.flipit;
}

// ── Element processors ────────────────────────────────────────────────────────

/** @param {HTMLElement} el */
function processInput(el) {
  const text = el.value ?? el.innerText ?? '';
  if (HEBREW_RE.test(text)) applyRTL(el);
  else if (el.dataset.flipit) removeRTL(el);
}

/**
 * @param {HTMLElement} el
 * @param {'he'|'en'|'mixed'|'unknown'} pageLang
 */
function processBlock(el, pageLang) {
  if (el.querySelector(BLOCK_SELECTOR)) return;
  if (el.matches(INPUT_SELECTOR) || el.querySelector(INPUT_SELECTOR)) return;

  const text = (el.innerText || el.textContent || '').trim();
  if (text.length < 2) return;

  if (pageLang === 'he' || pageLang === 'mixed') {
    if (HEBREW_RE.test(text)) applyRTL(el);
  } else {
    const firstChar = text.replace(/^[\s\u200e\u200f]+/, '')[0] ?? '';
    if (HEBREW_RE.test(firstChar)) applyRTL(el);
  }
}

// ── Scan & reset ──────────────────────────────────────────────────────────────

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

function resetAll() {
  document.querySelectorAll('[data-flipit]').forEach(removeRTL);
}

// ── Observer ──────────────────────────────────────────────────────────────────

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
