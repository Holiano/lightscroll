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
};

export type ItemRule = {
  // CSS selector for one item, e.g. a feed post.
  item: string;
  // Exact text of a label inside the item, in every language Instagram may use. Case doesn't matter.
  labels: string[];
  // Only hide items that also contain an element matching this selector.
  mustContain?: string;
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
      ],
      blockedPaths: ['/reels/'],
      hideItems: [
        {
          // Recommended reels from accounts you don't follow. Each feed post is an <article>; recommended
          // ones carry this label. Only reels (a video or reel audio), so recommended photos stay until v2.
          item: 'article',
          labels: ['Suggested for you', 'Forslag til deg'],
          mustContain: 'video, a[href^="/reels/audio/"]',
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

// Items hidden by hideItems keep a thin bar instead of disappearing: Instagram's feed tracks
// post heights, and collapsing posts to nothing makes it jump back to the top.
export const HIDDEN_ITEM_ATTR = 'data-lightscroll-hidden';
const HIDDEN_ITEM_CSS = `[${HIDDEN_ITEM_ATTR}] > * { display: none !important; }
[${HIDDEN_ITEM_ATTR}]::before { content: "Hidden by LightScroll"; display: block; padding: 12px 16px; font: 13px system-ui, sans-serif; color: #8e8e8e; text-align: center; }`;

// One CSS rule per selector, so a single broken selector can't disable the rest.
// Only fixed declarations are ever used: hiding, layering on top, and the hidden-item bar.
export function rulesCss(hide: string[], raise: string[]): string {
  return [
    ...hide.map((s) => `${s} { display: none !important; }`),
    ...raise.map((s) => `${s} { z-index: 1000 !important; }`),
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
