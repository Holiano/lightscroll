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
// focuses an element. It also adds pinch to zoom, which Instagram's website turns off.
// How far pinch to zoom goes.
export const MAX_ZOOM = 6;

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
  var MAX_ZOOM = ${MAX_ZOOM};

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

  // Pinch to zoom: two fingers zoom the page (up to MAX_ZOOM) and move it around. Lifting one finger
  // keeps the zoom and the other finger moves the page; a new second finger zooms on from there.
  // When the last finger lifts, the page slides back to normal. Safari's own zoom stays off, so
  // double-tap still likes a post.
  var zoom = null;
  function distance(a, b) {
    var dx = a.clientX - b.clientX;
    var dy = a.clientY - b.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }
  function midpoint(a, b) {
    return { x: (a.clientX + b.clientX) / 2, y: (a.clientY + b.clientY) / 2 };
  }
  // Follow the fingers now down, starting from the current zoom, so changing fingers never jumps.
  function follow(touches) {
    zoom.base = { scale: zoom.scale, x: zoom.x, y: zoom.y };
    zoom.pinching = touches.length >= 2;
    if (zoom.pinching) {
      zoom.start = distance(touches[0], touches[1]);
      zoom.from = midpoint(touches[0], touches[1]);
    } else {
      zoom.from = { x: touches[0].clientX, y: touches[0].clientY };
    }
  }
  // Zoom the page's content; the top and bottom bars stay where they are.
  function startZoom(event) {
    if (event.touches.length !== 2) return;
    if (!zoom) {
      var el = document.querySelector('main') || document.body;
      if (!el) return;
      el.style.transition = 'none';
      el.style.transform = '';
      zoom = { el: el, rect: el.getBoundingClientRect(), scale: 1, x: 0, y: 0 };
    }
    follow(event.touches);
    event.stopPropagation();
  }
  function moveZoom(event) {
    if (!zoom) return;
    event.preventDefault();
    event.stopPropagation();
    var t = event.touches;
    var b = zoom.base;
    if (zoom.pinching && t.length >= 2) {
      // The spot first pinched stays under the fingers.
      var to = midpoint(t[0], t[1]);
      var scale = Math.min(MAX_ZOOM, Math.max(1, (b.scale * distance(t[0], t[1])) / zoom.start));
      var px = (zoom.from.x - zoom.rect.left - b.x) / b.scale;
      var py = (zoom.from.y - zoom.rect.top - b.y) / b.scale;
      zoom.scale = scale;
      zoom.x = to.x - zoom.rect.left - scale * px;
      zoom.y = to.y - zoom.rect.top - scale * py;
    } else if (!zoom.pinching && t.length === 1) {
      zoom.x = b.x + t[0].clientX - zoom.from.x;
      zoom.y = b.y + t[0].clientY - zoom.from.y;
    } else {
      return;
    }
    zoom.el.style.transformOrigin = '0 0';
    zoom.el.style.transform = 'translate(' + zoom.x + 'px, ' + zoom.y + 'px) scale(' + zoom.scale + ')';
  }
  function endZoom(event) {
    if (!zoom) return;
    if (event.touches.length) {
      follow(event.touches);
      return;
    }
    // The last finger is up: this touch must not also count as a tap or a like.
    if (event.cancelable) event.preventDefault();
    var el = zoom.el;
    zoom = null;
    // Only the slide back itself, not animations inside the page.
    function clear(e) {
      if (e && e.target !== el) return;
      el.removeEventListener('transitionend', clear);
      el.style.transition = '';
      el.style.transformOrigin = '';
    }
    if (!el.style.transform) return clear();
    el.addEventListener('transitionend', clear);
    el.style.transition = 'transform 0.25s ease-out';
    el.style.transform = '';
  }
  window.addEventListener('touchstart', startZoom, { capture: true, passive: true });
  window.addEventListener('touchmove', moveZoom, { capture: true, passive: false });
  window.addEventListener('touchend', endZoom, { capture: true, passive: false });
  window.addEventListener('touchcancel', endZoom, { capture: true, passive: false });
  // Safari's own pinch zoom, in case Instagram's page ever allows it.
  document.addEventListener('gesturestart', function (event) {
    event.preventDefault();
  });

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
