// Records real API responses from a locally running Chatwoot backend into
// demo/fixtures, so the browser-side demo transport never has to guess a
// response shape. Run the backend first (bin/local-dev.sh), then:
//   node demo/capture.mjs
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HOST = process.env.CHATWOOT_HOST || 'http://localhost:3000';
const EMAIL = process.env.CHATWOOT_EMAIL || 'john@acme.inc';
const PASSWORD = process.env.CHATWOOT_PASSWORD || 'Password1!';
const OUT = resolve(dirname(fileURLToPath(import.meta.url)), 'fixtures');

const signIn = async () => {
  const res = await fetch(`${HOST}/auth/sign_in`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  if (!res.ok) throw new Error(`sign_in failed: ${res.status}`);
  const headers = {};
  for (const key of ['access-token', 'client', 'uid', 'token-type', 'expiry']) {
    const value = res.headers.get(key);
    if (value) headers[key] = value;
  }
  return { headers, body: await res.json() };
};

// Local dev tokens are throwaway, but they are still token-shaped, so they
// never make it into the committed fixtures.
const REDACTED_KEYS = new Set(['access_token', 'pubsub_token', 'hmac_token', 'identifier']);
const redact = value => {
  if (Array.isArray(value)) return value.map(redact);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        REDACTED_KEYS.has(key) && typeof item === 'string' ? 'demo' : redact(item),
      ])
    );
  }
  return value;
};

const slug = path =>
  path.replace(/^\//, '').replace(/[?=&[\]]/g, '_').replace(/\//g, '__');

const capture = async (auth, path) => {
  const res = await fetch(`${HOST}${path}`, { headers: auth.headers });
  const text = await res.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }
  await writeFile(
    resolve(OUT, `${slug(path)}.json`),
    `${JSON.stringify({ path, status: res.status, body: redact(body) }, null, 2)}\n`
  );
  return { path, status: res.status };
};

const captureGlobals = async () => {
  const html = await fetch(`${HOST}/app/login`).then(r => r.text());
  const globalConfig = html.match(/window\.globalConfig = (\{.*?\})\n/s);
  const chatwootConfig = html.match(/window\.chatwootConfig = (\{.*?\n {6}\})/s);
  const cleanedChatwootConfig = chatwootConfig
    ? chatwootConfig[1].replace(/^\s*vapidPublicKey:.*$/m, '')
    : '{}';
  await writeFile(
    resolve(OUT, 'globals.json'),
    `${JSON.stringify(
      {
        path: '/globals',
        status: 200,
        body: {
          globalConfig: JSON.parse(globalConfig ? globalConfig[1] : '{}'),
          // The page renders a JS object literal, so evaluate it once here and
          // store plain JSON for the browser bundle.
          chatwootConfig: new Function(`return (${cleanedChatwootConfig})`)(),
        },
      },
      null,
      2
    )}\n`
  );
};

const main = async () => {
  await mkdir(OUT, { recursive: true });
  await captureGlobals();
  const auth = await signIn();
  await capture(auth, '/auth/validate_token');

  const account = 1;
  const base = `/api/v1/accounts/${account}`;
  const paths = [
    `${base}/`,
    `${base}/conversations?status=open&assignee_type=all&page=1&sort_by=last_activity_at_desc`,
    `${base}/conversations/meta?status=open&assignee_type=all`,
    `${base}/inboxes`,
    `${base}/agents`,
    `${base}/labels`,
    `${base}/teams`,
    `${base}/macros`,
    `${base}/contacts?page=1&sort=-last_activity_at`,
    `${base}/canned_responses`,
    `${base}/custom_attribute_definitions?attribute_model=conversation_attribute`,
    `${base}/custom_attribute_definitions?attribute_model=contact_attribute`,
    `${base}/custom_filters?filter_type=conversation`,
    `${base}/custom_filters?filter_type=contact`,
    `${base}/dashboard_apps`,
    `${base}/portals`,
    `${base}/captain/assistants?page=1`,
    `${base}/cache_keys`,
    `${base}/notifications/unread_count`,
    `${base}/integrations/apps`,
    `${base}/assignable_agents?inbox_ids[]=1&include_agent_bots=true`,
    `${base}/automation_rules`,
    `${base}/webhooks`,
    `${base}/agent_bots`,
  ];

  const conversations = await fetch(
    `${HOST}${base}/conversations?status=all&assignee_type=all&page=1`,
    { headers: auth.headers }
  ).then(r => r.json());
  const ids = (conversations?.data?.payload || []).map(c => c.id);
  for (const id of ids) {
    paths.push(`${base}/conversations/${id}/messages`);
    paths.push(`${base}/conversations/${id}/labels`);
    paths.push(`${base}/conversations/${id}/attachments`);
  }
  paths.push(`${base}/conversations?status=all&assignee_type=all&page=1&sort_by=last_activity_at_desc`);

  const results = [];
  for (const path of paths) results.push(await capture(auth, path));
  const failed = results.filter(r => r.status >= 400);
  console.log(`captured ${results.length} endpoints into demo/fixtures`);
  if (failed.length) console.log('non-2xx:', failed.map(f => `${f.status} ${f.path}`).join(', '));
};

main().catch(error => {
  console.error(error);
  process.exit(1);
});
