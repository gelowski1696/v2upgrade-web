# LPG Public Landing Page And 3D Storytelling Plan

Last updated: 2026-10-23

## Purpose

Create a premium public homepage for `ownerdashboard-posv2` that appears before sign-in and explains
the Owner Dashboard through an LPG-specific miniature world. The experience should show the journey
from supply and cylinder handling to retail sales, delivery, collections, and multi-store owner
visibility.

This is a production implementation plan, not a request for a static concept. The final page must be
responsive, accessible, performant, connected to the existing authentication flow, and honest about
the product's current read-only, synchronized-data model.

## Status Legend

- [x] Existing capability or confirmed repository baseline
- [ ] Planned work
- [~] In progress
- [!] Requires a product, content, or deployment decision

## Current Baseline

- [x] Angular 21 standalone application with Angular Router.
- [x] Tailwind CSS 4 is available globally.
- [x] The root route currently combines session restoration, authentication, and the signed-in
      dashboard in `OwnerDashboardComponent`.
- [x] Login, activation, and password reset are modes inside the existing root component.
- [x] The portal uses an in-memory access token and a rotating HttpOnly refresh cookie.
- [x] The dashboard is read-only for synchronized POS sales, stock, transfers, and payment records.
- [x] The current palette is charcoal, warm ivory, and VMJAM gold.
- [x] The existing production build prohibits source maps and unsafe production configuration.
- [x] Desktop and mobile Playwright coverage exists for authentication and dashboard workflows.
- [ ] There is no public marketing route or LPG-focused product story.
- [ ] Three.js and GSAP are not installed.
- [ ] The current `noindex,nofollow,noarchive` metadata applies to the entire application.

## Product Boundary

The public page may explain and visualize these existing capabilities:

- LPG sales and transaction reporting.
- Filled and empty cylinder stock visibility.
- Restocks, supplier purchases, payments, refunds, and payables.
- Refill and non-refill pricing from synchronized records.
- Inventory movement, reorder planning, and product performance.
- Customer balances, receivables aging, and recorded collections.
- Cash flow, targets, profitability, alerts, and multi-store comparison.
- Snapshot freshness, data-quality indicators, and store-scoped access.

The page must not claim:

- Live GPS, vehicle, tank-level, or IoT telemetry.
- Real-time inventory when the data comes from the latest POS synchronization.
- Cylinder serial-number tracking unless that capability is implemented separately.
- Remote stock changes, sale cancellation, transfer confirmation, or payment recording.
- Engineering compliance of the miniature depot layout.

Every product claim should use language such as "latest synchronized records," "recorded profit,"
or "read-only view" where that qualification matters.

## Experience Thesis

### Visual thesis

A cinematic tabletop LPG network at first light: matte charcoal infrastructure, warm ivory ground,
brushed-metal tanks and cylinders, and a single VMJAM-gold brand accent. The miniature should feel
precise, dependable, and operational rather than playful or futuristic.

### Content plan

1. **Hero:** Brand, LPG owner-dashboard promise, primary sign-in action, and the full miniature world.
2. **Operational story:** Supply, cylinder stock, retail sale, delivery, and collections told through
   scroll-controlled camera chapters.
3. **Owner value:** Explain the reports behind the story using real dashboard capabilities and one
   representative product interface image.
4. **Trust:** Read-only access, store scope, synchronization freshness, and visible data quality.
5. **Final action:** Sign in, activate an invited account, or return to the POS administrator for an
   access invitation.

### Interaction thesis

- The page scroll moves one orthographic camera through a continuous LPG miniature; scrolling back
  reverses the route naturally.
- Physical activity in the scene changes with the active chapter: a supply truck arrives, cylinders
  are sorted, a delivery vehicle departs, and branch signals illuminate.
- Interface text enters with short, restrained reveals while the final scene resolves into a calm
  owner-level overview and a clear sign-in action.

## Technology Decision

The reference stack names React Three Fiber and Drei, but this repository is Angular. Do not add a
second UI framework simply to host the scene.

Use:

- Angular 21 standalone components and lazy routes.
- `three` directly for the scene, renderer, camera, geometry, materials, and animation state.
- `gsap` with `ScrollTrigger` for scroll progress, chapter transitions, and camera scrubbing.
- Tailwind CSS 4 for concise public-page layout utilities.
- Focused component CSS for scene layering, authored effects, and complex responsive states.
- Angular `NgZone.runOutsideAngular()` for the render loop and scroll-driven 3D updates.
- `ChangeDetectionStrategy.OnPush` for all new public and authentication components.

Do not install:

- React, React DOM, `@react-three/fiber`, or `@react-three/drei`.
- A general-purpose 3D model library for the first version.
- Runtime assets or scripts from a CDN.

Planned dependencies:

```text
three
gsap
@types/three (development dependency, only if required by the selected Three.js release)
```

Pin exact versions in `package-lock.json`, run the existing dependency audit, and verify that GSAP's
club-only plugins are not referenced.

## Proposed Information Architecture

### Route map

| Route             | Audience             | Purpose                                          | Indexing                     |
| ----------------- | -------------------- | ------------------------------------------------ | ---------------------------- |
| `/`               | Public               | LPG product homepage and storytelling experience | `index,follow`               |
| `/login`          | Invited owners       | Existing username/password sign-in               | `noindex,nofollow`           |
| `/activate`       | Newly invited owners | One-time activation token and password creation  | `noindex,nofollow`           |
| `/reset-password` | Existing owners      | POS-issued reset token and password update       | `noindex,nofollow`           |
| `/dashboard`      | Authenticated owners | Existing reporting workspace                     | `noindex,nofollow,noarchive` |
| `/privacy`        | Public               | Existing privacy policy                          | `index,follow`               |

### Routing behavior

- [ ] Keep `/` public even when a refresh cookie exists; change the primary action to
      **Open dashboard** only after a successful, non-blocking session check.
- [ ] A successful sign-in or activation navigates to `/dashboard`.
- [ ] A successful password reset navigates to `/login` with a one-time success message.
- [ ] Signing out navigates to `/`.
- [ ] Opening `/dashboard` without a valid session redirects to `/login` and retains a safe return
      URL containing only an internal path.
- [ ] Opening an auth route with a valid session redirects to `/dashboard`.
- [ ] Preserve HttpOnly refresh-cookie behavior and never put access, activation, or reset tokens in
      analytics, logs, local storage, or a return URL.

## Page Composition And Copy Direction

The first viewport must behave like a poster: one brand, one promise, one dominant 3D world, and one
primary action. Do not place a dashboard card grid or KPI strip in the hero.

### 1. Global navigation

- Left: compact VMJAM SALES wordmark plus `LPG Owner Dashboard` descriptor.
- Center on wide screens: `How it works`, `What you can see`, and `Why owners trust it` anchors.
- Right: primary **Sign in** action.
- Mobile: wordmark, sign-in action, and an accessible menu button only when anchor links do not fit.
- Navigation starts transparent over the hero and gains a charcoal surface after the first chapter.

### 2. Hero

Recommended production copy:

```text
VMJAM SALES

Your LPG business, in one clear view.

Review sales, filled and empty stock, restocks, cash flow, balances, and branch performance from the
latest POS synchronization.

[Sign in to owner dashboard]  [See how it works]

Read-only. Store-scoped. Synced from your POS.
```

Composition:

- Full-bleed 3D canvas or first-party poster fallback.
- Text anchored to the calm upper-left portion of the scene.
- Miniature network occupies the center and right side.
- A small, non-interactive scroll cue disappears after the user begins scrolling.
- No fake dashboard statistics and no unsupported customer logos.

### 3. Scroll story chapters

Each chapter gets one business idea, one short statement, and one scene action.

| Chapter                | Suggested heading                   | Supporting message                                                                                          | Product capability represented       |
| ---------------------- | ----------------------------------- | ----------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| 1. Network overview    | `One operation. One owner view.`    | See the LPG business from supply to branch performance.                                                     | Overview and all-stores comparison   |
| 2. Supply arrival      | `Know what came in.`                | Review confirmed restocks, supplier value, payments, refunds, and remaining payables.                       | Restock and supplier monitoring      |
| 3. Cylinder flow       | `Separate filled from empty.`       | See store and warehouse quantities, critical stock, movement history, and reorder signals.                  | Inventory monitoring and forecasting |
| 4. Counter sale        | `See what sells—and what earns.`    | Follow transactions into product performance, recorded cost, margin, and profit.                            | Sales and profitability              |
| 5. Delivery and credit | `Turn sales into collected cash.`   | Review payment channels, customer balances, aging, and recorded collections.                                | Payment analysis and receivables     |
| 6. Branch network      | `Manage every branch by exception.` | Compare authorized stores and focus on stale snapshots, low stock, unusual discounts, and overdue balances. | Multi-store overview and alerts      |
| 7. Owner decision      | `Clarity before the next move.`     | Use synchronized evidence to plan stock, targets, purchasing, and collections.                              | Read-only management dashboard       |

### 4. Product evidence section

After the cinematic sequence, show the real application rather than continuing with abstract
marketing claims.

- Use one large browser-framed image from the repository's feature-guide assets, preferably the
  Overview or Business view.
- Add a compact text rail for `Sales and profit`, `Filled and empty stock`, `Cash and credit`, and
  `All stores and alerts`.
- Selecting a rail item swaps the large screenshot with a crossfade; do not build a mosaic of small
  cards.
- Label screenshots as representative synchronized data.
- Use only screenshots generated from controlled test fixtures with no real customer information.

### 5. Trust section

Use four plain rows or columns separated by rules, not floating cards:

- **Read-only by design** — reporting does not cancel sales, adjust stock, or record payments.
- **Store-scoped access** — an owner sees only assigned stores.
- **Freshness is visible** — reports identify when a snapshot was created and synchronized.
- **Gaps stay visible** — missing legacy costs and incomplete records are disclosed.

### 6. Final action

Recommended copy:

```text
Your next store check can start here.

Sign in to review the latest synchronized LPG business records. Need access? Create an invitation
from Settings > Online dashboard in the POS desktop application.

[Sign in]  [Activate invited account]
```

The footer should include the privacy-policy link, product name, release-independent copyright, and
a clear statement that operational changes remain in the POS desktop application.

## Procedural 3D World

All first-version scene models should be authored in TypeScript from reusable Three.js primitives.
This avoids external asset licensing, keeps the visual language coherent, and allows aggressive
instancing on mobile.

### World layout

Build one connected, stylized site on a rounded rectangular base:

- Supplier entrance with gate, weigh point, and arriving LPG delivery vehicle.
- Horizontal bulk storage tanks behind a safety fence.
- Cylinder receiving and inspection zone.
- Filled-cylinder and empty-cylinder storage cages with clearly different placement, not color
  alone.
- Refill/depot building shown externally; avoid depicting unsafe or technically misleading filling
  procedures.
- Retail counter and POS storefront.
- Dispatch bay with a caged cylinder delivery truck.
- Road loop connecting a second and third miniature branch.
- Small commercial and household delivery destinations.
- Subtle branch beacons used only in the multi-store reveal.
- Landscaping, curbs, road markings, barriers, and safety signage for scale and depth.

### Reusable model factories

Create these as code-owned scene factories rather than monolithic meshes:

```text
createCylinder({ size, state, brandColor })
createCylinderRack({ rows, columns, state })
createDeliveryTruck({ brandColor, cargoMix })
createSupplierTanker({ brandColor })
createStorageTank({ length, supports })
createDepotBuilding({ signText })
createRetailStore({ branchLabel })
createRoadSegment({ kind, length })
createSafetyFence({ length })
createPallet({ cylinderCount })
createBranchBeacon({ status })
```

Requirements:

- [ ] Use shared `BufferGeometry` and `Material` instances.
- [ ] Use `InstancedMesh` for cylinders, fence posts, trees, bollards, and repeated road details.
- [ ] Use a simple wheel hierarchy so truck wheels rotate from distance traveled.
- [ ] Use low-segment cylinders and rounded boxes where silhouette quality benefits most.
- [ ] Add tiny label planes only where legible; do not rely on text baked into the 3D world.
- [ ] Create soft contact shadows from simple receiver meshes or a restrained shadow map.
- [ ] Dispose geometry, materials, textures, renderer, observers, and animation frames on destroy.

### Material and lighting system

Suggested palette:

```text
Charcoal infrastructure  #17140f
Warm ivory ground        #f4ecdc
VMJAM gold               #d79b24
Brushed steel            #9b9b94
Concrete                  #c8c0b3
Road                      #37342f
Planting                  #66715d
Safety red (sparingly)    #a94834
```

- One warm directional key light and one broad hemisphere fill.
- Soft ambient occlusion appearance from contact shadows and material value separation.
- Physically plausible roughness without expensive transmission or reflections.
- No neon glow, floating glass cards, excessive bloom, or colored fog.
- No open flame, sparks, smoking, or other unsafe visual cues near LPG assets.
- Safety geometry is illustrative and must not be presented as a compliant engineering plan.

### Camera

- Use an orthographic camera with an approximately isometric base angle.
- Derive frustum size from viewport aspect ratio, not fixed desktop coordinates.
- Interpolate both camera position and look target through authored keyframes.
- Keep text-safe negative space in every chapter framing.
- Avoid free orbit controls on the public page; the authored camera is the narrative.
- Use damped interpolation so ScrollTrigger progress changes do not feel mechanical.

## Scroll And Animation Timeline

Use one pinned visual world with normal document sections layered above it. The document must remain
usable when pinning, JavaScript, or WebGL is unavailable.

| Progress    | Camera focus                    | Scene action                                                         | UI action                                       |
| ----------- | ------------------------------- | -------------------------------------------------------------------- | ----------------------------------------------- |
| `0.00–0.12` | Full LPG network                | Gentle ambient vehicle idle and beacon pulse                         | Hero copy enters in a short sequence            |
| `0.12–0.27` | Supplier gate and bulk storage  | Supplier vehicle arrives; unloading indicator progresses             | Supply chapter replaces hero support copy       |
| `0.27–0.42` | Cylinder receiving and storage  | Empty cylinders move to one rack; filled cylinders appear in another | Filled/empty labels resolve beside the scene    |
| `0.42–0.57` | Retail counter and dispatch bay | A sale marker completes; delivery truck is loaded                    | Sales and profit copy enters                    |
| `0.57–0.70` | Road and customer destinations  | Truck follows a curved route; wheels rotate by traveled distance     | Payment and receivables copy tracks the vehicle |
| `0.70–0.84` | Multiple branches               | Camera rises; branch beacons and road links activate                 | Multi-store message enters                      |
| `0.84–1.00` | Full network owner view         | Activity settles into a composed overview                            | Final statement and sign-in action appear       |

Implementation rules:

- [ ] Create one master GSAP timeline with labels for the seven chapters.
- [ ] Set animation state from normalized scroll progress so reverse scrolling is deterministic.
- [ ] Calculate vehicle position and tangent from a `CatmullRomCurve3` path.
- [ ] Calculate wheel rotation from accumulated path distance rather than elapsed time.
- [ ] Keep independent ambient animation subtle and pause it when the page is hidden.
- [ ] Refresh ScrollTrigger after fonts, the poster, and responsive layout are stable.
- [ ] Kill every ScrollTrigger and GSAP context when the landing component is destroyed.
- [ ] Do not let the canvas intercept navigation, text selection, or screen-reader order.

## Responsive And Reduced-Motion Behavior

### Desktop, `>= 1024px`

- Full world and all seven chapters.
- Pinned visual plane with copy moving between left and right safe areas.
- Desktop quality tier with shadows, more environmental instances, and device pixel ratio capped at
  `1.5`.

### Tablet, `768px–1023px`

- Preserve the seven chapters but shorten camera travel and reduce scene decoration.
- Keep copy in one consistent lower-left safe area.
- Cap device pixel ratio at `1.35`.

### Mobile, `< 768px`

- Use a portrait crop and five combined camera beats: overview, supply, cylinders, sales/delivery,
  and branch reveal.
- Keep content in normal flow beneath a sticky or aspect-ratio-limited scene instead of pinning the
  canvas for an excessive scroll distance.
- Reduce instance counts, disable secondary shadows, and cap device pixel ratio at `1.2`.
- Ensure primary actions are at least 44 by 44 CSS pixels.

### Reduced motion and fallback

- Honor `prefers-reduced-motion: reduce` before creating ScrollTrigger.
- Show the first-party static poster with normal document sections and no pinned scrolling.
- Stop vehicle, beacon, and camera animation while preserving every message and CTA.
- Use the same fallback when WebGL creation fails or repeated context loss occurs.
- Provide descriptive alternative text for the poster and mark the live canvas decorative because
  the adjacent HTML carries the complete story.

## First-Party Asset Plan

The initial experience should not depend on purchased or downloaded 3D models.

Create and keep in the repository:

- `public/landing/lpg-world-poster.webp` — rendered from the procedural scene for first paint,
  reduced motion, and WebGL fallback.
- `public/landing/lpg-world-poster-mobile.webp` — portrait crop rendered from the same scene.
- `public/landing/og-lpg-dashboard.jpg` — social share image using the same world and approved copy.
- `public/landing/vmjam-wordmark.svg` — clean, accessible horizontal derivative of the existing
  black-and-gold identity; review before replacing any current logo usage.
- Optimized dashboard evidence screenshots generated from Playwright fixtures.

Asset rules:

- [ ] Build all 3D geometry in code and render the posters from that owned scene.
- [ ] Do not include third-party brand names, cylinder marks, vehicle badges, or stock imagery.
- [ ] Remove fixture customer names, phone numbers, emails, addresses, and transaction identifiers.
- [ ] Store original scene-render settings in a small script so poster generation is repeatable.
- [ ] Record image dimensions, compression settings, and alt text in an asset manifest.
- [ ] Keep the existing `mam-logo.png` until the new wordmark is approved; do not silently replace
      the current brand asset.

## Proposed Angular Structure

```text
src/app/
|-- core/
|   |-- auth/
|   |   |-- auth-session.service.ts
|   |   |-- auth.guard.ts
|   |   `-- public-only.guard.ts
|   `-- seo/
|       `-- route-meta.service.ts
|-- features/
|   |-- landing/
|   |   |-- lpg-landing-page.component.ts
|   |   |-- lpg-landing-page.component.html
|   |   |-- lpg-landing-page.component.css
|   |   |-- lpg-story.config.ts
|   |   |-- components/
|   |   |   |-- landing-navigation.component.ts
|   |   |   |-- story-chapter.component.ts
|   |   |   |-- product-evidence.component.ts
|   |   |   `-- landing-footer.component.ts
|   |   `-- scene/
|   |       |-- lpg-world.component.ts
|   |       |-- lpg-scene.service.ts
|   |       |-- lpg-scene.types.ts
|   |       |-- geometry/
|   |       |   |-- cylinder.factory.ts
|   |       |   |-- vehicles.factory.ts
|   |       |   |-- depot.factory.ts
|   |       |   `-- environment.factory.ts
|   |       `-- animation/
|   |           |-- camera-path.ts
|   |           `-- vehicle-paths.ts
|   |-- auth/
|   |   |-- portal-auth.component.ts
|   |   |-- portal-auth.component.html
|   |   `-- portal-auth.component.css
|   `-- dashboard/
|       `-- owner-dashboard.component.*
public/landing/
|-- lpg-world-poster.webp
|-- lpg-world-poster-mobile.webp
|-- og-lpg-dashboard.jpg
`-- vmjam-wordmark.svg
```

Keep the scene factories framework-independent where practical. Angular should own lifecycle,
accessibility, and layout; Three.js should own only rendering and scene state.

## Authentication Refactor

The landing page should not be added inside the already large
`OwnerDashboardComponent`. First separate authentication and session initialization without changing
the API's security model.

- [ ] Move the current login/activation/reset form and its state into `PortalAuthComponent`.
- [ ] Move one-time session restoration into `AuthSessionService` with a shared initialization
      promise so guards and components cannot issue competing refresh calls.
- [ ] Keep access tokens in memory only.
- [ ] Keep refresh credentials in the existing HttpOnly cookie.
- [ ] Preserve CSRF header behavior for refresh, login, activation, and logout.
- [ ] Move the authenticated workspace to `/dashboard` without changing its report APIs.
- [ ] Preserve focus behavior, error announcements, password autocomplete values, and minimum
      password rules.
- [ ] Accept auth mode from the route, not from an externally supplied unrestricted query value.
- [ ] Update browser tests to use route helpers instead of assuming every workflow begins at `/`.

## SEO, Metadata, And Sharing

- [ ] Replace the global private-dashboard description with a neutral app-shell default.
- [ ] Set the homepage title to `LPG Owner Dashboard | VMJAM Sales`.
- [ ] Use a factual description mentioning synchronized sales, cylinder stock, cash flow, and
      multi-store reporting.
- [ ] Apply canonical metadata for the configured production origin.
- [ ] Add Open Graph and social preview metadata using the first-party share image.
- [ ] Apply `index,follow` only to public content routes.
- [ ] Apply `noindex,nofollow,noarchive` to all auth and dashboard routes.
- [ ] Include semantic `header`, `nav`, `main`, `section`, and `footer` structure with one page `h1`.
- [ ] Do not place secrets, user-specific data, or environment internals in metadata.

## Accessibility Requirements

- [ ] Meet WCAG 2.2 AA contrast for text, controls, focus rings, and chapter indicators.
- [ ] Keep the complete narrative in semantic HTML independent of the canvas.
- [ ] Provide a skip link to the main content.
- [ ] Preserve logical focus order when the visual chapter changes.
- [ ] Do not automatically move focus during scrolling.
- [ ] Make the active navigation anchor available through `aria-current` when practical.
- [ ] Announce scene loading only once and never trap assistive technology in a progress state.
- [ ] Keep the sign-in, activation, reset, and fallback flows keyboard complete.
- [ ] Test at 200% zoom, Windows High Contrast mode, and common mobile text scaling.
- [ ] Retain the global reduced-motion rules and add scene-specific reduced-motion logic.

## Performance Budget And Rendering Strategy

### Loading sequence

1. Render semantic hero content and the compressed poster immediately.
2. Lazy-import Three.js, GSAP, and scene code only on the landing route.
3. Initialize the live scene after the hero enters the viewport and the browser is idle enough to
   do so without delaying input.
4. Fade the canvas over the poster after the first stable frame.
5. Keep the poster beneath the canvas so context loss fails gracefully.

### Budgets

- [ ] Do not add Three.js or GSAP to the authenticated dashboard's initial route chunk.
- [ ] Keep each desktop frame below approximately 120 draw calls and 120,000 visible triangles.
- [ ] Keep each mobile frame below approximately 70 draw calls and 50,000 visible triangles.
- [ ] Keep landing poster files below 180 KB each where visual review permits.
- [ ] Cap renderer pixel ratio per quality tier rather than using raw device pixel ratio.
- [ ] Target stable 55–60 fps on a current desktop and at least 30 fps on the agreed mid-range mobile
      test device.
- [ ] Target Core Web Vitals at the 75th percentile: LCP <= 2.5 s, INP <= 200 ms, and CLS <= 0.1 on
      the production deployment.
- [ ] Pause rendering when the document is hidden or the canvas is far outside the viewport.

### Adaptive quality

- Start with a conservative quality tier based on viewport, device memory when available, logical
  CPU count, and reduced-motion preference.
- Measure frame time during a short non-blocking sample and downgrade once if sustained rendering
  is too slow.
- Never oscillate quality tiers during a session.
- Quality reductions may remove decorative instances and shadow detail, but never core LPG objects,
  chapter meaning, HTML copy, or actions.

## Analytics And Privacy

- [ ] Define public-page events separately from authenticated dashboard analytics.
- [ ] Limit initial events to page view, chapter reached, sign-in CTA selected, activation CTA
      selected, and WebGL fallback reason.
- [ ] Do not collect free-form query parameters, credentials, tokens, typed form data, or scene
      pointer trails.
- [ ] Do not start authenticated report analytics on the public route.
- [ ] Respect the existing analytics configuration and privacy policy before enabling public events.
- [ ] Verify that URL sanitization removes unapproved query parameters from analytics payloads.

## Delivery Phases

### Phase 0: Content And Safety Sign-Off

- [ ] Confirm the product name: `VMJAM Sales LPG Owner Dashboard` or the approved replacement.
- [ ] Approve the hero and seven chapter messages.
- [ ] Validate every product claim against current reports.
- [ ] Review the miniature for LPG safety optics without treating it as an engineering diagram.
- [ ] Approve the horizontal wordmark direction.

**Exit criterion:** Approved copy, brand label, and visual storyboard with no unsupported claims.

### Phase 1: Route And Authentication Separation

- [ ] Add the public, auth, and protected dashboard routes.
- [ ] Extract the current auth form without changing API contracts.
- [ ] Add shared session initialization and route guards.
- [ ] Preserve login, activation, reset, logout, and refresh behavior.
- [ ] Update current Playwright helpers and authentication expectations.

**Exit criterion:** All current authentication and dashboard tests pass with the new URLs before any
3D code is introduced.

### Phase 2: Static Landing Page Foundation

- [ ] Build semantic navigation, hero, chapter copy, product evidence, trust section, final CTA, and
      footer.
- [ ] Implement responsive typography and spacing with the existing charcoal/gold identity.
- [ ] Add route metadata and public/auth indexing rules.
- [ ] Verify the page with the poster fallback only.

**Exit criterion:** The complete page is useful, branded, responsive, and accessible with JavaScript
animation and WebGL disabled.

### Phase 3: Procedural World And Asset Generation

- [ ] Install and pin Three.js.
- [ ] Create shared materials, geometry factories, environment, LPG assets, and vehicles.
- [ ] Compose the world and orthographic camera frames.
- [ ] Render desktop, mobile, and social poster assets from the owned scene.
- [ ] Record the repeatable render process and asset manifest.

**Exit criterion:** The static scene matches the approved storyboard on wide and narrow viewports and
stays inside geometry/draw-call budgets.

### Phase 4: Scroll Story And Motion

- [ ] Install and pin GSAP.
- [ ] Implement master timeline, camera path, vehicle paths, wheel rotation, chapter transitions,
      reverse scrolling, and visibility pause.
- [ ] Add reduced-motion, mobile, WebGL-failure, and context-loss paths.
- [ ] Verify that all cleanup runs after route navigation.

**Exit criterion:** Forward and reverse scrolling remain synchronized without leaks, layout jumps,
or inaccessible content.

### Phase 5: Product Evidence And Conversion Flow

- [ ] Generate sanitized representative screenshots from controlled fixtures.
- [ ] Build the large evidence viewer and text rail.
- [ ] Connect every sign-in and activation CTA to its route.
- [ ] Add final invitation instructions from the existing POS workflow.
- [ ] Add approved, privacy-safe public analytics.

**Exit criterion:** Every CTA completes its intended flow, and every screenshot and claim maps to a
real feature.

### Phase 6: QA, Performance, And Release

- [ ] Add browser, accessibility, visual, reduced-motion, and fallback tests.
- [ ] Test desktop and mobile Chromium plus one WebKit/Safari target before release.
- [ ] Run production build verification, dependency audit, secret scan, and container checks.
- [ ] Measure bundle composition, Core Web Vitals, frame time, draw calls, triangles, and memory.
- [ ] Test the production reverse proxy's caching, CSP, fallback routing, and social metadata.
- [ ] Roll out behind a deploy-time feature flag or reversible route configuration.

**Exit criterion:** Acceptance criteria pass in the production-like container and the old sign-in
entry can be restored without a database or API rollback.

## Test Plan

### Unit and component checks

- Camera keyframe interpolation returns stable positions at chapter boundaries.
- Vehicle wheel rotation matches path distance in both scroll directions.
- Quality-tier selection is deterministic for mocked capabilities.
- Scene disposal releases renderer, animation frame, geometries, materials, and observers.
- Auth route mode selects only login, activation, or reset.
- Route metadata applies the expected robots directive.

### Playwright journeys

- Public homepage loads without an authenticated API response.
- Hero copy and primary sign-in action appear before scene initialization completes.
- Every chapter becomes active at the expected scroll range.
- Sign in, activation, reset, refresh restoration, and logout continue to work.
- Unauthenticated `/dashboard` navigation redirects safely to `/login`.
- Authenticated `/login` navigation resolves to `/dashboard`.
- Reduced-motion emulation shows static content and creates no pinned scroll trap.
- WebGL-disabled simulation shows the poster and leaves all CTAs usable.
- Mobile layout combines chapters correctly and has no horizontal overflow.
- Keyboard navigation reaches all controls in logical order.
- Axe reports no serious or critical accessibility violations.
- Public analytics omit query parameters and form values.

### Visual baselines

Capture at minimum:

- `1440 x 900` desktop hero and each desktop chapter.
- `1024 x 768` tablet overview and product evidence section.
- `390 x 844` mobile hero, combined cylinder chapter, and final CTA.
- Desktop and mobile reduced-motion fallback.
- WebGL unavailable and scene loading states.

Avoid full-page screenshot comparison for animated frames; set exact progress, pause ambient motion,
and capture deterministic chapter states.

## Production Verification Commands

Use the repository's existing workflow after implementation:

```powershell
npm install
npm run build
npm run verify:production-build
npm test
```

Add a focused public-page Playwright project only if it materially reduces test time; it must not
replace the complete owner-portal suite.

## Acceptance Criteria

- [ ] `/` is a polished LPG-specific public homepage, not an authentication form with decoration.
- [ ] The first viewport clearly identifies VMJAM Sales, the LPG use case, the owner benefit, and the
      sign-in action.
- [ ] The procedural world contains recognizable LPG supply, storage, cylinder, store, delivery, and
      branch elements without third-party models.
- [ ] Seven desktop story stages and five combined mobile stages stay synchronized in both scroll
      directions.
- [ ] All product language matches current read-only synchronized capabilities.
- [ ] Login, activation, password reset, session refresh, dashboard access, and logout remain secure
      and covered by tests.
- [ ] The HTML-only/poster fallback contains the whole story and all primary actions.
- [ ] Reduced motion, WebGL failure, low-powered devices, and mobile layouts degrade gracefully.
- [ ] Three.js and GSAP are isolated from the authenticated dashboard bundle.
- [ ] New assets are first-party, reproducible, compressed, and free of customer data.
- [ ] Production build verification and the complete Playwright suite pass.
- [ ] No high-severity dependency, secret-scan, accessibility, or CSP regression is introduced.

## Risks And Mitigations

| Risk                                                | Mitigation                                                                                                |
| --------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Three.js increases initial load                     | Keep the poster and semantic hero first; lazy-import scene code only on `/`.                              |
| Scroll pinning performs poorly on mobile            | Use combined mobile chapters and a bounded sticky scene instead of a long full-screen pin.                |
| Public copy implies live operations                 | Repeat latest-sync and read-only language at claim boundaries.                                            |
| Route refactor breaks the mature dashboard suite    | Complete auth/routing extraction as a standalone phase and restore a green suite before scene work.       |
| LPG scene appears unsafe or technically misleading  | Use exterior, stylized operations; add safety cues; review optics; avoid engineering claims.              |
| Component CSS exceeds the current style budget      | Split public components and use Tailwind for routine layout rather than one large stylesheet.             |
| Canvas leaks after route navigation                 | Centralize ownership in one scene service and test teardown, context disposal, and ScrollTrigger cleanup. |
| Generated screenshots expose fixture PII            | Use a dedicated synthetic fixture and automated text checks before committing assets.                     |
| Existing private metadata blocks homepage discovery | Apply route-aware title, description, canonical, Open Graph, and robots metadata.                         |

## Explicitly Out Of Scope

- Replacing or redesigning the signed-in report workspace.
- Changing report calculations or adding new backend reporting endpoints.
- Live tank gauges, GPS tracking, driver dispatch, route optimization, or IoT integrations.
- Editing POS business records from the website.
- Building an engineering-accurate LPG plant simulator.
- Purchasing third-party 3D assets for the initial release.
- Adding React solely for the landing scene.
- Adding audio, autoplay video, or interaction that blocks access to the sign-in flow.

## Recommended Implementation Order

1. [ ] Approve claims, copy, wordmark direction, and LPG safety storyboard.
2. [ ] Separate public, auth, and dashboard routes while keeping all current tests green.
3. [ ] Ship the complete static/poster version of the homepage.
4. [ ] Build the procedural LPG world and generate first-party poster assets.
5. [ ] Add GSAP scroll storytelling and deterministic vehicle motion.
6. [ ] Add real product evidence, route-aware metadata, and privacy-safe analytics.
7. [ ] Complete accessibility, performance, security, cross-browser, and production verification.
