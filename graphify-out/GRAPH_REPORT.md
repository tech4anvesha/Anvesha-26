# Graph Report - Anvesha-26  (2026-11-02)

## Corpus Check
- 96 files · ~4,672,356 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 761 nodes · 1599 edges · 42 communities (36 shown, 6 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 30 edges (avg confidence: 0.69)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `e89866dd`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- tsconfig.json
- dependencies
- src/admin.ts
- worker-events/src/index.ts
- pages/expo.astro
- Astro Starter Kit: Basics
- CLAUDE.md
- scripts
- []
- SiteLayout.astro
- distribution.astro
- email.ts
- compilerOptions
- test/tsconfig.json
- Anvesha '26 — merch API
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
- onCatalogueChange
- Env
- roster.test.ts

## God Nodes (most connected - your core abstractions)
1. `[]` - 57 edges
2. `fetch()` - 40 edges
3. `json()` - 37 edges
4. `bad()` - 30 edges
5. `requireAdmin()` - 22 edges
6. `fetch()` - 20 edges
7. `adminReviewOrder()` - 18 edges
8. `submitPayment()` - 18 edges
9. `requireBudget()` - 18 edges
10. `Env` - 17 edges

## Surprising Connections (you probably didn't know these)
- `renderTree()` --indirect_call--> `scheduled()`  [INFERRED]
  src/pages/admin/events.astro → worker-events/src/index.ts
- `renderShots()` --calls--> `escape()`  [INFERRED]
  src/pages/admin/merch.astro → src/pages/distribution.astro
- `renderPreview()` --calls--> `escape()`  [INFERRED]
  src/pages/admin/merch.astro → src/pages/distribution.astro
- `reviewCell()` --calls--> `escape()`  [INFERRED]
  src/pages/admin/merch.astro → src/pages/distribution.astro
- `renderOrders()` --calls--> `escape()`  [INFERRED]
  src/pages/admin/merch.astro → src/pages/distribution.astro

## Import Cycles
- None detected.

## Communities (42 total, 6 thin omitted)

### Community 0 - "tsconfig.json"
Cohesion: 0.25
Nodes (7): **/*, astro/tsconfigs/strict, .astro/types.d.ts, dist, exclude, extends, include

### Community 1 - "dependencies"
Cohesion: 0.07
Nodes (28): astro, @astrojs/sitemap, lucide-static, dependencies, astro, @astrojs/sitemap, gsap, jsqr (+20 more)

### Community 2 - "src/admin.ts"
Cohesion: 0.06
Nodes (116): adminCollect(), adminCreateMerch(), adminDeleteMerch(), adminDeleteOrder(), adminListMerch(), adminListOrders(), adminLogin(), adminLogout() (+108 more)

### Community 4 - "worker-events/src/index.ts"
Cohesion: 0.10
Nodes (48): EventsHub, AdminIdentity, ApiError, bad(), broadcast(), Cors, corsHeaders(), createEvent() (+40 more)

### Community 6 - "pages/expo.astro"
Cohesion: 0.16
Nodes (5): ADMIN_NAV, EVENTS_API, Hall, HALLS, Project

### Community 7 - "Astro Starter Kit: Basics"
Cohesion: 0.40
Nodes (4): Astro Starter Kit: Basics, 🧞 Commands, 🚀 Project Structure, 👀 Want to learn more?

### Community 10 - "scripts"
Cohesion: 0.07
Nodes (27): dependencies, qrcode-generator, devDependencies, @cloudflare/workers-types, @types/node, typescript, wrangler, engines (+19 more)

### Community 11 - "[]"
Cohesion: 0.06
Nodes (32): [], cardEd, cardNum, cardPos, cardWord, dlDate, dlEdition, dlList (+24 more)

### Community 12 - "SiteLayout.astro"
Cohesion: 0.10
Nodes (3): ../assets/anvesha-mark.svg?raw, setOpen(), show()

### Community 13 - "distribution.astro"
Cohesion: 0.14
Nodes (26): renderShots(), MOTES, collect(), escape(), initCounter(), initPage(), isDead(), itemsHtml() (+18 more)

### Community 14 - "email.ts"
Cohesion: 0.07
Nodes (40): CartLineInput, formatRupees(), MAX_LINES, MAX_QTY_PER_LINE, MerchRow, parseCart(), PricedCart, PricedLine (+32 more)

### Community 15 - "compilerOptions"
Cohesion: 0.12
Nodes (15): compilerOptions, allowImportingTsExtensions, lib, module, moduleResolution, noEmit, noUnusedLocals, skipLibCheck (+7 more)

### Community 16 - "test/tsconfig.json"
Cohesion: 0.20
Nodes (9): node, **/*.ts, ../tsconfig.json, compilerOptions, types, extends, include, @cloudflare/workers-types (+1 more)

### Community 17 - "Anvesha '26 — merch API"
Cohesion: 0.15
Nodes (12): Admin panel, Anvesha '26 — merch API, Confirmation email, Deploying for real, Endpoints, Live catalogue updates, Payment mode, `POST /api/checkout` (+4 more)

### Community 19 - "switch.mjs"
Cohesion: 0.18
Nodes (24): API, ask(), call(), clearSecrets(), [cmd, arg], DEV_VARS, devVarsSet(), identity() (+16 more)

### Community 20 - "admin/index.astro"
Cohesion: 0.40
Nodes (4): btn, err, form, roll

### Community 21 - "lib/admin.ts"
Cohesion: 0.24
Nodes (12): initShell(), adminBlob(), adminFetch(), AdminSession, clearSession(), getSession(), toLogin(), toPaise() (+4 more)

### Community 22 - "admin/merch.astro"
Cohesion: 0.13
Nodes (13): cacheProof(), confirmPayment(), confirmReject(), mailStopNotice(), openReject(), openShot(), paintMailBlock(), renderOrders() (+5 more)

### Community 23 - "set-admin-password.mjs"
Cohesion: 0.33
Nodes (5): args, derive(), hash, salt, verify()

### Community 24 - "pages/merch.astro"
Cohesion: 0.13
Nodes (10): buildReceiptCard(), drawQR(), ReceiptData, receiptFilename(), rupees(), saveReceipt(), buildTree(), setBranch() (+2 more)

### Community 26 - "events.astro"
Cohesion: 0.09
Nodes (25): badLink(), badPoster(), delModal, disarmPosterDelete(), dparts(), esc(), initEventsAdmin(), MON (+17 more)

### Community 31 - "scripts"
Cohesion: 0.09
Nodes (22): devDependencies, @cloudflare/workers-types, @types/node, typescript, wrangler, engines, node, @cloudflare/workers-types (+14 more)

### Community 32 - "teams.astro"
Cohesion: 0.08
Nodes (12): revealInTree(), openCat(), openFromHash(), printCode(), select(), AUTH, post(), req() (+4 more)

### Community 33 - "compilerOptions"
Cohesion: 0.12
Nodes (15): compilerOptions, allowImportingTsExtensions, lib, module, moduleResolution, noEmit, noUnusedLocals, skipLibCheck (+7 more)

### Community 34 - "Anvesha '26 — events API"
Cohesion: 0.29
Nodes (6): Anvesha '26 — events API, Deploy, Local, Routes, Tables, The sweep

### Community 36 - "review.test.ts"
Cohesion: 0.17
Nodes (8): AVIF, GIF, HTML, JPEG, Order, PNG, Review, WEBP

### Community 37 - "esc"
Cohesion: 0.33
Nodes (7): applyRot(), cardHTML(), endDrag(), esc(), openFile(), setFile(), showDate()

### Community 38 - "event-types.ts"
Cohesion: 0.40
Nodes (4): EVENT_TYPES, EventType, FALLBACK_ICON, TYPE_ICONS

### Community 39 - "onCatalogueChange"
Cohesion: 0.67
Nodes (4): onCatalogueChange(), boot(), initEvents(), refresh()

### Community 40 - "Env"
Cohesion: 0.16
Nodes (15): createRazorpayOrder(), fetchPayment(), hmacHex(), PaymentEntity, RazorpayOrder, verifyCheckoutSignature(), verifyWebhookSignature(), WebhookEvent (+7 more)

## Knowledge Gaps
- **211 isolated node(s):** `name`, `type`, `version`, `node`, `dev` (+206 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **6 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `text()` connect `email.ts` to `SiteLayout.astro`?**
  _High betweenness centrality (0.110) - this node is a cross-community bridge._
- **Why does `renderTree()` connect `events.astro` to `worker-events/src/index.ts`?**
  _High betweenness centrality (0.101) - this node is a cross-community bridge._
- **Why does `scheduled()` connect `worker-events/src/index.ts` to `events.astro`?**
  _High betweenness centrality (0.100) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `[]` (e.g. with `boot()` and `endDrag()`) actually correct?**
  _`[]` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `name`, `type`, `version` to the rest of the system?**
  _211 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.06896551724137931 - nodes in this community are weakly interconnected._
- **Should `src/admin.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.05532635142282873 - nodes in this community are weakly interconnected._