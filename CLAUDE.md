# Soularc (Live Coach) — Project Guide

iOS AI life-coaching app. One active goal; daily morning/evening voice check-ins (VAPI),
3 micro-actions/day, 0–10 daily score. All user data is AES-256-GCM encrypted by the
proxy before it touches Firebase ("we can't read your data").

## Repo layout

- `ios-app/` — SwiftUI app (XcodeGen project; run `xcodegen generate` in `ios-app/` after adding files).
- `proxy/` — Node/TypeScript Express API. Encrypts/decrypts all Firebase reads/writes; builds VAPI prompts; handles VAPI/RevenueCat webhooks; runs the daily push scheduler.
- `landing/` — Next.js landing page (serves soularc.xyz).
- `docs/` — PRD, architecture, dev-log.

## Proxy — local development

```bash
cd proxy
npm install
npm run dev        # ts-node src/index.ts on PORT (default 3000)
npm test           # jest
npx tsc --noEmit   # typecheck
```

Secrets live in `proxy/.env` (gitignored). See `proxy/.env.example` for the key list:
Firebase service account (base64), master encryption key, Together AI, VAPI, RevenueCat,
webhook secrets. Never commit `.env`.

## Proxy — production deployment

**Where:** DigitalOcean droplet `68.183.142.183` (Ubuntu 24.04), shared with other apps.
Process manager is **PM2**; nginx reverse-proxies per-site; TLS via **certbot**.

| Thing | Value |
|-------|-------|
| Server | `root@68.183.142.183` |
| SSH key | `~/.ssh/2026_do` |
| App dir | `/var/www/soularc-proxy` |
| PM2 app | `soularc-proxy` (fork mode, single instance — the node-cron scheduler must not run multiple copies) |
| Internal port | `3003` |
| Public URL | `https://api.soularc.xyz` |
| nginx vhost | `/etc/nginx/sites-available/api.soularc.xyz` (template: `proxy/deploy/api.soularc.xyz.nginx`) |

### Deploying a new version

From your machine:

```bash
cd proxy
./deploy.sh
```

`deploy.sh` rsyncs the source (excludes `node_modules`, `dist`, `.env`, logs), uploads the
local `.env`, then on the server runs `npm ci && npm run build && pm2 reload ecosystem.config.js`
and a `/health` check. Idempotent — safe to re-run. The local `proxy/.env` is the source of
truth for production secrets; editing it and re-running `deploy.sh` updates the server.

PM2 config is `proxy/ecosystem.config.js` (sets `PORT=3003`, `NODE_ENV=production`).

### One-time server provisioning (already done, documented for rebuilds)

```bash
# 1. nginx vhost (HTTP)
scp -i ~/.ssh/2026_do proxy/deploy/api.soularc.xyz.nginx \
    root@68.183.142.183:/etc/nginx/sites-available/api.soularc.xyz
ssh -i ~/.ssh/2026_do root@68.183.142.183 \
    'ln -sf /etc/nginx/sites-available/api.soularc.xyz /etc/nginx/sites-enabled/ && nginx -t && systemctl reload nginx'

# 2. DNS — add an A record at the soularc.xyz DNS provider:
#       api.soularc.xyz  ->  68.183.142.183
#    (verify: dig +short api.soularc.xyz)

# 3. TLS — only after DNS resolves:
ssh -i ~/.ssh/2026_do root@68.183.142.183 \
    'certbot --nginx -d api.soularc.xyz --non-interactive --agree-tos -m konradmgnat@gmail.com --redirect'
```

certbot auto-renews and rewrites the vhost to add the `listen 443 ssl` block + HTTP→HTTPS redirect.

### Operations cheatsheet (on the server)

```bash
pm2 status                      # all apps
pm2 logs soularc-proxy          # tail logs
pm2 restart soularc-proxy
curl -s http://127.0.0.1:3003/health
```

### Webhooks

VAPI and RevenueCat must point at the public API:
- VAPI assistant Server URL → `https://api.soularc.xyz/webhooks/vapi` (secret = `VAPI_WEBHOOK_SECRET`, sent as `x-vapi-secret`).
- RevenueCat webhook → `https://api.soularc.xyz/webhooks/revenuecat` (Authorization = `REVENUECAT_WEBHOOK_SECRET`).

## iOS

```bash
cd ios-app
xcodegen generate
xcodebuild -project LiveCoach.xcodeproj -scheme LiveCoach \
  -destination 'platform=iOS Simulator,name=iPhone 16 Pro' build
```

`Constants.proxyBaseURL` defaults to `https://api.soularc.xyz` (override with the
`PROXY_BASE_URL` env var / scheme env for local proxy testing). `vapiPublicKey` must be set
to the VAPI public key.

**Firebase config:** `GoogleService-Info.plist` lives at `ios-app/LiveCoach/` and is bundled
because it sits inside the `LiveCoach` source path that `project.yml` scans (XcodeGen
auto-classifies `.plist`/`.xcassets` as resources). XcodeGen targets have **no `resources:`
key** — it is silently ignored, so never rely on it to add a bundle resource; instead make
sure the file is under a scanned `sources` path and not in `excludes`. Don't keep stray
`*GoogleService-Info.plist` variants in that folder — Firebase crashes at launch if it finds
a misnamed copy in the bundle.
