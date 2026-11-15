#!/bin/sh
set -eu

if [ "${SKIP_DB_MIGRATE:-false}" = "true" ]; then
  exec node dist/index.js
fi

# DATABASE_URL is the runtime role (app_write on Azure). DDL needs the owner.
if [ -n "${DATABASE_MIGRATE_URL:-}" ]; then
  DATABASE_URL="${DATABASE_MIGRATE_URL}" npm run migrate:up
else
  npm run migrate:up
fi

exec node dist/index.js
