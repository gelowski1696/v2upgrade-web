# POSV2 Web Applications — Ubuntu VPS Deployment

This stack deploys the owner dashboard, subscription administration app, and API behind two HTTPS
hostnames. Its default mode is safe for a VPS that already has an Nginx or Caddy reverse proxy:

- The web container binds only to `127.0.0.1:3200`.
- The subscription web container binds only to `127.0.0.1:3202`.
- The API container binds only to `127.0.0.1:3201`.
- The existing host reverse proxy terminates HTTPS and routes the domain to those ports.
- The bundled Caddy service is available only through the optional `direct-https` profile.
- Nginx serves the compiled Angular application.
- NestJS serves `/api/v1` without publishing its container port on a public interface.
- PostgreSQL stores platform metadata without publishing its database port.
- Docker volumes persist PostgreSQL data, synchronized store snapshots, platform backups, and
  Caddy certificates.

## 1. Prepare DNS And The VPS

Create `A` records for `vmjamdocuai.cloud` and `admin.vmjamdocuai.cloud`, both pointing to the VPS
public IPv4 address. Add `AAAA` records only when IPv6 is configured and reaches this VPS. Allow
inbound TCP ports 22, 80, and 443, plus UDP 443 for HTTP/3, in the provider firewall. Do not publish
PostgreSQL port 5432.

The existing reverse proxy can obtain a public certificate only after the domain resolves to this
VPS and ports 80 and 443 are reachable.

Install Docker Engine and the Compose plugin using Docker's official Ubuntu instructions:

<https://docs.docker.com/engine/install/ubuntu/>

Verify the installation:

```bash
sudo docker run --rm hello-world
sudo docker compose version
```

## 2. Clone The API And Web Repositories

Create a shared parent directory, then clone the two repositories with the directory names expected
by the Compose build contexts:

```bash
sudo mkdir -p /opt/posv2
sudo chown "$USER":"$USER" /opt/posv2
cd /opt/posv2
git clone git@github.com:gelowski1696/v2upgrade-api.git subsapi
git clone git@github.com:gelowski1696/v2upgrade-web.git ownerdashboard-posv2
git clone YOUR_SUBSCRIPTION_APP_REPOSITORY subscriptionapp-posv2
```

The resulting paths are `/opt/posv2/subsapi`, `/opt/posv2/ownerdashboard-posv2`, and
`/opt/posv2/subscriptionapp-posv2`. The production Compose stack is stored inside
`ownerdashboard-posv2/deployment`.

## 3. Configure Production Secrets

```bash
cd /opt/posv2/ownerdashboard-posv2/deployment
cp .env.example .env
chmod 600 .env
```

Generate five independent URL-safe values—one PostgreSQL password and four JWT secrets:

```bash
openssl rand -hex 32
openssl rand -hex 32
openssl rand -hex 32
openssl rand -hex 32
openssl rand -hex 32
```

Edit `.env`:

```bash
nano .env
```

Required changes:

1. Set `OWNER_DOMAIN=vmjamdocuai.cloud` and `ADMIN_DOMAIN=admin.vmjamdocuai.cloud`.
2. Set `ACME_EMAIL` to the certificate-administration address.
3. Put the generated PostgreSQL password in both `POSTGRES_PASSWORD` and the password portion of
   `DATABASE_URL`.
4. Replace all four JWT placeholders with different generated values.
5. Leave scheduled reports disabled until Resend is configured.
6. Keep `WEB_HOST_PORT=3200`, `API_HOST_PORT=3201`, and `SUBSCRIPTION_WEB_HOST_PORT=3202` unless a
   port is already occupied.
7. Set `SUBSCRIPTION_WEB_IMAGE_TAG` to a unique release identifier such as the release date or Git
   commit.

Do not commit or share `ownerdashboard-posv2/deployment/.env`.

## 4. Build And Start

Validate interpolation before starting the stack:

```bash
cd /opt/posv2/ownerdashboard-posv2/deployment
sudo docker compose config --quiet
```

Build and launch:

```bash
owner_web_release="$(git -C .. rev-parse --short HEAD)"
api_release="$(git -C ../../subsapi rev-parse --short HEAD)"
sudo env OWNER_WEB_RELEASE="$owner_web_release" API_RELEASE="$api_release" docker compose build --pull
sudo docker compose up -d
sudo docker compose ps
```

The API container runs `prisma migrate deploy` before starting NestJS, so committed database
migrations are applied during deployment.

Watch first-start logs:

```bash
sudo docker compose logs -f --tail=100 postgres api web subscription-web
```

Press `Ctrl+C` to stop following logs; the containers continue running.

## 5. Connect The Existing Reverse Proxy

Confirm the new loopback ports work before changing the public proxy:

```bash
curl --fail --show-error http://127.0.0.1:3201/api/v1/health
curl --head http://127.0.0.1:3200/
curl --head http://127.0.0.1:3202/
```

For host Nginx, keep the owner dashboard on `vmjamdocuai.cloud` with the following locations inside
its HTTPS server block:

```nginx
location /api/ {
    proxy_pass http://127.0.0.1:3201;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    client_max_body_size 512m;
    proxy_read_timeout 600s;
}

location / {
    proxy_pass http://127.0.0.1:3200;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

Add a second HTTPS server block for the subscription application:

```nginx
server {
    server_name admin.vmjamdocuai.cloud;

    location /api/ {
        proxy_pass http://127.0.0.1:3201;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location / {
        proxy_pass http://127.0.0.1:3202;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

For host Caddy, keep the existing owner site and add:

```caddyfile
admin.vmjamdocuai.cloud {
    handle /api/* {
        reverse_proxy 127.0.0.1:3201
    }

    handle {
        reverse_proxy 127.0.0.1:3202
    }
}
```

When host Caddy and the application Nginx both set the same response header, make Caddy replace the
upstream value by prefixing the field with `>`. This VPS uses the following policy for both private
web applications:

```caddyfile
header {
    >X-Content-Type-Options "nosniff"
    >X-Frame-Options "DENY"
    >Referrer-Policy "strict-origin-when-cross-origin"
}
```

Validate and reload the system service after changing `/etc/caddy/Caddyfile`:

```bash
sudo caddy validate --config /etc/caddy/Caddyfile
sudo systemctl reload caddy
```

If this VPS has no existing reverse proxy and ports 80/443 are free, start the bundled Caddy
instead:

```bash
sudo docker compose --profile direct-https up -d
```

## 6. Verify The Deployment

```bash
curl --fail --show-error "https://vmjamdocuai.cloud/api/v1/health"
curl --head "https://vmjamdocuai.cloud/"
curl --fail --show-error "https://admin.vmjamdocuai.cloud/api/v1/health"
curl --head "https://admin.vmjamdocuai.cloud/"
sudo docker compose ps
```

Run the automated public smoke test as well. It verifies the dashboard headers and caching, web and
API release metadata, API readiness, and end-to-end request-ID propagation:

```bash
sh ./verify-production.sh
```

The repository's `Production monitor` GitHub Actions workflow also checks the public dashboard,
database-backed API readiness, deployed release identifiers, required security headers, response
latency, and TLS certificate lifetime every 30 minutes. Enable GitHub Actions failure notifications
for the repository. Run the same monitor manually from a workstation with Node.js 22 using:

```bash
npm run monitor:production
```

Then open both public hostnames in a browser. Both production applications use same-origin
`/api/v1`; no browser-side API hostname needs to be configured. The subscription app intentionally
requires another sign-in after a full browser reload because its tokens are kept only in memory.

## 7. Create The Initial API Administrator

Use a password of at least 12 characters and quote values containing spaces:

```bash
sudo docker compose exec api npm run admin:create -- \
  admin@example.com 'REPLACE_WITH_A_STRONG_PASSWORD' 'System Administrator'
```

Portal owner accounts are still issued through the normal client/device invitation workflow.

## 8. Configure Resend Later

After the sending domain is verified in Resend, set these values in
`ownerdashboard-posv2/deployment/.env`:

```dotenv
PORTAL_SCHEDULED_REPORTS_ENABLED=true
RESEND_API_KEY=re_xxxxxxxxx
RESEND_FROM_EMAIL="VMJAM Reports <reports@your-domain.example>"
RESEND_WEBHOOK_SECRET=whsec_xxxxxxxxx
```

Configure the Resend webhook as:

```text
https://vmjamdocuai.cloud/api/v1/webhooks/resend
```

Apply the change:

```bash
sudo docker compose up -d --force-recreate api
```

## 9. Schedule Coordinated Backups

The named volumes protect data across container replacement, but they are not an off-server
backup. The API image includes PostgreSQL tools and the existing coordinated backup scripts.

Run and verify a backup manually:

```bash
sudo docker compose exec -T api npm run backup:platform
sudo docker compose exec -T api npm run backup:restore-drill
```

Schedule them on the VPS with root's crontab:

```bash
sudo crontab -e
```

Example schedule:

```cron
0 2 * * * cd /opt/posv2/ownerdashboard-posv2/deployment && /usr/bin/docker compose exec -T api npm run backup:platform >> /var/log/posv2-backup.log 2>&1
30 3 * * 0 cd /opt/posv2/ownerdashboard-posv2/deployment && /usr/bin/docker compose exec -T api npm run backup:restore-drill >> /var/log/posv2-restore-drill.log 2>&1
```

Copy the contents of the `posv2_platform_backups` volume to encrypted off-server storage on a
separate schedule.

## 10. Update The Deployment

Pull both repositories before rebuilding so API and web updates remain coordinated:

```bash
cd /opt/posv2/subsapi
git pull --ff-only origin main

cd /opt/posv2/ownerdashboard-posv2
git pull --ff-only origin main

cd /opt/posv2/subscriptionapp-posv2
git pull --ff-only origin main

cd /opt/posv2/ownerdashboard-posv2/deployment
owner_web_release="$(git -C .. rev-parse --short HEAD)"
api_release="$(git -C ../../subsapi rev-parse --short HEAD)"
sudo env OWNER_WEB_RELEASE="$owner_web_release" API_RELEASE="$api_release" docker compose build --pull
sudo docker compose up -d
sudo docker compose ps
curl --fail --show-error "https://vmjamdocuai.cloud/api/v1/health"
curl --head "https://admin.vmjamdocuai.cloud/"
sh ./verify-production.sh
```

On the current VPS, ports 80 and 443 belong to the systemd-managed Caddy service. Do not start the
Compose `direct-https` profile there. If `/etc/caddy/Caddyfile` changed, validate and reload it:

```bash
sudo caddy validate --config /etc/caddy/Caddyfile
sudo systemctl reload caddy
```

Use the Compose `direct-https` profile only on a host where no existing process owns ports 80 and 443.

To roll back only the subscription frontend, restore the previous `SUBSCRIPTION_WEB_IMAGE_TAG` in
`.env` and recreate that service without rebuilding it:

```bash
sudo docker compose up -d --no-deps --no-build subscription-web
curl --head "https://admin.vmjamdocuai.cloud/"
```

## Useful Operations

```bash
# Recent logs
sudo docker compose logs --tail=200 api web subscription-web

# Restart application containers
sudo docker compose restart api web subscription-web

# Show container and health state
sudo docker compose ps

# Stop containers without deleting persistent volumes
sudo docker compose down
```

Do not use `docker compose down -v` in production; `-v` deletes the stack's persistent data
volumes.
