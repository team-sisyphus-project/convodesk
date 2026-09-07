# Demo build (preview harness)

The preview harness runs Node servers and static builds, not Rails. This
directory builds the **real agent dashboard** and swaps its backend for an
in-browser dataset, so the preview shows the shipped product rather than a
mock-up.

```bash
pnpm demo:dev      # vite dev server on 5900
pnpm demo:build    # production build into demo/dist
pnpm demo:start    # build if needed, then serve (this is what the harness runs)
pnpm demo:check    # route smoke test
pnpm demo:capture  # re-record fixtures from a locally running backend
```

## How it works

The whole dashboard talks to its API through one axios instance, so a single
seam is enough:

| Piece | What it does |
| --- | --- |
| `transport.js` | An axios adapter. Routes requests to handlers backed by the fixtures, and to real mutations for sending messages, resolving, assigning and labelling. |
| `state.js` | The dataset. Seeded from the fixtures, mutated in the browser, persisted to `localStorage` (`window.convodeskDemo.reset()` clears it). |
| `fixtures/` | Real responses recorded from a running backend by `capture.mjs`. Response shapes are never guessed. |
| `setup.js` | Page globals the Rails layout normally renders, a session cookie so the app authenticates, and the service worker shim. |
| `actioncable-stub.js` | No Rails means no websocket; without this the reconnect loop runs forever. |
| `vue-router-hash.js` | Hash history, so the build survives being mounted at any path. |
| `vite.demo.config.ts` | Build config, plus the one transform of shipped source: `ApiClient` reads the account id from the hash instead of the pathname. |

Everything else (stores, components, routing, filters, error handling) is the
code that ships to production.

## Adding to the demo

An unhandled `GET` returns 404 and logs `[demo] no fixture for GET <path>`; an
unhandled write returns an empty 200 with a warning. Watch the console, then
either record the endpoint in `capture.mjs` or add a handler in `transport.js`.
Re-recording needs the real stack running locally (`bin/local-dev.sh`) and its
demo data (`bundle exec rails runner demo/seed_demo_data.rb`).
