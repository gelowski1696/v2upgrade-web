# Owner Dashboard Enhancement Plan

Last updated: 2026-09-28

## Purpose

Track improvements to `ownerdashboard-posv2` while preserving its read-only reporting model. Web users may inspect synchronized POS data, but they must not directly modify sales, stock, transfers, payments, or other desktop records.

## Status Legend

- [x] Complete and verified
- [ ] Not started
- [~] In progress
- [!] Blocked or requires a data decision

## Current Baseline

- [x] Portal account activation and login
- [x] Password reset using a one-time token issued by the POS application
- [x] Password change with forced logout of all sessions
- [x] Browser session listing and forced logout
- [x] Disabled-account login, refresh, and active-session protection
- [x] Store-scoped access control
- [x] Overview KPIs
- [x] Paginated sales report
- [x] Paginated inventory report
- [x] Paginated transfer report
- [x] Read-only transfer details with separate fill/empty tables, restock costing, and supplier payment history
- [x] Paginated customer-balance report
- [x] Cash-flow summary
- [x] Local-date handling for report ranges
- [x] Legacy missing-cost fallback using PHP 0.00 for display
- [x] Snapshot freshness and synchronization timestamps
- [x] Responsive desktop and mobile layouts
- [x] Coordinated metadata and store-snapshot backup
- [x] Automated backup retention and restore drill
- [x] Desktop and mobile Playwright coverage for primary portal workflows

## Phase 1: Complete Existing Reports

### 1. Sales Details Drill-Down

**Priority:** High  
**Status:** [!] Core drill-down complete; receipt attachments blocked

- [x] Make a sales row selectable.
- [x] Display sold items, quantities, unit prices, discounts, and totals.
- [x] Display customer, personnel, payment method, and transaction status.
- [x] Display synchronized sale notes when available.
- [!] Synchronize attachment metadata with the database snapshot upload.
- [!] Provide an image viewer after receipt attachments are available to the API.
- [x] Add loading, missing-record, and unsupported-attachment states.
- [x] Verify that users cannot open sales from unauthorized stores.
- [x] Add desktop and mobile tests.

**Implementation note:** The desktop POS stores receipt images in an external `attachments`
folder. Database snapshots currently contain no attachment file or metadata, so the web dialog
shows an explicit desktop-only notice. Attachment transfer must be added to the snapshot protocol
before an authenticated image endpoint and viewer can be completed safely.

**Likely areas:**

- `src/app/features/dashboard`
- `src/app/core/api/portal-api.service.ts`
- `subsapi/src/application/portal/portal-dashboard.service.ts`
- `subsapi/src/presentation/http/portal/portal-dashboard.controller.ts`

### 2. Report CSV Exports

**Priority:** High  
**Status:** [x] Complete and verified

- [x] Export Sales.
- [x] Export Inventory.
- [x] Export Transfers.
- [x] Export Customer Balances.
- [x] Export Cash Flow.
- [x] Respect the currently available store and date-range selections.
- [x] Export all matching records instead of only the visible page.
- [x] Use clear filenames containing store, report, and date range.
- [x] Prevent spreadsheet formula injection in text values.
- [x] Prevent duplicate export requests while an export is processing.
- [x] Add API, desktop, and mobile export tests.

**Implementation note:** Inventory and Customer Balances are current-snapshot reports and export
their complete current result. Every report export applies the same search and filter parameters
as its on-screen report.

### 3. Report Search And Filters

**Priority:** High  
**Status:** [x] Complete and verified

- [x] Search sales by reference or customer.
- [x] Filter sales by payment method and status.
- [x] Search inventory by item, code, or category.
- [x] Search transfers by reference, supplier, or type.
- [x] Search balances by customer or contact number.
- [x] Preserve filters while paging.
- [x] Reset the page when a filter changes.
- [x] Debounce text search to avoid unnecessary requests.
- [x] Add empty and no-match states.
- [x] Apply the same filters to CSV exports.
- [x] Ignore stale responses when filters change quickly.
- [x] Add API, desktop, and mobile tests.

**Implementation note:** Search runs on the server after a 300 ms debounce. Sales status and
payment options are derived from the selected store and date range, and changing any filter resets
the report to page one without losing the active store or date range.

### 4. Data-Quality Indicators

**Priority:** Medium  
**Status:** [x] Complete and verified

- [x] Count sales with missing recorded cost.
- [x] Treat missing legacy cost as PHP 0.00 for display.
- [x] Label incomplete calculations as recorded gross profit.
- [x] Add a compact data-quality details view.
- [x] Identify which periods and sales have missing cost.
- [x] Distinguish legacy missing cost from unexpected new-sale missing cost.
- [x] Flag incompatible or partially migrated snapshots.

**Implementation note:** The Overview opens a read-only, paginated data-quality dialog with
cost coverage, affected calendar months, and links to synchronized sale details. A missing sale
header cost is classified as legacy when no positive sold-item line cost exists and unexpected
when line cost exists but the sale header is inconsistent. This evidence-based rule avoids an
arbitrary date cutoff because recorded-cost fields predate the tracked desktop migrations. The
API also checks required cost columns and compares migration history with SQLite `user_version`.

## Phase 2: Owner Analytics

### 5. Sales Trends And Comparison

**Priority:** High  
**Status:** [x] Complete and verified

- [x] Add daily, weekly, and monthly grouping.
- [x] Compare the selected period with the immediately preceding period.
- [x] Show sales, transaction count, average sale value, and discounts.
- [x] Show recorded gross profit and cost coverage.
- [x] Keep charts readable on mobile.
- [x] Display useful loading, error, and no-data states.
- [x] Verify chart totals against the Sales report.
- [x] Exclude cancelled sales consistently with the Overview report.
- [x] Add API, desktop, and mobile tests.

**Implementation note:** The comparison period ends one day before the selected range and uses the
same number of calendar days. Changing chart grouping reloads only the trend data. Recorded gross
profit continues to treat missing legacy costs as PHP 0.00 and displays cost coverage beside it.

### 6. Product Performance

**Priority:** Medium  
**Status:** [x] Complete and verified

- [x] Show top-selling products by quantity and revenue.
- [x] Show slow-moving products.
- [x] Show recorded cost and recorded profit where available.
- [x] Add category-level summaries.
- [x] Allow navigation from a product summary to matching sales.
- [x] Verify totals against sold-item records.

**Implementation note:** Product analytics aggregate non-cancelled sold-item lines for the selected
period and preserve missing-cost visibility. Slow-moving products include synchronized inventory
items with no sales in the period. Category revenue, recorded cost, and recorded gross profit use
the same line-level source totals. Product rows open the Sales report with an exact item-code
filter that is also applied to CSV exports.

### 7. Payment Analysis

**Priority:** Medium  
**Status:** [x] Complete and verified

- [x] Show cash, credit, bank, and e-wallet totals.
- [x] Show paid versus unpaid sales.
- [x] Show credit collections received during the selected period.
- [x] Avoid counting a credit sale and its later collection as the same cash receipt.
- [x] Verify payment totals against Cash Flow.

**Implementation note:** The report separates tender received at sale time from later credit
collections, groups both by payment channel, and independently reconciles the combined receipt
amount with the Cash Flow report.

## Phase 3: Business Monitoring

### 8. Receivables Aging

**Priority:** High  
**Status:** [x] Complete and verified

- [x] Add Current, 1-30, 31-60, 61-90, and over-90-day buckets.
- [x] Show customers with the highest balances.
- [x] Show recent collections.
- [x] Open a read-only customer balance history.
- [x] Document how legacy balances without a due date are classified.
- [x] Verify the aging total equals the Customer Balances total.

**Implementation note:** The total uses positive balances from active customer records so it
matches the Customer Balances report. Unpaid sale balances are aged from the recorded sale date
because legacy sales do not have a due-date field. Undated or unmatched legacy balances remain
visible in an Unallocated legacy bucket instead of being silently assigned to an age band. The
customer history is read-only and shows open invoices plus recorded collections. Store access,
reconciliation, desktop layout, mobile layout, loading/error states, and the primary drill-down
flow are covered by automated tests.

### 9. Inventory Monitoring

**Priority:** Medium  
**Status:** [x] Complete and verified

- [x] Show critical and out-of-stock items.
- [x] Separate store and warehouse quantities.
- [x] Add inventory movement history.
- [x] Show recorded inventory value where cost is available.
- [x] Show refill and non-refill selling prices from the synchronized price list.
- [x] Mark incomplete inventory valuation clearly.
- [x] Add category and stock-status filters.

**Implementation note:** The inventory report now summarizes current store and warehouse stock,
critical and out-of-stock items, and recorded valuation coverage. Recorded inventory value uses the
current item cost for saleable filled stock in the store and warehouse; stock-bearing items without
a recorded cost are excluded and counted visibly. Item rows open a read-only, paginated movement
history combining the POS item-history ledger with inventory adjustments while avoiding duplicate
adjustment entries. Legacy snapshots without history tables return a supported empty state. API
parity tests and desktop/mobile browser tests cover filters, valuation, movements, responsive
overflow, authorization, and focus restoration.

### 10. Restock And Supplier Monitoring

**Priority:** Medium  
**Status:** [x] Complete and verified

- [x] Show confirmed restocks and received quantities.
- [x] Show supplier payments and refunds separately.
- [x] Show remaining supplier payable amounts.
- [x] Keep inventory receipt status separate from payment status.
- [x] Add supplier purchase history.
- [x] Verify restock payments against Cash Flow.

**Implementation note:** Purchase value is read from the restock transfer while payment and refund
activity is read from the supplier settlement ledger. Outstanding payable uses all settlement
activity for each visible restock; period payment totals reconcile independently to Cash Flow.

### 11. Cash-Flow Drill-Down

**Priority:** High  
**Status:** [x] Complete and verified

- [x] Show opening balance.
- [x] Show sales receipts.
- [x] Show credit collections.
- [x] Show capital cash in.
- [x] Show petty-cash out.
- [x] Show salary payments.
- [x] Show restock payments and refunds.
- [x] Show closing cash position and net movement.
- [x] Open the transactions contributing to each total.
- [x] Add a cash-flow statement export.
- [x] Add source totals and reconciliation checks.
- [x] Explain differences caused by incomplete legacy records.

**Implementation note:** Each cash-in and cash-out source now opens a read-only, paginated
transaction ledger. The API independently totals the source records and compares that amount with
the cash-flow summary, while supplier refunds remain visible as negative payments. Optional legacy
references, descriptions, methods, and notes fall back safely when older snapshots did not record
those fields. The existing Cash Flow CSV export provides the statement totals for the selected date
range. API parity tests and desktop/mobile browser tests cover reconciliation, pagination, focus
restoration, responsive overflow, and the primary source drill-down flow.

## Phase 4: Multi-Store And Alerts

### 12. Combined Business Overview

**Priority:** Medium  
**Status:** [x] Complete and verified

- [x] Add an All authorized stores selection.
- [x] Aggregate sales, recorded profit, balances, and cash movement.
- [x] Compare stores using the same date range.
- [x] Show each store's last synchronization time.
- [x] Exclude stores the account cannot access.
- [x] Prevent aggregation across incompatible snapshot schemas.

**Implementation note:** Combined totals are derived only from the signed-in account's authorized
stores and only when their active snapshots share the newest compatible schema version. Excluded
or unreadable stores remain visible as alerts instead of silently affecting totals.

### 13. Owner Alerts

**Priority:** Medium  
**Status:** [x] Complete and verified

- [x] Alert when a store snapshot is stale.
- [x] Alert for critical inventory.
- [x] Alert for unusually high discounts.
- [x] Alert for large or overdue customer balances.
- [x] Alert for synchronization failures.
- [x] Alert for backup or restore-drill failures.
- [x] Allow users to dismiss informational alerts without changing POS data.

**Implementation note:** The combined owner overview flags up to five non-cancelled sales per store
when regular and special discounts total at least 20% of the pre-discount sale amount. Each alert is
store-scoped and opens the existing read-only sale-details dialog for review. Platform backup and
restore-drill scripts record running, passed, or failed health without exposing raw server errors;
failures and operations incomplete for more than six hours appear as high-severity owner alerts.
Medium- and low-severity alerts can be dismissed per portal user. Dismissals are stored only in
owner-platform metadata, never in synchronized POS records; high-severity alerts remain visible until
their underlying condition is resolved.

### 14. Feature Mod Reports

**Priority:** Medium  
**Status:** [x] Complete and verified

- [x] Include the normalized desktop Feature Mods configuration in every synchronization snapshot.
- [x] Read the configuration through an authenticated, store-scoped endpoint without displaying Feature Mods settings on the web.
- [x] Show Summary CSV only when the `summaryCsv` Feature Mod is enabled for the selected store.
- [x] Display Summary CSV one date at a time within the selected range, with previous and next date navigation in desktop and web.
- [x] Show Financial Report only when the `financialReport` Feature Mod is enabled for the selected store.
- [x] Match the desktop report calculations, date range, empty states, and CSV exports.
- [x] Add the remaining desktop Feature Mod reports: Discount Report, Purchases, Special Receipts, and Customer Report.
- [x] Keep every web report read-only; Feature Mods may only be enabled or disabled in the POS desktop app.
- [x] Verify the report workflows on desktop and mobile layouts.

**Implementation note:** Sync snapshots contain a separate read-only copy of the normalized Feature
Mods configuration without changing the POS database schema version. An authenticated, store-scoped
capabilities response reveals only the enabled web report identifiers; it never exposes the Feature
Mods settings or status page. Summary CSV, Financial Report, Discount Report, Purchase Report,
Special Receipts, and Customer Report use read-only desktop-parity queries and client-side CSV exports.
Summary CSV loads and exports only the currently displayed day while the selected From/To range sets
the previous and next navigation boundaries.

### 15. Scheduled Reports

**Priority:** Low  
**Status:** [x] Complete and verified

- [x] Add daily and weekly summary schedules.
- [x] Deliver reports only to verified portal-account addresses.
- [x] Include store, report period, snapshot age, and data-quality status.
- [x] Do not send stale data without a visible warning.
- [x] Record delivery success and failure.
- [x] Add rate limits and retry rules.

**Implementation note:** Daily summaries cover the previous business day and weekly summaries cover
the previous seven days. Both run at 07:00 in the selected store's timezone and are sent only to the
signed-in portal username after a short-lived email-code verification. Email and CSV output includes
the store, report period, snapshot age, and cost-data quality; stale snapshots are marked prominently.
Delivery metadata is isolated from POS snapshots, with one delivery per schedule and period, no more
than 10 enabled schedules per account, hourly attempt limits, and retries after 5 and 30 minutes.
Delivery uses the Resend API with per-delivery idempotency keys. Resend message IDs and verified
webhook outcomes are retained so accepted, delivered, delayed, bounced, complained, and failed
messages remain distinguishable in the portal history.

## Phase 5: Planning And Decision Support

### 16. Inventory Forecasting And Reorder Planning

**Priority:** High  
**Status:** [x] Complete and verified

- [x] Use the selected reporting period to calculate average daily product sales.
- [x] Combine store and warehouse filled stock when calculating saleable availability.
- [x] Estimate days of stock remaining and projected demand for 7, 14, or 30 days.
- [x] Classify products as Out of stock, Reorder now, Watch, Healthy, or No recent sales.
- [x] Suggest reorder quantities using forecast demand, a seven-day lead time, and the recorded alert level.
- [x] Show the estimated reorder cost when a recorded item cost is available.
- [x] Filter by product, category, stock risk, and forecast period.
- [x] Export all matching reorder recommendations to CSV.
- [x] Keep the workflow read-only; purchasing and stock adjustments remain desktop-only.
- [x] Add API, desktop, and mobile tests.

**Implementation note:** The selected From/To range is the historical sales sample. Forecasts use
non-cancelled sold-item quantities and current synchronized filled stock. Products without recent
sales remain visible but do not receive an automatic reorder quantity. Empty-cylinder quantities
are excluded because they are not saleable filled stock.

### 17. Sales Targets And Performance Tracking

**Priority:** Medium  
**Status:** [x] Complete and verified

- [x] Add monthly sales and recorded-profit targets per store.
- [x] Show target progress using the same non-cancelled sales and recorded-cost calculations.
- [x] Show elapsed time, remaining amounts, daily pace, and projected month-end results.
- [x] Keep missing-cost coverage visible beside recorded-profit progress.
- [x] Allow owners and managers to update targets while viewers remain read-only.
- [x] Keep targets in portal metadata without changing synchronized POS records.
- [x] Add store authorization, input validation, rate limiting, and API tests.
- [x] Verify the workflow on desktop and mobile layouts.

**Implementation note:** Each store has at most one target record per calendar month. Target values
are stored in PostgreSQL portal metadata and never written into a synchronized SQLite snapshot.
Actuals reuse the Overview report definition, and calendar pacing follows the store timezone.

### 18. Product And Category Profitability

**Priority:** Medium  
**Status:** [x] Complete and verified

- [x] Rank products and categories by recorded gross profit, margin, or revenue.
- [x] Keep missing-cost line counts and cost coverage visible in profitability results.
- [x] Compare the selected period with the immediately preceding equal-length period.
- [x] Filter by product search and category without leaving the report.
- [x] Export all matching product rows to CSV with the selected ranking and filters.
- [x] Verify the responsive workflow in desktop and mobile browser tests.

**Implementation note:** Profitability is calculated from synchronized sold-item lines. Every amount
is labeled as recorded profit or recorded margin because missing costs are treated as zero by the
legacy data model. The comparison period is the equal-length range immediately before the selected
range, and all endpoints remain read-only and store-scoped.

### 19. Customer Purchase Insights

**Priority:** Medium  
**Status:** [x] Complete and verified

- [x] Add read-only customer purchase history and ranking.
- [x] Rank customers by recorded spend, visit frequency, recency, or balance.
- [x] Show visit frequency, recorded spend, average purchase, balance, and last purchase date.
- [x] Add customer/contact search and CSV export for all matching customers.
- [x] Protect customer information and purchase history with the existing store scope.
- [x] Verify the ranking and purchase-history workflow on desktop and mobile.

**Implementation note:** Insights include active registered customers with non-cancelled purchases in
the selected period. Walk-in sales without a customer ID are excluded. Spend and visit metrics use
the selected date range, while outstanding balances come from the current synchronized customer
record. Both the ranked view and history dialog are read-only.

### 20. Dashboard Preferences And Saved Views

**Priority:** Low  
**Status:** [x] Complete and verified

- [x] Allow users to choose and order the Overview metrics they see first.
- [x] Save multiple named report views per portal account.
- [x] Store each saved view's authorized store, report, date preset, and compatible filters.
- [x] Restore the complete saved view atomically from the Preferences page.
- [x] Delete individual saved views without changing POS business records.
- [x] Provide a two-step reset-to-default action.
- [x] Verify the workflow on desktop and mobile layouts.

**Implementation note:** Overview metric order and saved views are account-scoped PostgreSQL portal
metadata, separate from synchronized POS snapshots. A saved view can restore a custom date range,
Last 7 days, Last 30 days, or This month, together with a whitelisted set of report filters. Store
authorization is checked when a view is created and again through the selected report endpoint when
it is opened. Reset restores all four default metrics and removes the account's saved views.

### 21. Portal Activity Log

**Priority:** Medium  
**Status:** [x] Complete and verified

- [x] Show account logins, sign-outs, password events, and browser-session changes.
- [x] Show store snapshot synchronization and retained-snapshot restoration.
- [x] Show dashboard preferences, saved views, sales targets, alerts, and schedule changes.
- [x] Record platform backup and restore-drill outcomes.
- [x] Filter activity by authorized store, event type, and date.
- [x] Keep tokens, passwords, IP addresses, hashes, raw payloads, paths, and errors out of owner-facing messages.
- [x] Add paginated API, desktop, and mobile coverage.

**Implementation note:** The Activity Log reads the platform audit ledger through an allowlist of
owner-safe event types. The API applies portal-account and authorized-store scope before mapping raw
audit records to fixed titles and sanitized summaries; raw metadata is never returned. Backup and
restore scripts append success/failure outcomes to the same audit ledger without persisting protected
error details. The web view is read-only and supports date, event-type, store, and page navigation.

### 22. Ubuntu VPS Docker Deployment

**Priority:** High  
**Status:** [~] Production stack prepared; VPS launch pending

- [x] Add a production multi-stage Docker image for the NestJS API.
- [x] Generate both PostgreSQL and synchronized-store Prisma clients during the API image build.
- [x] Run committed Prisma migrations automatically before the API starts.
- [x] Add a production multi-stage Docker image and SPA-safe Nginx configuration for the web app.
- [x] Use same-origin `/api/v1` requests on production domains while preserving localhost development.
- [x] Add PostgreSQL, API, web, and Caddy services to a production Compose stack.
- [x] Keep PostgreSQL and the API off public host ports.
- [x] Add persistent volumes for PostgreSQL, synchronized snapshots, backups, and TLS state.
- [x] Add automatic HTTPS, HTTP-to-HTTPS redirection, health checks, and restart policies.
- [x] Add an example production environment file without real secrets.
- [x] Document first deployment, administrator creation, Resend setup, backup scheduling, updates,
      and recovery-safe shutdown commands.
- [ ] Set the real domain, email, database password, and JWT secrets on the VPS.
- [ ] Point DNS to the VPS and confirm public access to ports 80 and 443.
- [ ] Build and start the stack on Ubuntu, then verify the public web and health endpoints.
- [ ] Run and archive the first coordinated backup and restore drill.

**Implementation note:** The default Compose mode binds the web and API containers to loopback-only
host ports 3200 and 3201 so they can coexist with the VPS's existing applications and reverse
proxy. The bundled Caddy service is isolated behind the optional `direct-https` profile for servers
without an existing proxy. PostgreSQL metadata, synchronized SQLite snapshots, coordinated backups,
and Caddy certificate state use separate named volumes. The API trusts exactly one proxy hop so
authentication throttles and audit metadata see the client address supplied by the active reverse
proxy. Deployment files and the VPS runbook are in `deployment/`.

## Recommended Implementation Order

1. [!] Sales Details Drill-Down attachment synchronization
2. [x] Report CSV Exports
3. [x] Report Search And Filters
4. [x] Sales Trends And Comparison
5. [x] Receivables Aging
6. [x] Cash-Flow Drill-Down
7. [x] Inventory Monitoring
8. [x] Restock And Supplier Monitoring
9. [x] Product Performance
10. [x] Data-Quality Indicators
11. [x] Payment Analysis
12. [x] Combined Business Overview
13. [x] Owner Alerts
14. [x] Feature Mod Reports
15. [x] Scheduled Reports
16. [x] Inventory Forecasting And Reorder Planning
17. [x] Sales Targets And Performance Tracking
18. [x] Product And Category Profitability
19. [x] Customer Purchase Insights
20. [x] Dashboard Preferences And Saved Views
21. [x] Portal Activity Log
22. [~] Ubuntu VPS Docker Deployment

## Completion Requirements

A feature may be changed to `[x] Complete and verified` only when all applicable requirements
below have been satisfied. These checks apply to the features already marked complete; the blocked
Sales Details attachment work remains `[!]` until receipt files and metadata are added to the
synchronization protocol.

- [x] API authorization is store-scoped.
- [x] Calculations match the corresponding desktop report where a desktop equivalent exists.
- [x] Loading, empty, error, and stale-snapshot states are handled.
- [x] Desktop and mobile layouts have been checked.
- [x] Automated tests cover the primary workflow.
- [x] No web action mutates synchronized POS business records.
- [x] Documentation and validation steps are updated.

### Verification Record — 2026-09-28

- `subsapi`: 54 API tests passed across 6 suites, including store-authorization rejection,
  desktop-report parity, reconciliation, Feature Mod capability, export, activity-log, and
  scheduled-report coverage.
- `ownerdashboard-posv2`: 52 Playwright tests passed across desktop and mobile Chromium projects,
  covering the primary report, filter, export, drill-down, empty/error recovery, preference,
  scheduling, security, and activity workflows.
- `subsapi`: the NestJS production build completed successfully.
- `ownerdashboard-posv2`: the Angular production build completed successfully. Existing bundle-size
  warnings remain: the initial bundle is 803.12 kB against a 500 kB warning budget, and
  `owner-dashboard.component.css` is 37.04 kB against a 36 kB warning budget.
- Reporting endpoints read authorized synchronized snapshots. The web portal's write endpoints are
  limited to portal metadata such as targets, preferences, alert dismissals, schedules, and account
  security; they do not update synchronized POS sales, stock, transfers, or payment records.

## Explicitly Out Of Scope

- Editing or cancelling POS sales from the web dashboard
- Adjusting stock from the web dashboard
- Confirming or cancelling transfers from the web dashboard
- Recording payments from the web dashboard
- Enabling or disabling POS Feature Mods from the web dashboard
- Replacing the POS desktop application's operational workflows

These actions remain desktop-only until a conflict-safe two-way synchronization design is approved and implemented.
