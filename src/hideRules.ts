// The "do not show" list. Pure data: CSS selectors to hide and URL paths to block,
// grouped by feature so v2 can give each feature its own on/off switch.
// This file must never contain code that runs inside Instagram — see PLAN.md.

export type FeatureRules = {
  // Elements matching these CSS selectors are hidden.
  hideSelectors: string[];
  // Pages whose path starts with one of these (with a trailing slash) are never shown.
  blockedPaths: string[];
  // When a page opens, the first element matching one of these gets focus, once per visit.
  focusSelectors?: string[];
  // Elements matching these are layered on top (z-index only), to fix Instagram overlaps.
  raiseSelectors?: string[];
  // Whole items (e.g. feed posts) hidden when they show one of the labels.
  hideItems?: ItemRule[];
  // Bottom-bar slots that become the Church button: the icon is centred and gets a cross on its roof.
  churchSelectors?: string[];
  // Top-bar buttons moved to the bar's left end (16px from the edge to the icon) or its centre.
  placeLeftSelectors?: string[];
  placeCenterSelectors?: string[];
};

export type ItemRule = {
  // CSS selector for one item, e.g. a feed post.
  item: string;
  // Exact text of a label inside the item, in every language Instagram may use. Case doesn't matter.
  labels: string[];
  // Only hide items that also contain an element matching this selector.
  mustContain?: string;
  // Remove the item completely instead of leaving an empty box. Only for things floating on top of
  // the page (like banners), since removing feed posts makes the feed jump.
  remove?: boolean;
};

export type HideRules = {
  version: number;
  features: Record<string, FeatureRules>;
};

export const DEFAULT_RULES: HideRules = {
  version: 1,
  features: {
    reels: {
      hideSelectors: [
        // The Reels tab in the bottom bar. Exact matches only, so profiles like /reelsfan/ stay visible.
        'a[href="/reels/"]',
        'a[href^="/reels/?"]',
        'a[href="https://www.instagram.com/reels/"]',
        // The viewer that opens a reel someone sent you is a scroller holding the shared reel first and a
        // list of recommended reels second. Hide that list (its items have reel audio links), so there is
        // nothing to swipe on to.
        'div:has(> div video) > div:nth-child(2):has(> div:nth-child(2) a[href^="/reels/audio/"])',
        // The Reels tab's whole slot in the bottom bar (slot > span > div > link). The bar then shares
        // its width evenly between the four slots left.
        'div:has(> span > div > a[href="/reels/"])',
      ],
      blockedPaths: ['/reels/'],
    },
    topBar: {
      hideSelectors: [],
      blockedPaths: [],
      // The feed's top bar, laid out like the Instagram app: + on the left, the logo in the middle and
      // the heart on the right (where it already is). Only the bar that holds the Instagram logo.
      // The + button's box (the right group's item without the notifications link) starts 8px left of
      // its icon.
      placeLeftSelectors: [
        'header:has(svg[aria-label="Instagram"]) h1 + div > div:not(:has(a[href="/notifications/"]))',
      ],
      // The logo's button, so the h1 around it keeps its place and the heart stays on the right.
      placeCenterSelectors: ['header:has(svg[aria-label="Instagram"]) h1 [role="button"]'],
    },
    churchButton: {
      hideSelectors: [],
      blockedPaths: [],
      // Instagram's Home slot in the bottom bar (slot > span > div > link), not other links to the home
      // page.
      churchSelectors: ['div:has(> span > div > a[href="/"])'],
    },
    suggestedPosts: {
      hideSelectors: [],
      blockedPaths: [],
      hideItems: [
        {
          // Recommended posts (reels and photos) from accounts you don't follow. Each feed post is an
          // <article>; recommended ones carry this label.
          item: 'article',
          labels: ['Suggested for you', 'Forslag til deg'],
        },
      ],
    },
    exploreGrid: {
      hideSelectors: [
        // Explore is the only page whose `main` holds a search box. There, hide the grid tiles (links to
        // posts) and the loading spinner that fetches more. Search results link to profiles, so they stay.
        'main:has(input[type="search"]) a[href^="/p/"]',
        'main:has(input[type="search"]) a[href^="/reel/"]',
        'main:has(input[type="search"]) [role="progressbar"]',
      ],
      blockedPaths: [],
      // Open Explore straight into search, which shows recent searches.
      focusSelectors: ['main input[type="search"]'],
      // Instagram draws the recent-searches list over the bottom bar. The bar is the fixed element
      // eight levels above the search button's link (measured in Chrome's iPhone view).
      raiseSelectors: ['div:has(> div > div > div > div > div > div > span > div > a[href="/explore/"])'],
    },
    openInAppBanners: {
      hideSelectors: [],
      blockedPaths: [],
      hideItems: [
        {
          // The floating "Use the app" banner: a box three levels under the page's <section>, with a
          // button and a close button but no links. Requiring no links keeps the feed and profile
          // areas (which are full of links) from ever matching.
          item: 'section > div > div > div:not(:has(a))',
          labels: ['Use the app', 'Open app', 'Get the app', 'Bruk appen', 'Åpne appen'],
          remove: true,
        },
      ],
    },
  },
};

export function hideSelectors(rules: HideRules): string[] {
  return Object.values(rules.features).flatMap((f) => f.hideSelectors);
}

export function blockedPaths(rules: HideRules): string[] {
  return Object.values(rules.features).flatMap((f) => f.blockedPaths);
}

export function focusSelectors(rules: HideRules): string[] {
  return Object.values(rules.features).flatMap((f) => f.focusSelectors ?? []);
}

export function itemRules(rules: HideRules): ItemRule[] {
  return Object.values(rules.features).flatMap((f) => f.hideItems ?? []);
}

export function raiseSelectors(rules: HideRules): string[] {
  return Object.values(rules.features).flatMap((f) => f.raiseSelectors ?? []);
}

export function churchSelectors(rules: HideRules): string[] {
  return Object.values(rules.features).flatMap((f) => f.churchSelectors ?? []);
}

export function placeLeftSelectors(rules: HideRules): string[] {
  return Object.values(rules.features).flatMap((f) => f.placeLeftSelectors ?? []);
}

export function placeCenterSelectors(rules: HideRules): string[] {
  return Object.values(rules.features).flatMap((f) => f.placeCenterSelectors ?? []);
}

// Moved elements are taken out of the bar's row and placed in the top bar itself (the nearest
// positioned box), vertically centred.
function placeLeftCss(selector: string): string {
  return `${selector} { position: absolute !important; left: 8px !important; top: 50% !important; transform: translateY(-50%) !important; }`;
}

function placeCenterCss(selector: string): string {
  return `${selector} { position: absolute !important; left: 50% !important; top: 50% !important; transform: translate(-50%, -50%) !important; }`;
}

// The cross on the Church button's roof, in the house icon's own coordinates (24 wide, y = 0 at the
// icon's top) and with its 2px rounded lines. The roof peak is at x 12, y 1 and its line is 2px thick,
// so the upright ends inside that line and the two blend into one shape. Only its shape is used.
const CROSS_SVG =
  "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 -8 24 11' fill='none' stroke='black' stroke-width='2' stroke-linecap='round'>" +
  "<path d='M12 -6V1.5M9.5 -3.5h5'/>" +
  '</svg>';

// Instagram puts the Home icon at the left of its slot, so centre it like the other icons. The cross
// is drawn over the icon's own 24px box (the element holding the house) in Instagram's icon colour,
// which also follows dark mode. Instagram fills the house in when you're on your feed; the cross
// stays the same either way.
function churchCss(selector: string): string {
  const icon = `${selector} div:has(> svg)`;
  const mask = `url("data:image/svg+xml,${encodeURIComponent(CROSS_SVG)}") 0 0 / 100% 100% no-repeat`;
  return `${selector} { justify-content: center !important; }
${icon} { position: relative !important; }
${icon}::after { content: ""; position: absolute; left: 0; top: -8px; width: 24px; height: 11px; pointer-events: none; background-color: rgb(var(--ig-primary-text)); -webkit-mask: ${mask}; mask: ${mask}; }`;
}

// Items hidden by hideItems collapse to zero height but stay on the page (not display: none),
// so Instagram's feed can still track them. The in-page script keeps the screen in place when an
// item above it collapses, since Instagram's feed doesn't.
export const HIDDEN_ITEM_ATTR = 'data-lightscroll-hidden';
export const REMOVED_ITEM_ATTR = 'data-lightscroll-removed';
const HIDDEN_ITEM_CSS = `[${REMOVED_ITEM_ATTR}] { display: none !important; }
[${HIDDEN_ITEM_ATTR}] { height: 0 !important; min-height: 0 !important; margin: 0 !important; padding: 0 !important; border: 0 !important; overflow: hidden !important; }`;

// One CSS rule per selector, so a single broken selector can't disable the rest.
// Only fixed declarations are ever used: hiding, layering on top, the Church button, moving top-bar
// buttons, and hidden items.
export function rulesCss(rules: HideRules): string {
  return [
    ...hideSelectors(rules).map((s) => `${s} { display: none !important; }`),
    ...raiseSelectors(rules).map((s) => `${s} { z-index: 1000 !important; }`),
    ...churchSelectors(rules).map(churchCss),
    ...placeLeftSelectors(rules).map(placeLeftCss),
    ...placeCenterSelectors(rules).map(placeCenterCss),
    HIDDEN_ITEM_CSS,
  ].join('\n');
}

// "/reels" and "/reels/abc" both count as "/reels/".
function withTrailingSlash(path: string): string {
  return path.endsWith('/') ? path : path + '/';
}

export function isBlockedUrl(url: string, rules: HideRules): boolean {
  const match = /^https?:\/\/[^/?#]+([^?#]*)/i.exec(url);
  const path = withTrailingSlash(match?.[1] || '/');
  return blockedPaths(rules).some((p) => path.startsWith(p));
}
