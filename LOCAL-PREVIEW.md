# Local preview

`convodesk` is a fork of [Chatwoot](https://github.com/chatwoot/chatwoot) v4.17.1
(omnichannel customer support inbox). The full app runs locally: Rails API,
agent dashboard, Sidekiq worker, Postgres and Redis.

## Running it

```bash
bin/local-dev.sh
```

Then open http://localhost:3000 and sign in with the seeded account:

* email: `john@acme.inc`
* password: `Password1!`

The script starts Postgres and Redis if they are not up, then runs Rails
(port 3000), Sidekiq and the Vite dev server (port 3036). The first dashboard
load takes ~30s while Vite compiles; after that it is instant.

`bin/local-services.sh` starts only Postgres and Redis. `bin/local-env.sh` holds
the paths and is sourced by both.

## The toolchain (no admin rights needed)

This machine has no Homebrew and no Docker, and the installers that need an
administrator password could not be used, so every runtime lives in the user's
own directories:

| Component | Version | Location |
| --- | --- | --- |
| Ruby | 3.4.4 | `~/.local/opt/portable-ruby/3.4.4` (Homebrew's portable-ruby bottle, unpacked; ships its own OpenSSL) |
| PostgreSQL | 17.11 | `~/Applications/Postgres.app`, data in `~/.local/var/pgsql17`, port 5432 |
| pgvector | 0.8.6 | bundled with Postgres.app |
| Redis | 7.2.5 | `~/.local/opt/redis`, built from source, port 6379 |
| Gems | 381 | `vendor/bundle` (bundler path is set locally) |

Two details worth remembering:

* `bundle config build.openssl` points at Postgres.app's OpenSSL headers, since
  portable-ruby ships the library but not the headers.
* Native gems link against `/Applications/Postgres.app/...`, which is a symlink
  to the copy in `~/Applications`. If that symlink disappears, Rails fails to
  boot with `Library not loaded: libssl.3.dylib`.

## Setting it up again from scratch

`bundle install` and the database are already in place. To redo them:

```bash
source bin/local-env.sh
bundle install
bundle exec rails db:chatwoot_prepare   # creates convodesk_dev, loads schema, seeds demo data
```

The seed data is one account (Acme Inc), one web widget inbox (Acme Support),
the agent above, a contact (jane) and one conversation with sample messages.

## Preview build (no backend)

`autosquad`'s preview harness supports Node servers and static builds, so the
Rails app cannot run there. `demo/` builds the real dashboard and replaces its
API transport in the browser instead:

```bash
pnpm demo:start   # builds if needed, serves on 5900
```

`harness.config.json` points the harness at that command. See `demo/README.md`
for how the interception works and how to extend the dataset.

## Component gallery

The frontend story gallery also runs on its own, without Ruby or a database:

```bash
pnpm story:dev   # http://localhost:6179
```

Upstream's histoire setup does not start as shipped, so `histoire.config.ts`
carries three local fixes: `vue` aliased to the standalone browser build (the
node-side collector cannot follow the esm-bundler star re-export chain),
`viteNodeInlineDeps: [/.*/]`, and ESM `ssr.resolve.conditions`. About 40 of the
93 stories still fail to collect because they need a real DOM; the rest render.

## Upstream and licensing

* Squashed snapshot of chatwoot v4.17.1, no upstream git history.
* MIT licensed except `enterprise/`, which is under the Chatwoot Enterprise
  license. That directory is still present in this fork; removing it is a
  separate decision.
