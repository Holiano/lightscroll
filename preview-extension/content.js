// Applies LightScroll's hide rules to instagram.com, the same way the app does, and re-applies
// them live whenever `npm run preview` serves a new version. Only reads data; nothing is sent anywhere.
let lastText = '';
let css = '';
let blocked = [];
let focus = [];
let visitPath = null;
let focusDone = false;

function ruleValues(rules, key) {
  return Object.values(rules.features || {}).flatMap((f) => (Array.isArray(f[key]) ? f[key] : []));
}

function ensureStyle() {
  let style = document.getElementById('lightscroll-preview-style');
  if (!style) {
    const root = document.head || document.documentElement;
    if (!root) return;
    style = document.createElement('style');
    style.id = 'lightscroll-preview-style';
    root.appendChild(style);
  }
  if (style.textContent !== css) style.textContent = css;
}

function checkPath() {
  let path = location.pathname;
  if (!path.endsWith('/')) path += '/';
  if (blocked.some((p) => path.startsWith(p))) location.replace('/');
}

// Focus once per page visit, so leaving the field doesn't pull focus back.
function autoFocus() {
  if (location.pathname !== visitPath) {
    visitPath = location.pathname;
    focusDone = false;
  }
  if (focusDone) return;
  for (const selector of focus) {
    const el = document.querySelector(selector);
    if (el) {
      el.focus();
      focusDone = true;
      return;
    }
  }
}

function setBadge(text, ok) {
  let badge = document.getElementById('lightscroll-preview-badge');
  if (!badge) {
    if (!document.documentElement) return;
    badge = document.createElement('div');
    badge.id = 'lightscroll-preview-badge';
    badge.style.cssText =
      'position:fixed;top:4px;left:50%;transform:translateX(-50%);z-index:2147483647;padding:2px 6px;border-radius:6px;' +
      'font:11px/1.4 system-ui,sans-serif;color:#fff;pointer-events:none;opacity:.85;';
    document.documentElement.appendChild(badge);
  }
  badge.textContent = text;
  badge.style.background = ok ? '#1a7f37' : '#b42318';
}

async function tick() {
  try {
    const res = await chrome.runtime.sendMessage('lightscroll-rules');
    if (!res || res.error) throw new Error('offline');
    if (res.text !== lastText) {
      const rules = JSON.parse(res.text);
      lastText = res.text;
      // One CSS rule per selector, so a single broken selector can't disable the rest.
      css = ruleValues(rules, 'hideSelectors')
        .map((s) => `${s} { display: none !important; }`)
        .join('\n');
      blocked = ruleValues(rules, 'blockedPaths');
      focus = ruleValues(rules, 'focusSelectors');
      setBadge(`LightScroll v${rules.version} ✓`, true);
    }
  } catch {
    lastText = '';
    setBadge('LightScroll: run npm run preview', false);
  }
  ensureStyle();
  checkPath();
  autoFocus();
}

tick();
setInterval(tick, 1000);
