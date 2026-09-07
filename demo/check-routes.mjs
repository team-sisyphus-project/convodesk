// Smoke test for the demo build: every route below must return the shell, and
// the build must contain the fixtures the transport depends on. A broken demo
// shows up here instead of as a blank preview.
import { readFile, readdir } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.DEMO_CHECK_PORT ?? 5911);

const ROUTES = [
  '/',
  '/index.html',
  '/app/accounts/1/dashboard',
  '/app/accounts/1/conversations/1',
  '/app/accounts/1/contacts',
];

const REQUIRED_FIXTURES = [
  'auth__validate_token.json',
  'globals.json',
  'api__v1__accounts__1__conversations_status_all_assignee_type_all_page_1_sort_by_last_activity_at_desc.json',
];

const wait = ms => new Promise(done => setTimeout(done, ms));

const main = async () => {
  const fixtures = await readdir(resolve(HERE, 'fixtures'));
  const missing = REQUIRED_FIXTURES.filter(name => !fixtures.includes(name));
  if (missing.length) throw new Error(`missing fixtures: ${missing.join(', ')}`);

  const shell = await readFile(resolve(HERE, 'dist/index.html'), 'utf8');
  if (!shell.includes('id="app"')) throw new Error('demo/dist/index.html has no mount point');

  const server = spawn(process.execPath, [resolve(HERE, 'server.mjs'), '--port', String(PORT)], {
    stdio: 'ignore',
  });

  try {
    for (let attempt = 0; attempt < 40; attempt += 1) {
      try {
        await fetch(`http://127.0.0.1:${PORT}/`);
        break;
      } catch {
        await wait(250);
      }
    }

    for (const route of ROUTES) {
      const res = await fetch(`http://127.0.0.1:${PORT}${route}`);
      const body = await res.text();
      if (!res.ok) throw new Error(`${route} responded ${res.status}`);
      if (!body.includes('id="app"')) throw new Error(`${route} did not return the app shell`);
    }
    // eslint-disable-next-line no-console
    console.log(`demo check: ${ROUTES.length} routes ok, ${fixtures.length} fixtures present`);
  } finally {
    server.kill();
  }
};

main().catch(error => {
  console.error(`demo check failed: ${error.message}`);
  process.exit(1);
});
