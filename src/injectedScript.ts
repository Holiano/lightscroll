import {
  HIDDEN_ITEM_ATTR,
  REMOVED_ITEM_ATTR,
  blockedPaths,
  focusSelectors,
  itemRules,
  rulesCss,
  type HideRules,
} from './hideRules';

// Builds the script that runs inside every Instagram page. The rules are embedded as JSON
// data; the script itself is fixed and only ever hides elements, leaves blocked pages, or
// focuses an element.

export function buildInjectedScript(rules: HideRules): string {
  const css = rulesCss(rules);
  const items = itemRules(rules).map((r) => ({ ...r, labels: r.labels.map((l) => l.trim().toLowerCase()) }));

  return `(function () {
  if (window.__lightscroll) return;
  window.__lightscroll = true;

  var CSS = ${JSON.stringify(css)};
  var BLOCKED = ${JSON.stringify(blockedPaths(rules))};
  var FOCUS = ${JSON.stringify(focusSelectors(rules))};
  var ITEMS = ${JSON.stringify(items)};
  var HIDDEN = ${JSON.stringify(HIDDEN_ITEM_ATTR)};
  var REMOVED = ${JSON.stringify(REMOVED_ITEM_ATTR)};

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

  function hasLabel(el, labels) {
    var walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    var node;
    while ((node = walker.nextNode())) {
      if (labels.indexOf(node.nodeValue.trim().toLowerCase()) !== -1) return true;
    }
    return false;
  }

  // A hidden post is only invisible, so Instagram may still autoplay its video. Keep it paused and muted.
  function silenceVideos(el) {
    var videos = el.getElementsByTagName('video');
    for (var k = 0; k < videos.length; k++) {
      videos[k].muted = true;
      if (!videos[k].paused) videos[k].pause();
    }
  }

  // Hides or shows an item. If the item starts above the screen, its change in height would move
  // everything you're looking at, so scroll by the same amount to keep the screen still. The
  // browser may already have done part of that itself, so only make up the rest.
  function setHidden(el, attr, hide) {
    var y = window.scrollY;
    var before = el.getBoundingClientRect();
    if (hide) el.setAttribute(attr, '');
    else el.removeAttribute(attr);
    if (before.top >= 0) return;
    var change = el.getBoundingClientRect().height - before.height;
    var remaining = change - (window.scrollY - y);
    if (remaining) window.scrollBy(0, remaining);
  }

  // Instagram may reuse a post's element for another post, so re-check every item each time
  // and show it again if it no longer matches. The look of a hidden item comes from the CSS.
  function hideItems() {
    for (var i = 0; i < ITEMS.length; i++) {
      var rule = ITEMS[i];
      var attr = rule.remove ? REMOVED : HIDDEN;
      try {
        var nodes = document.querySelectorAll(rule.item);
        for (var j = 0; j < nodes.length; j++) {
          var el = nodes[j];
          var match = hasLabel(el, rule.labels) && (!rule.mustContain || el.querySelector(rule.mustContain));
          if (match && !el.hasAttribute(attr)) setHidden(el, attr, true);
          else if (!match && el.hasAttribute(attr)) setHidden(el, attr, false);
          if (match) silenceVideos(el);
        }
      } catch (e) {
        // A broken selector skips only this rule.
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

  // Re-check items as soon as Instagram changes the page, before it is drawn, so a post that
  // scrolls back into view never flashes its content first.
  if (ITEMS.length && window.MutationObserver) {
    new MutationObserver(hideItems).observe(document.documentElement, {
      childList: true,
      subtree: true,
      characterData: true,
    });
  }

  ensureStyle();
  checkPath();
  setInterval(function () {
    ensureStyle();
    checkPath();
    autoFocus();
    hideItems();
  }, 500);
})();
true;`;
}
