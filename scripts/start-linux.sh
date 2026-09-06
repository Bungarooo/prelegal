#!/usr/bin/env bash
set -e
cd "$(dirname "${BASH_SOURCE[0]}")/.."
docker compose up -d --build
echo "Prelegal is running at http://localhost:8000"
