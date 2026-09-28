# Owner Dashboard Feature Guide

Illustrated edition: [Owner Dashboard Feature Guide PDF](./OWNER_DASHBOARD_FEATURE_GUIDE.pdf)

Regenerate the PDF and representative dashboard screenshots with:

```bash
npm run docs:feature-guide
```

## The Short Pitch

The POSV2 Owner Dashboard turns synchronized store records into a secure, read-only management
workspace. Owners can see sales, stock, profit, customer balances, cash movement, purchasing, and
multi-store risks from any authorized browser without exposing operational controls that belong in
the POS desktop application.

The result is simple: less time asking each branch for updates, faster answers to business
questions, and a clear view of which records are complete, current, and ready for a decision.

## Why Owners Can Trust It

- **Read-only by design.** The dashboard cannot cancel sales, adjust stock, confirm transfers, or
  record payments. Operational changes remain in the POS desktop application.
- **Store-scoped access.** Every report is limited to the stores assigned to the signed-in account.
- **Synchronized evidence.** Reports show when the source snapshot was created and synchronized.
- **Visible data quality.** Missing legacy costs and incomplete records are disclosed instead of
  being hidden behind confident-looking totals.
- **Consistent reporting.** Filters, drill-downs, and CSV exports use the same report definitions.

## Dashboard Features

### Overview

**Pitch:** Know the condition of a store in seconds.

The Overview puts gross sales, recorded gross profit, customer balances, and inventory alerts at
the top of the workspace. It also shows sales trends, period comparisons, synchronization
freshness, and cost-data coverage, giving the owner a dependable starting point before opening a
detailed report.

### Sales Records And Transaction Details

**Pitch:** Move from a sales total to the exact transaction behind it.

Owners can search and filter sales, page through matching records, and open a read-only transaction
view containing the customer, personnel, payment method, status, notes, sold items, discounts,
costs, and totals. This makes questions about a transaction answerable without opening the store's
working POS terminal.

### Sales Trends And Period Comparison

**Pitch:** See whether performance is improving, not just what happened today.

Daily, weekly, and monthly trends compare the selected period with the immediately preceding
equal-length period. Gross sales, transaction count, average sale value, discounts, and recorded
profit move together in one view so changes in volume and profitability are easy to distinguish.

### Sales Targets

**Pitch:** Turn monthly goals into a visible daily pace.

Owners and managers can set monthly sales and recorded-profit targets in portal metadata. The
dashboard shows progress, remaining amounts, elapsed time, required daily pace, and projected
month-end performance. Target settings never change synchronized POS transactions.

### Product Performance

**Pitch:** Find the products driving revenue and the stock that is not moving.

The report ranks products by quantity and revenue, identifies slow-moving items, summarizes product
categories, and keeps recorded costs and missing-cost lines visible. Selecting a product opens the
matching Sales records for evidence behind the ranking.

### Product And Category Profitability

**Pitch:** Focus on what earns, not only what sells.

Products and categories can be ranked by recorded gross profit, recorded margin, or revenue. The
report compares the chosen period with the previous equal-length period and shows cost coverage so
owners can separate strong margins from incomplete legacy cost records.

### Payment Analysis

**Pitch:** Understand how sales become cash, credit, bank, or e-wallet receipts.

Payment Analysis separates sale-time tender from later credit collections, groups receipts by
channel, and distinguishes paid from unpaid sales. Its totals reconcile with Cash Flow without
counting a credit sale and its later collection twice.

### Inventory Monitoring

**Pitch:** See what is available, what is critical, and how much recorded stock is worth.

Inventory combines store and warehouse filled/empty quantities, critical and out-of-stock states,
refill and non-refill selling prices, item cost, and recorded value. Category and stock-status
filters shorten the path to an exception, while item movement history explains how stock changed.

### Reorder Planning

**Pitch:** Replace stock guesswork with a practical purchase signal.

Reorder Planning uses recent non-cancelled product sales and current filled stock to estimate daily
demand, days remaining, projected demand, suggested reorder quantity, and estimated reorder cost.
Owners can plan for 7, 14, or 30 days and filter products by category or stock risk. It remains a
recommendation only; purchasing stays in the desktop application.

### Transfer Records And Details

**Pitch:** Trace every stock movement from its reference to its individual cylinders or items.

Transfer records are searchable by reference, supplier, and type. The detail view separates filled
and empty items into two tables and, for restock transfers, shows purchase costing and supplier
payment history. This keeps physical movement, purchase value, and settlement status understandable.

### Restocks And Suppliers

**Pitch:** See what was received, what was paid, and what is still owed.

The report separates confirmed inventory receipts from supplier payments and refunds. It shows
received quantity, purchase value, net payments, and outstanding payable amounts without treating
payment status as inventory receipt status.

### Customer Balances And Receivables Aging

**Pitch:** Put collection priorities in the right order.

Customer balances are grouped into Current, 1–30, 31–60, 61–90, and over-90-day aging buckets.
Owners can identify the largest balances, see recent collections, and open read-only customer
balance history. Legacy balances without a reliable transaction date remain visibly unallocated.

### Customer Purchase Insights

**Pitch:** Recognize the customers who return, spend, and still carry a balance.

Registered customers can be ranked by spend, visit frequency, recency, or current balance. The
report shows visits, recorded spend, average purchase, last purchase, and spend share, with a
read-only purchase history for deeper review. Walk-in sales without a customer record are excluded.

### Cash Flow And Source Drill-Down

**Pitch:** Explain the movement from opening cash to closing cash.

Cash Flow separates sales receipts, credit collections, capital cash-in, petty cash, salary
payments, restock payments, and supplier refunds. Every source can open its contributing transaction
ledger, and reconciliation checks expose differences caused by incomplete legacy records.

### All Stores And Owner Alerts

**Pitch:** Manage several branches by exception from one screen.

The combined view compares authorized stores using the same date range and compatible snapshot
schema. It aggregates sales, recorded profit, balances, and cash movement while highlighting stale
snapshots, critical inventory, unusual discounts, large or overdue balances, synchronization
problems, and platform backup failures.

### Feature Mod Reports

**Pitch:** Bring the desktop reports a business already uses into the owner's browser.

When enabled in the POS desktop application, the dashboard can show Summary CSV, Financial Report,
Discount Report, Purchases, Special Receipts, and Customer Report. The web portal displays the
reports but never exposes or changes the Feature Mods settings themselves.

### Summary CSV

**Pitch:** Review inventory movement one business date at a time.

The selected From/To range defines the available dates, while Previous Date and Next Date move
through one daily summary at a time. This keeps opening quantities, deliveries, sales, movements,
and actual filled/empty stock readable and makes the exported CSV match the date on screen.

### Financial Report

**Pitch:** Connect inventory quantities, recorded costs, sales, and gross profit in one report.

The report follows the desktop Feature Mod calculation and keeps product-level values, period
totals, and missing-cost limitations visible. It is intended for review and export, not journal or
inventory adjustment.

### Discount, Purchase, Special Receipt, And Customer Reports

**Pitch:** Give owners direct access to the supporting reports behind daily operational questions.

These desktop-parity reports cover discounts applied, supplier purchases, special receipt activity,
and customer sales. They inherit the dashboard's store authorization, date scope, empty states, and
read-only behavior.

### Search, Filters, And CSV Exports

**Pitch:** Move from a broad report to a usable answer—and take the same answer with you.

Search and report-specific filters run on the server, preserve paging, and ignore stale requests
when filters change quickly. CSV export includes every matching record, not only the visible page,
and protects spreadsheet users from formula injection.

### Scheduled Reports

**Pitch:** Deliver a dependable store summary without waiting for someone to request it.

Verified portal accounts can schedule daily or weekly summaries for authorized stores. Each email
states the reporting period, snapshot age, and data-quality status. Delivery attempts and provider
outcomes remain visible, including delays, bounces, complaints, and failures.

### Dashboard Preferences And Saved Views

**Pitch:** Let each owner return to the numbers and report setup that matter to them.

Users can choose and order their Overview metrics and save named views containing a store, report,
date preset or custom dates, and compatible filters. Opening a saved view restores that complete
context. A two-step reset returns the account to the default metrics and removes its saved views.

### Security And Browser Sessions

**Pitch:** Give the owner control over where the dashboard account is being used.

The portal supports one-time account activation, password reset, password change, session listing,
individual session revocation, and sign-out of other browsers. Disabled accounts lose access, and
password changes revoke every active session.

### Data-Quality Indicators

**Pitch:** Show where a number is reliable and where its source record needs caution.

Cost coverage and missing-cost counts accompany profit calculations. A dedicated read-only view
identifies affected periods and sales and distinguishes expected legacy gaps from inconsistent new
records. Missing legacy costs display as PHP 0.00 but are never presented as complete data.

### Synchronization, Backup, And Recovery Visibility

**Pitch:** Make report freshness and platform protection visible instead of assumed.

Every report identifies its active synchronized snapshot. Coordinated backups protect PostgreSQL
portal metadata and store snapshots together, while restore drills and retention checks surface
failures as owner alerts without exposing sensitive infrastructure details.

### Portal Activity Log

**Pitch:** Keep a clear, safe record of important portal and synchronization events.

The Activity Log provides a chronological, filterable history of account access, browser-session
changes, store synchronization, backup/restore health, and portal metadata changes. Entries use
owner-safe summaries rather than passwords, tokens, raw request payloads, or internal error details.

## Positioning Summary

POSV2 remains the operational system used by store staff. The Owner Dashboard is the management
and decision layer: accessible remotely, scoped to authorized stores, transparent about data
quality, and deliberately unable to alter synchronized business records.
