// Fetches the rules from the local preview server on behalf of the page, so the request
// comes from the extension rather than from instagram.com.
const RULES_URL = 'http://localhost:8787/preview.json';

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message !== 'lightscroll-rules') return;
  fetch(RULES_URL, { cache: 'no-store' })
    .then((res) => res.text())
    .then(
      (text) => sendResponse({ text }),
      () => sendResponse({ error: true }),
    );
  return true;
});
