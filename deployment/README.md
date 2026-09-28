# POSv2 Owner Dashboard — Ubuntu VPS Deployment

This stack deploys the owner dashboard and API behind one HTTPS domain:

- Caddy terminates HTTPS and renews the certificate automatically.
- Nginx serves the compiled Angular application.
- NestJS serves `/api/v1` without publishing its container port to the internet.
- PostgreSQL stores platform metadata without publishing its database port.
- Docker volumes persist PostgreSQL data, synchronized store snapshots, platform backups, and
  Caddy certificates.

## 1. Prepare DNS And The VPS

Create an `A` record for the deployment domain pointing to the VPS public IPv4 address. Add an
`AAAA` record only when IPv6 is configured and reaches this VPS. Allow inbound TCP ports 22, 80,
and 443, plus UDP 443 for HTTP/3, in the provider firewall. Do not publish PostgreSQL port 5432.

Caddy can obtain a public certificate only after the domain resolves to this VPS and ports 80 and
443 are reachable.

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
```

The resulting paths are `/opt/posv2/subsapi` for the API and
`/opt/posv2/ownerdashboard-posv2` for the web application. The production Compose stack is stored
inside `ownerdashboard-posv2/deployment`.

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

1. Set `DOMAIN` to the existing domain without `https://` or a path.
2. Set `ACME_EMAIL` to the certificate-administration address.
3. Put the generated PostgreSQL password in both `POSTGRES_PASSWORD` and the password portion of
   `DATABASE_URL`.
4. Replace all four JWT placeholders with different generated values.
5. Leave scheduled reports disabled until Resend is configured.

Do not commit or share `ownerdashboard-posv2/deployment/.env`.

## 4. Build And Start

Validate interpolation before starting the stack:

```bash
cd /opt/posv2/ownerdashboard-posv2/deployment
sudo docker compose config --quiet
```

Build and launch:

```bash
sudo docker compose build --pull
sudo docker compose up -d
sudo docker compose ps
```

The API container runs `prisma migrate deploy` before starting NestJS, so committed database
migrations are applied during deployment.

Watch first-start logs:

```bash
sudo docker compose logs -f --tail=100 postgres api web caddy
```

Press `Ctrl+C` to stop following logs; the containers continue running.

## 5. Verify The Deployment

```bash
curl --fail --show-error "https://YOUR_DOMAIN/api/v1/health"
curl --head "https://YOUR_DOMAIN/"
sudo docker compose ps
```

Then open `https://YOUR_DOMAIN` in a browser. The production web application uses same-origin
`/api/v1`; no browser-side API hostname needs to be configured.

## 6. Create The Initial API Administrator

Use a password of at least 12 characters and quote values containing spaces:

```bash
sudo docker compose exec api npm run admin:create -- \
  admin@example.com 'REPLACE_WITH_A_STRONG_PASSWORD' 'System Administrator'
```

Portal owner accounts are still issued through the normal client/device invitation workflow.

## 7. Configure Resend Later

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
https://YOUR_DOMAIN/api/v1/webhooks/resend
```

Apply the change:

```bash
sudo docker compose up -d --force-recreate api
```

## 8. Schedule Coordinated Backups

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

## 9. Update The Deployment

Pull both repositories before rebuilding so API and web updates remain coordinated:

```bash
cd /opt/posv2/subsapi
git pull --ff-only origin main

cd /opt/posv2/ownerdashboard-posv2
git pull --ff-only origin main

cd /opt/posv2/ownerdashboard-posv2/deployment
sudo docker compose build --pull
sudo docker compose up -d
sudo docker compose ps
curl --fail --show-error "https://YOUR_DOMAIN/api/v1/health"
```

## Useful Operations

```bash
# Recent logs
sudo docker compose logs --tail=200 api web caddy

# Restart application containers
sudo docker compose restart api web caddy

# Show container and health state
sudo docker compose ps

# Stop containers without deleting persistent volumes
sudo docker compose down
```

Do not use `docker compose down -v` in production; `-v` deletes the stack's persistent data
volumes.
