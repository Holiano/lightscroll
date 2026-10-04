// The "do not show" list. Pure data: CSS selectors to hide and URL paths to block,
// grouped by feature so v2 can give each feature its own on/off switch.
// This file must never contain code that runs inside Instagram — see PLAN.md.

export type FeatureRules = {
  // Elements matching these CSS selectors are hidden.
  hideSelectors: string[];
  // Pages whose path starts with one of these (with a trailing slash) are never shown.
  blockedPaths: string[];
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
  },
};

export function hideSelectors(rules: HideRules): string[] {
  return Object.values(rules.features).flatMap((f) => f.hideSelectors);
}

export function blockedPaths(rules: HideRules): string[] {
  return Object.values(rules.features).flatMap((f) => f.blockedPaths);
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
