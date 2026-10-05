// Applies LightScroll's hide rules to instagram.com, the same way the app does, and re-applies
// them live whenever `npm run preview` serves a new version. Only reads data; nothing is sent anywhere.
let lastText = '';
let css = '';
let blocked = [];
let focus = [];
let items = [];
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

function hasLabel(el, labels) {
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  let node;
  while ((node = walker.nextNode())) {
    if (labels.includes(node.nodeValue.trim().toLowerCase())) return true;
  }
  return false;
}

// Same as the app: when an item above the screen changes height, scroll by the same amount
// (minus whatever the browser already adjusted) so the screen stays still.
function setHidden(el, attr, hide) {
  const y = window.scrollY;
  const before = el.getBoundingClientRect();
  if (hide) el.setAttribute(attr, '');
  else el.removeAttribute(attr);
  if (before.top >= 0) return;
  const change = el.getBoundingClientRect().height - before.height;
  const remaining = change - (window.scrollY - y);
  if (remaining) window.scrollBy(0, remaining);
}

// Same as the app: re-check every item each time, since Instagram may reuse elements.
function hideItems() {
  for (const rule of items) {
    const attr = rule.remove ? 'data-lightscroll-removed' : 'data-lightscroll-hidden';
    try {
      for (const el of document.querySelectorAll(rule.item)) {
        const match = hasLabel(el, rule.labels) && (!rule.mustContain || el.querySelector(rule.mustContain));
        if (match && !el.hasAttribute(attr)) setHidden(el, attr, true);
        else if (!match && el.hasAttribute(attr)) setHidden(el, attr, false);
        if (match) {
          for (const video of el.getElementsByTagName('video')) {
            video.muted = true;
            if (!video.paused) video.pause();
          }
        }
      }
    } catch {
      // A broken selector skips only this rule.
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
      const { rules, css: appCss } = JSON.parse(res.text);
      lastText = res.text;
      css = appCss; // Built by the app's rulesCss(), so it always matches the app.
      blocked = ruleValues(rules, 'blockedPaths');
      focus = ruleValues(rules, 'focusSelectors');
      items = ruleValues(rules, 'hideItems').map((r) => ({
        ...r,
        labels: (r.labels || []).map((l) => l.trim().toLowerCase()),
      }));
      setBadge(`LightScroll v${rules.version} ✓`, true);
    }
  } catch {
    lastText = '';
    setBadge('LightScroll: run npm run preview', false);
  }
  ensureStyle();
  checkPath();
  autoFocus();
  hideItems();
}

// Same as the app: re-check items as soon as Instagram changes the page, before it is drawn,
// so a post that scrolls back into view never flashes its content first.
new MutationObserver(hideItems).observe(document.documentElement, {
  childList: true,
  subtree: true,
  characterData: true,
});

tick();
setInterval(tick, 1000);
