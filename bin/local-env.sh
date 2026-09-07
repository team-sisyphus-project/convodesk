# Shared paths for the local, admin-free toolchain.
# Ruby: Homebrew's portable-ruby bottle unpacked under ~/.local/opt
# Postgres 17 (with pgvector): Postgres.app in ~/Applications
# Redis: built from source under ~/.local/opt
export PG_ROOT="$HOME/Applications/Postgres.app/Contents/Versions/17"
export PATH="$HOME/.local/opt/portable-ruby/3.4.4/bin:$PG_ROOT/bin:$HOME/.local/opt/redis/bin:$PATH"
export PGDATA="$HOME/.local/var/pgsql17"
