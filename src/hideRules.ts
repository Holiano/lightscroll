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

export function raiseSelectors(rules: HideRules): string[] {
  return Object.values(rules.features).flatMap((f) => f.raiseSelectors ?? []);
}

// One CSS rule per selector, so a single broken selector can't disable the rest.
// Only two fixed declarations are ever used: hiding, and layering on top.
export function rulesCss(hide: string[], raise: string[]): string {
  return [
    ...hide.map((s) => `${s} { display: none !important; }`),
    ...raise.map((s) => `${s} { z-index: 1000 !important; }`),
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
