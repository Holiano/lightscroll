/// <reference types="node" />
// Serves the current "do not show" list to the Chrome preview extension (preview-extension/).
// Run with `npm run preview`: it restarts whenever src/hideRules.ts changes, and the
// extension picks up the new rules within a second.
import { createServer } from 'node:http';
import { DEFAULT_RULES } from '../src/hideRules';

const PORT = 8787;
const body = JSON.stringify(DEFAULT_RULES);

createServer((req, res) => {
  if (req.url !== '/rules.json') {
    res.writeHead(404).end();
    return;
  }
  res.writeHead(200, {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin': '*',
  });
  res.end(body);
}).listen(PORT, '127.0.0.1', () => {
  console.log(`LightScroll preview: serving rules v${DEFAULT_RULES.version} on http://localhost:${PORT}/rules.json`);
});
