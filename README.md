# POSV2 Owner Dashboard

Read-only Angular dashboard for store owners. It displays the last database snapshot synchronized from the POS desktop application through `subsapi`.

## Requirements

- Node.js 22
- `subsapi` running and configured with the dashboard origin in `CORS_ORIGINS`
- A synchronized store snapshot and an activated portal account

## Development

Start `subsapi` first, then run:

```powershell
npm install
npm start
```

Open `http://localhost:4200/`. The development API uses the same hostname on port 3100, for example
`http://localhost:3100/api/v1`.

For a different local API, set `posv2.portalApiUrl` in browser local storage before signing in.
Production always uses the same-origin `/api/v1` proxy and ignores this development override.

Owner browser sessions use a short-lived access token held only in memory and a rotating refresh
credential stored by the API in an HttpOnly cookie. Local development must use the same hostname for
the dashboard and API (for example, `127.0.0.1` for both). Production must use HTTPS and list the
exact dashboard origin in both `CORS_ORIGINS` and the narrower `PORTAL_WEB_ORIGINS`.

## Build

```powershell
npm run build
npm run verify:production-build
```

The optimized output is written to `dist/ownerdashboard-posv2`. The verification command rejects
source maps, development API URLs, server-only secret names, private keys, and CSP-incompatible
stylesheet loading in the production bundle.

## Browser tests

Install the Playwright browser once, then run the owner workflows:

```powershell
npx playwright install chromium
npm test
```

The suite starts an isolated dashboard server and checks activation, login, password recovery,
session management, password changes, store-scoped reporting, profitability comparisons and CSV
exports, responsive layouts, and access-token refresh on desktop and mobile Chromium.

## Continuous integration

GitHub Actions builds and verifies the production bundle, runs the complete desktop/mobile
Playwright suite, audits npm dependencies, scans repository history for secrets, builds the runtime
container, and blocks fixed high or critical image vulnerabilities. Browser traces, screenshots,
and the HTML report are retained for seven days when the browser job fails.

Protect `main` in the GitHub repository settings and require these checks before merging:

- Build and browser tests
- Dependency and secret scan
- Container build and scan

## Access Flow

1. In the POS desktop app, open Settings > Online dashboard.
2. Synchronize the latest database snapshot.
3. Create a web access invitation and securely send its one-time token to the owner.
4. The owner activates the account, sets a password, and signs in.

The POS administrator can issue a one-time password reset token without enabling a disabled account. Owners can change their password and review or revoke active browser sessions from the shield button beside Sign out. Password changes revoke every session and return the owner to Sign in.

The dashboard cannot edit POS data. Every report identifies when its snapshot was created and synchronized.

The Profitability report ranks products and categories by recorded gross profit, margin, or revenue.
It compares the selected dates with the immediately preceding equal-length period and keeps missing
cost coverage visible in the summary and product ledger. Search, category, and ranking filters also
apply to its CSV export.

Customer Insights ranks registered customers by recorded spend, visit frequency, purchase recency,
or current outstanding balance. Owners can search by customer or contact, export matching rankings,
and open a read-only purchase history for the selected reporting period. Walk-in sales without a
registered customer ID are not included.

Preferences lets each portal account choose and order the four Overview metrics and keep multiple
named report views. Saved views restore the authorized store, report, relative or custom date range,
and compatible search/filter values together. These settings are portal metadata and never modify
the synchronized POS database. Reset to defaults requires a second confirmation.

Activity Log shows a paginated, read-only history of account access, browser-session changes,
store synchronization, portal settings, schedules, backup, and restore-drill outcomes. Date, event
type, and authorized-store filters are available. Owner-facing entries use fixed safe summaries and
never include raw audit metadata.

## Application Structure

```text
src/app/
|-- core/api/          HTTP and session persistence
|-- domain/models/     Portal and report contracts
|-- features/dashboard Reporting workspace and authentication entry
|-- features/security  Password and browser-session controls
`-- app.*              Thin application composition shell
```

Feature components depend on the core API and domain contracts. The root component contains no business or report state.

The tracked enhancement roadmap is available in [`docs/OWNER_DASHBOARD_ENHANCEMENT_PLAN.md`](docs/OWNER_DASHBOARD_ENHANCEMENT_PLAN.md).
For client presentations and feature explanations, see
[`docs/OWNER_DASHBOARD_FEATURE_GUIDE.md`](docs/OWNER_DASHBOARD_FEATURE_GUIDE.md).
