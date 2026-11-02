# Graph Report - Anvesha-26  (2026-11-02)

## Corpus Check
- 98 files · ~4,673,497 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 790 nodes · 1654 edges · 50 communities (43 shown, 7 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 37 edges (avg confidence: 0.69)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `1cbfe4fa`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- tsconfig.json
- dependencies
- routes.ts
- worker-events/src/index.ts
- admin/expo.astro
- Astro Starter Kit: Basics
- CLAUDE.md
- scripts
- []
- SiteLayout.astro
- spot.astro
- email.ts
- compilerOptions
- test/tsconfig.json
- Anvesha '26 — merch API
- smoke.mjs
- switch.mjs
- admin/index.astro
- lib/admin.ts
- admin/merch.astro
- set-admin-password.mjs
- pages/merch.astro
- CatalogueHub
- events.astro
- ../assets/astro.svg
- ../assets/background.svg
- ../styles/theme.css
- scripts
- teams.astro
- compilerOptions
- Anvesha '26 — events API
- review.test.ts
- esc
- event-types.ts
- boot
- razorpay.ts
- roster.test.ts
- worker/src/index.ts
- order.astro
- util.ts
- src/admin.ts
- distribution.ts
- spot.ts
- stock.ts

## God Nodes (most connected - your core abstractions)
1. `[]` - 57 edges
2. `fetch()` - 40 edges
3. `json()` - 37 edges
4. `bad()` - 30 edges
5. `requireAdmin()` - 22 edges
6. `fetch()` - 21 edges
7. `adminReviewOrder()` - 18 edges
8. `submitPayment()` - 18 edges
9. `requireBudget()` - 18 edges
10. `Env` - 17 edges

## Surprising Connections (you probably didn't know these)
- `renderTree()` --indirect_call--> `scheduled()`  [INFERRED]
  src/pages/admin/events.astro → worker-events/src/index.ts
- `showDate()` --calls--> `pad()`  [INFERRED]
  src/pages/events.astro → src/pages/admin/expo.astro
- `render()` --calls--> `pad()`  [INFERRED]
  src/pages/projects.astro → src/pages/admin/expo.astro
- `initExpoAdmin()` --calls--> `setFile()`  [INFERRED]
  src/pages/admin/expo.astro → src/pages/events.astro
- `renderShots()` --calls--> `escape()`  [INFERRED]
  src/pages/admin/merch.astro → src/pages/distribution.astro

## Import Cycles
- None detected.

## Communities (50 total, 7 thin omitted)

### Community 0 - "tsconfig.json"
Cohesion: 0.25
Nodes (7): **/*, astro/tsconfigs/strict, .astro/types.d.ts, dist, exclude, extends, include

### Community 1 - "dependencies"
Cohesion: 0.07
Nodes (28): astro, @astrojs/sitemap, lucide-static, dependencies, astro, @astrojs/sitemap, gsap, jsqr (+20 more)

### Community 2 - "routes.ts"
Cohesion: 0.11
Nodes (40): CartLineInput, MAX_LINES, MAX_QTY_PER_LINE, MerchRow, parseCart(), priceCart(), PricedCart, Size (+32 more)

### Community 4 - "worker-events/src/index.ts"
Cohesion: 0.08
Nodes (55): EventsHub, AdminIdentity, ApiError, bad(), broadcast(), Cors, corsHeaders(), createEvent() (+47 more)

### Community 6 - "admin/expo.astro"
Cohesion: 0.10
Nodes (15): onCatalogueChange(), EVENTS_API, Hall, HALLS, Project, IMAGE_TYPES, initExpoAdmin(), SUBJ (+7 more)

### Community 7 - "Astro Starter Kit: Basics"
Cohesion: 0.40
Nodes (4): Astro Starter Kit: Basics, 🧞 Commands, 🚀 Project Structure, 👀 Want to learn more?

### Community 10 - "scripts"
Cohesion: 0.07
Nodes (27): dependencies, qrcode-generator, devDependencies, @cloudflare/workers-types, @types/node, typescript, wrangler, engines (+19 more)

### Community 11 - "[]"
Cohesion: 0.06
Nodes (32): [], cardEd, cardNum, cardPos, cardWord, dlDate, dlEdition, dlList (+24 more)

### Community 13 - "spot.astro"
Cohesion: 0.22
Nodes (5): MOTES, fail(), hint, open(), state

### Community 14 - "email.ts"
Cohesion: 0.12
Nodes (26): formatRupees(), deliver(), esc(), html(), label(), MailResult, nextUtcMidnight(), OrderEmail (+18 more)

### Community 15 - "compilerOptions"
Cohesion: 0.12
Nodes (15): compilerOptions, allowImportingTsExtensions, lib, module, moduleResolution, noEmit, noUnusedLocals, skipLibCheck (+7 more)

### Community 16 - "test/tsconfig.json"
Cohesion: 0.20
Nodes (9): node, **/*.ts, ../tsconfig.json, compilerOptions, types, extends, include, @cloudflare/workers-types (+1 more)

### Community 17 - "Anvesha '26 — merch API"
Cohesion: 0.15
Nodes (12): Admin panel, Anvesha '26 — merch API, Confirmation email, Deploying for real, Endpoints, Live catalogue updates, Payment mode, `POST /api/checkout` (+4 more)

### Community 18 - "smoke.mjs"
Cohesion: 0.25
Nodes (7): AUTH, post(), req(), section(), sized, unsized, vars

### Community 19 - "switch.mjs"
Cohesion: 0.18
Nodes (24): API, ask(), call(), clearSecrets(), [cmd, arg], DEV_VARS, devVarsSet(), identity() (+16 more)

### Community 20 - "admin/index.astro"
Cohesion: 0.40
Nodes (4): btn, err, form, roll

### Community 21 - "lib/admin.ts"
Cohesion: 0.32
Nodes (9): initShell(), adminBlob(), adminFetch(), AdminSession, clearSession(), getSession(), toLogin(), API (+1 more)

### Community 22 - "admin/merch.astro"
Cohesion: 0.09
Nodes (37): toPaise(), toRupees(), cacheProof(), confirmPayment(), confirmReject(), mailStopNotice(), openReject(), openShot() (+29 more)

### Community 23 - "set-admin-password.mjs"
Cohesion: 0.33
Nodes (5): args, derive(), hash, salt, verify()

### Community 24 - "pages/merch.astro"
Cohesion: 0.15
Nodes (4): pad(), buildTree(), setBranch(), syncTree()

### Community 26 - "events.astro"
Cohesion: 0.10
Nodes (25): badLink(), badPoster(), delModal, disarmPosterDelete(), dparts(), esc(), initEventsAdmin(), MON (+17 more)

### Community 31 - "scripts"
Cohesion: 0.09
Nodes (22): devDependencies, @cloudflare/workers-types, @types/node, typescript, wrangler, engines, node, @cloudflare/workers-types (+14 more)

### Community 32 - "teams.astro"
Cohesion: 0.12
Nodes (5): revealInTree(), openCat(), openFromHash(), printCode(), select()

### Community 33 - "compilerOptions"
Cohesion: 0.12
Nodes (15): compilerOptions, allowImportingTsExtensions, lib, module, moduleResolution, noEmit, noUnusedLocals, skipLibCheck (+7 more)

### Community 34 - "Anvesha '26 — events API"
Cohesion: 0.25
Nodes (7): Anvesha '26 — events API, Deploy, Local, Projects, Routes, Tables, The sweep

### Community 36 - "review.test.ts"
Cohesion: 0.17
Nodes (8): AVIF, GIF, HTML, JPEG, Order, PNG, Review, WEBP

### Community 37 - "esc"
Cohesion: 0.33
Nodes (7): applyRot(), cardHTML(), endDrag(), esc(), openFile(), setFile(), showDate()

### Community 38 - "event-types.ts"
Cohesion: 0.40
Nodes (4): EVENT_TYPES, EventType, FALLBACK_ICON, TYPE_ICONS

### Community 39 - "boot"
Cohesion: 1.00
Nodes (3): boot(), initEvents(), refresh()

### Community 40 - "razorpay.ts"
Cohesion: 0.23
Nodes (11): createRazorpayOrder(), fetchPayment(), hmacHex(), PaymentEntity, RazorpayOrder, verifyCheckoutSignature(), verifyWebhookSignature(), WebhookEvent (+3 more)

### Community 43 - "worker/src/index.ts"
Cohesion: 0.27
Nodes (26): adminCollect(), adminCreateMerch(), adminDeleteMerch(), adminDeleteOrder(), adminListMerch(), adminListOrders(), adminLogout(), adminOrderProof() (+18 more)

### Community 44 - "order.astro"
Cohesion: 0.32
Nodes (7): buildReceiptCard(), drawQR(), ReceiptData, receiptFilename(), rupees(), saveReceipt(), initOrder()

### Community 45 - "util.ts"
Cohesion: 0.12
Nodes (14): readRelease(), CollectionStatus, clientIp(), corsHeaders(), Env, IMAGE_TYPES, MAGIC, paymentConfigured() (+6 more)

### Community 46 - "src/admin.ts"
Cohesion: 0.16
Nodes (21): adminLogin(), adminReviewOrder(), AdminSession, Cors, hashPassword(), hex(), isCollegeEmail(), mailReport() (+13 more)

### Community 47 - "distribution.ts"
Cohesion: 0.21
Nodes (12): Cors, DistributionSession, looksLikeSessionId(), noSuchSession(), OpenSession, requireOpenSession(), sessionCollect(), sessionLookup() (+4 more)

### Community 48 - "spot.ts"
Cohesion: 0.22
Nodes (12): Cors, looksLikeSpotPass(), noSuchPass(), noSuchSpotPass, PASS_MINUTES, requireSpotPass(), SpotPass, ApiError (+4 more)

### Community 49 - "stock.ts"
Cohesion: 0.24
Nodes (9): PricedLine, Consumes, readStock(), requireStock(), returnStock(), slot(), StockMap, takeStock() (+1 more)

## Knowledge Gaps
- **217 isolated node(s):** `name`, `type`, `version`, `node`, `dev` (+212 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **7 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `renderTree()` connect `events.astro` to `worker-events/src/index.ts`?**
  _High betweenness centrality (0.117) - this node is a cross-community bridge._
- **Why does `scheduled()` connect `worker-events/src/index.ts` to `events.astro`?**
  _High betweenness centrality (0.116) - this node is a cross-community bridge._
- **Why does `text()` connect `email.ts` to `pages/index.astro`?**
  _High betweenness centrality (0.110) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `[]` (e.g. with `boot()` and `endDrag()`) actually correct?**
  _`[]` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `name`, `type`, `version` to the rest of the system?**
  _217 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.06896551724137931 - nodes in this community are weakly interconnected._
- **Should `routes.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.11212121212121212 - nodes in this community are weakly interconnected._