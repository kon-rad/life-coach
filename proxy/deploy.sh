#!/usr/bin/env bash
#
# Deploy the Soularc proxy API to the DigitalOcean box.
#
# Strategy: rsync source -> /var/www/soularc-proxy, upload local .env, then
# `npm ci && npm run build && pm2 reload` on the server. Idempotent; safe to
# re-run. One-time server provisioning (nginx vhost + TLS) is documented in
# ../CLAUDE.md and is NOT performed here.
#
# Usage:  ./deploy.sh
#
set -euo pipefail

SERVER="root@68.183.142.183"
SSH_KEY="${DO_SSH_KEY:-$HOME/.ssh/2026_do}"
REMOTE_DIR="/var/www/soularc-proxy"
PORT=3003

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

if [[ ! -f .env ]]; then
  echo "ERROR: proxy/.env not found — cannot deploy without secrets." >&2
  exit 1
fi
if [[ ! -f "$SSH_KEY" ]]; then
  echo "ERROR: SSH key not found at $SSH_KEY (override with DO_SSH_KEY=...)." >&2
  exit 1
fi

SSH="ssh -i $SSH_KEY -o StrictHostKeyChecking=accept-new"

echo "==> Ensuring remote dir exists"
$SSH "$SERVER" "mkdir -p $REMOTE_DIR"

echo "==> Syncing source (excludes node_modules, dist, .env, logs)"
rsync -az --delete \
  --exclude node_modules \
  --exclude dist \
  --exclude .env \
  --exclude '*.log' \
  --exclude '.git' \
  -e "$SSH" \
  ./ "$SERVER:$REMOTE_DIR/"

echo "==> Uploading .env"
scp -i "$SSH_KEY" .env "$SERVER:$REMOTE_DIR/.env"

echo "==> Installing deps, building, (re)starting under PM2"
$SSH "$SERVER" bash -s <<EOF
set -euo pipefail
cd $REMOTE_DIR
npm ci
npm run build
pm2 reload ecosystem.config.js --update-env || pm2 start ecosystem.config.js
pm2 save
EOF

echo "==> Health check (http://127.0.0.1:$PORT/health on server)"
$SSH "$SERVER" "curl -fsS http://127.0.0.1:$PORT/health" && echo "  ... OK"

echo "==> Deploy complete."
