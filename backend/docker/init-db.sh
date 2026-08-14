#!/bin/bash
set -e
# Create all required databases for multi-service setup
for DB in securecode_identity securecode_assessment securecode_proctoring securecode_reporting; do
  echo "Creating database: $DB"
  psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" <<-EOSQL
    CREATE DATABASE "$DB";
EOSQL
done
