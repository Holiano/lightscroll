import { blockedPaths, focusSelectors, hideSelectors, type HideRules } from './hideRules';

// Builds the script that runs inside every Instagram page. The rules are embedded as JSON
// data; the script itself is fixed and only ever hides elements, leaves blocked pages, or
// focuses an element.
export function buildInjectedScript(rules: HideRules): string {
  // One CSS rule per selector, so a single broken selector can't disable the rest.
  const css = hideSelectors(rules)
    .map((s) => `${s} { display: none !important; }`)
    .join('\n');

  return `(function () {
  if (window.__lightscroll) return;
  window.__lightscroll = true;

  var CSS = ${JSON.stringify(css)};
  var BLOCKED = ${JSON.stringify(blockedPaths(rules))};
  var FOCUS = ${JSON.stringify(focusSelectors(rules))};

  function isBlocked(path) {
    if (path.charAt(path.length - 1) !== '/') path += '/';
    for (var i = 0; i < BLOCKED.length; i++) {
      if (path.indexOf(BLOCKED[i]) === 0) return true;
    }
    return false;
  }

  function ensureStyle() {
    if (!CSS || document.getElementById('lightscroll-style')) return;
    var root = document.head || document.documentElement;
    if (!root) return;
    var style = document.createElement('style');
    style.id = 'lightscroll-style';
    style.textContent = CSS;
    root.appendChild(style);
  }

  // Instagram switches pages without reloading, so watch its in-page navigation too.
  function checkPath() {
    if (isBlocked(location.pathname)) location.replace('/');
  }

  // Focus once per page visit, so leaving the field doesn't pull focus back.
  var visitPath = null;
  var focusDone = false;
  function autoFocus() {
    if (location.pathname !== visitPath) {
      visitPath = location.pathname;
      focusDone = false;
    }
    if (focusDone) return;
    for (var i = 0; i < FOCUS.length; i++) {
      var el = document.querySelector(FOCUS[i]);
      if (el) {
        el.focus();
        focusDone = true;
        return;
      }
    }
  }

  ['pushState', 'replaceState'].forEach(function (name) {
    var original = history[name];
    history[name] = function () {
      var result = original.apply(this, arguments);
      checkPath();
      return result;
    };
  });
  window.addEventListener('popstate', checkPath);

  ensureStyle();
  checkPath();
  setInterval(function () {
    ensureStyle();
    checkPath();
    autoFocus();
  }, 500);
})();
true;`;
}
