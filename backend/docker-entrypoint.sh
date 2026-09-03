#!/bin/sh
set -eu

if [ "${SKIP_DB_MIGRATE:-false}" = "true" ]; then
  exec node dist/index.js
fi

npm run migrate:up
exec node dist/index.js
