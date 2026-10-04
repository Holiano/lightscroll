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
  // Elements that show the LightScroll cross. Tapping one opens today's verse.
  crossSelectors?: string[];
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
      ],
      blockedPaths: ['/reels/'],
      // The Reels slot in the bottom bar (slot > span > div > link) shows the cross instead, which keeps
      // the five icons evenly spaced.
      crossSelectors: ['div:has(> span > div > a[href="/reels/"])'],
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

export function crossSelectors(rules: HideRules): string[] {
  return Object.values(rules.features).flatMap((f) => f.crossSelectors ?? []);
}

// The cross: two bars in the text colour, drawn with the same 2px stroke as Instagram's icons.
function crossCss(selector: string): string {
  return `${selector} { position: relative !important; min-height: 48px !important; cursor: pointer; }
${selector}::before { content: ""; position: absolute; left: 50%; top: 50%; width: 16px; height: 22px; transform: translate(-50%, -50%); pointer-events: none; background: linear-gradient(currentColor, currentColor) 50% 6px / 16px 2px no-repeat, linear-gradient(currentColor, currentColor) 50% 0 / 2px 22px no-repeat; }`;
}

// Items hidden by hideItems keep their full size, with their content made invisible and a
// label in the middle. Instagram's feed reserves space for each post from its media size, so
// any change in size makes the page jump when the post scrolls back into view.
export const HIDDEN_ITEM_ATTR = 'data-lightscroll-hidden';
export const REMOVED_ITEM_ATTR = 'data-lightscroll-removed';
const HIDDEN_ITEM_CSS = `[${REMOVED_ITEM_ATTR}] { display: none !important; }
[${HIDDEN_ITEM_ATTR}] { position: relative !important; }
[${HIDDEN_ITEM_ATTR}] > * { visibility: hidden !important; }
[${HIDDEN_ITEM_ATTR}]::before { content: "Hidden by LightScroll"; position: absolute; top: 50%; left: 0; right: 0; transform: translateY(-50%); font: 13px system-ui, sans-serif; color: #8e8e8e; text-align: center; }`;

// One CSS rule per selector, so a single broken selector can't disable the rest.
// Only fixed declarations are ever used: hiding, layering on top, the cross, and hidden items.
export function rulesCss(hide: string[], raise: string[], cross: string[]): string {
  return [
    ...hide.map((s) => `${s} { display: none !important; }`),
    ...raise.map((s) => `${s} { z-index: 1000 !important; }`),
    ...cross.map(crossCss),
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
