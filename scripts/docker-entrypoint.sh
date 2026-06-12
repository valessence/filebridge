#!/bin/sh
set -e

if [ -n "$DATABASE_URL" ] && [ -f /app/db/init.sql ]; then
  echo "Ensuring database schema..."
  DB_HOST="${DB_HOST:-db}"
  DB_USER="${DB_USER:-filebridge}"
  DB_PASS="${DB_PASS:-filebridge}"
  DB_NAME="${DB_NAME:-filebridge}"

  for i in 1 2 3 4 5 6 7 8 9 10; do
    if mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" < /app/db/init.sql 2>/dev/null; then
      echo "Database ready."
      break
    fi
    echo "Waiting for database... ($i/10)"
    sleep 3
  done
fi

exec node dist/boot.js