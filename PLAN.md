# LightScroll — Plan

> **Instagram without Reels.** A free, open-source iPhone app for Christians that shows Instagram
> without the endless scroll, and opens with a Bible verse.

Internal project name: InstaJesus. Public name: **LightScroll**.

---

## The idea in one paragraph

LightScroll loads Instagram's own mobile website inside an app and hides the parts built for endless
scrolling: Reels and the Explore grid. Every time you open it, you see a short Bible verse while
Instagram loads behind it. The app is free, collects no data, is open source (MIT), and is funded by
donations later on. Faith is the reason it exists.

---

## Decisions

### What the app is
| Topic | Decision |
|---|---|
| How it works | Shows **instagram.com inside the app** (a WebView). We never rebuild Instagram's screens or touch its private API. |
| Platform | **iPhone first.** Android later (the same code can be reused). |
| Audience | Mainly **Christians**. Faith is the motivation. |
| Language | **English** for v1. |
| Name | **LightScroll**. App Store subtitle: *"Instagram without Reels"*. No "Insta" or "Gram" in the name or icon. |
| Price | **Free.** Donations come later (see v1.1). |
| Code | **Open source on GitHub, MIT license.** Repo `Holiano/lightscroll` is **private until v1 launches**, then made public. Commits use the GitHub private email. |
| Data | **Collects nothing.** App Store privacy label: *"Data Not Collected"*. |

### What gets hidden in v1
| Area | Behaviour |
|---|---|
| Reels tab/button | **Hidden.** |
| Suggested posts from strangers, reels and photos (home feed) | **Hidden.** They keep their size as an empty box saying "Hidden by LightScroll" (videos paused and muted), because any change in size makes the feed jump. |
| Endless swipe-to-next-reel | **Blocked everywhere.** A reel opens as one single video. |
| Reels from people you follow | **Shown** as normal single posts. |
| Reels sent in DMs | **Shown** as single videos. |
| Explore | **Search only.** The search bar stays and the recommended grid is hidden. |
| "Open in the Instagram app" banners | **Hidden.** |
| Ads | **Not touched in v1** (planned for v2). |

### Verse screen
- Shows **every time the app opens**.
- **One verse per day**: the same verse all day, a new one tomorrow.
- Translation: **World English Bible (WEB)**, which is public domain and needs no permission.
- A **Skip** button appears after **2 seconds**. The app moves on to Instagram by itself after **~5 seconds**.
- Instagram **loads behind the verse**, so it adds no waiting time.

### Other defaults
- Users log in on **Instagram's real login page** and stay logged in.
- Posting works the way Instagram's website allows. The app asks for photo and camera access only when needed.
- Links that leave Instagram (for example "link in bio") open in **Safari**.
- **No notifications, by design.** This is stated clearly in the App Store description.
- iPhone only (no special iPad layout), all countries, age rating **13+**.

---

## How we keep Reels hidden

Instagram changes its website sometimes. We use two locks:

1. **Hide the buttons.** A "do not show" list says which parts of the page to hide.
   - A copy is **built into the app**, so it works offline and on first launch.
   - The newest version is **downloaded from the GitHub repo** each time the app opens, so fixes reach everyone
     instantly without waiting for Apple's review.
   - The list is **data only, never code.** The app only *hides* what the list names and never runs anything
     from it. If the GitHub account were ever hacked, nobody's Instagram account could be touched.
   - The list is grouped by feature (`reels`, `exploreGrid`, `suggestedPosts`, `openInAppBanners`, and later `ads`)
     so v2 can add on/off switches easily.
   - While the repo is private, only the built-in list (`src/hideRules.ts`) is used. The GitHub download is added
     when the repo goes public.
2. **Block Reels pages by address.** Any page under `/reels/` is refused. A single reel (`/reel/<id>`) opens as one
   video with no swiping to the next. These addresses change much less often than buttons do.

Bigger fixes to the app's own logic go out via Expo updates or a new App Store release.

**Security:** GitHub account protected with **two-factor login**.

---

## Tech stack

- **Expo (React Native) + `react-native-webview`**, written in TypeScript.
- Built in the cloud with **EAS Build** and submitted with **EAS Submit**, so **no Mac is needed** (development is on Windows).
- Tested on a **real iPhone**, first with Expo Go and then with TestFlight.
- Privacy policy: a one-paragraph page on **GitHub Pages**.

---

## Build steps for v1

### 0. Accounts (before coding)
- [ ] Apple Developer Program ($99/year).
- [ ] **Reserve the name "LightScroll"** in App Store Connect.
- [ ] Expo account.
- [ ] GitHub account with two-factor login, and a public repo.

### 1. Prove the risky parts first (do these before anything else)
- [ ] Load instagram.com in a WebView on the iPhone and log in.
- [ ] Check that login **stays** after closing and reopening the app.
- [ ] Check that Instagram doesn't block or limit the WebView. If it does, try presenting as mobile Safari.
- [ ] Test "Log in with Facebook" (it may not work inside a WebView). Note the result.
- [ ] Find out what the mobile website shows for Reels, Explore and single reels, and whether `/reel/<id>` lets you swipe to more reels.

### 2. The app
- [ ] Expo project (TypeScript), iPhone only.
- [ ] Full-screen WebView of instagram.com, with login kept between sessions.
- [ ] Links outside Instagram open in Safari.
- [ ] Hiding: built-in "do not show" list, plus download of the newest list from GitHub (checked to be a plain list, ignored if broken).
      Hiding keeps working as you move around Instagram, since its pages change without reloading.
- [ ] Reels page blocking (watch page changes inside Instagram, not only full page loads).
- [ ] Explore: hide the grid and keep search.
- [ ] Hide "Open in app" banners.
- [ ] Verse screen: 365 WEB verses bundled in the app, day-of-year selection, skip after 2s, auto-continue after ~5s,
      Instagram loading underneath.

### 3. Release
- [ ] App icon (Christian and light-themed, nothing like Instagram's logo).
- [ ] README, MIT `LICENSE`, privacy policy page.
- [ ] App Store listing: subtitle *"Instagram without Reels"*, a description that states **"no notifications, by design"**,
      the privacy label *"Data Not Collected"*, and age rating 13+.
- [ ] **Make the GitHub repo public** (needed for open source and for the downloadable "do not show" list).
- [ ] EAS Build, then TestFlight on your own iPhone, then submit to Apple.

---

## Later versions

### v1.1 — Donations
- "Support this app 🙏" **tip jar** in settings using Apple in-app purchases (for example $1.99 / $4.99 / $9.99). Apple keeps 15%.
- **GitHub Sponsors** on the repo.

### v2 — More control
- **Settings with an on/off switch for each feature**: Reels, Explore grid, suggested posts, ads.
- **Remove ads.** ⚠️ This is the feature most likely to make Meta complain to Apple. Weigh it carefully before shipping.
- **"Delete Instagram" slideshow**, based on published research about time spent on short videos (cited, no user tracking).
- Optional **on-device-only** time counter ("You've spent 12 minutes here this week"). Nothing leaves the phone.
- Ideas for later: intention prompt ("What are you opening Instagram for?"), Sabbath mode, suggested Christian accounts.

### Later still
- **Norwegian.** Ask Bibelselskapet for permission to use Bibel 2011.
- **Android**, reusing the same Expo code and "do not show" list.

---

## Known risks
- **Meta can complain to Apple** and get the app removed. Similar apps (SocialLite, Dull, No Reel For Instagram) are live, so it's possible but not guaranteed. Hiding ads raises this risk.
- **Instagram website changes** can bring Reels back until the "do not show" list is updated. The address blocking limits the damage.
- **Instagram's mobile website ≠ the app.** Some features (DMs, posting) are more limited on the website.
- **Name trademark:** LightScroll looked free on 2026-10-04. Confirm by reserving it in App Store Connect.

## Competitors (for reference)
- **SocialLite**: multi-platform, free with a $3.99/month premium tier.
- **Dull**: Instagram without Reels, Explore or suggested posts. $3.99/month.
- **Selah: Pause Before You Scroll**: Christian, shows Scripture before opening apps, but **doesn't remove Reels**.
- **LightScroll's difference:** free, open source, Christian, and it both pauses *and* removes Reels.
