#!/bin/bash
set -e

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    CREATE USER standup;
    CREATE DATABASE standup;
    GRANT ALL PRIVILEGES ON DATABASE standup TO standup;
EOSQL