# Graph Report - Anvesha-26  (2026-11-02)

## Corpus Check
- 98 files · ~4,674,067 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 794 nodes · 1658 edges · 46 communities (39 shown, 7 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 37 edges (avg confidence: 0.69)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `e8b16f28`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- tsconfig.json
- dependencies
- src/admin.ts
- worker-events/src/index.ts
- admin/expo.astro
- Astro Starter Kit: Basics
- CLAUDE.md
- scripts
- []
- distribution.astro
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
- initExpoAdmin
- razorpay.ts
- SiteLayout.astro
- roster.test.ts
- cart.ts
- order.astro
- AdminLayout.astro

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
- `renderShots()` --calls--> `escape()`  [INFERRED]
  src/pages/admin/merch.astro → src/pages/distribution.astro
- `showDate()` --calls--> `pad()`  [INFERRED]
  src/pages/events.astro → src/pages/admin/expo.astro
- `render()` --calls--> `pad()`  [INFERRED]
  src/pages/projects.astro → src/pages/admin/expo.astro
- `initExpoAdmin()` --calls--> `setFile()`  [INFERRED]
  src/pages/admin/expo.astro → src/pages/events.astro

## Import Cycles
- None detected.

## Communities (46 total, 7 thin omitted)

### Community 0 - "tsconfig.json"
Cohesion: 0.25
Nodes (7): **/*, astro/tsconfigs/strict, .astro/types.d.ts, dist, exclude, extends, include

### Community 1 - "dependencies"
Cohesion: 0.07
Nodes (28): astro, @astrojs/sitemap, lucide-static, dependencies, astro, @astrojs/sitemap, gsap, jsqr (+20 more)

### Community 2 - "src/admin.ts"
Cohesion: 0.05
Nodes (120): adminCollect(), adminCreateMerch(), adminDeleteMerch(), adminDeleteOrder(), adminListMerch(), adminListOrders(), adminLogin(), adminLogout() (+112 more)

### Community 4 - "worker-events/src/index.ts"
Cohesion: 0.08
Nodes (55): EventsHub, AdminIdentity, ApiError, bad(), broadcast(), Cors, corsHeaders(), createEvent() (+47 more)

### Community 6 - "admin/expo.astro"
Cohesion: 0.12
Nodes (11): Hall, HALLS, Project, c, g, IMAGE_TYPES, scale, SUBJ (+3 more)

### Community 7 - "Astro Starter Kit: Basics"
Cohesion: 0.40
Nodes (4): Astro Starter Kit: Basics, 🧞 Commands, 🚀 Project Structure, 👀 Want to learn more?

### Community 10 - "scripts"
Cohesion: 0.07
Nodes (27): dependencies, qrcode-generator, devDependencies, @cloudflare/workers-types, @types/node, typescript, wrangler, engines (+19 more)

### Community 11 - "[]"
Cohesion: 0.06
Nodes (32): [], cardEd, cardNum, cardPos, cardWord, dlDate, dlEdition, dlList (+24 more)

### Community 13 - "distribution.astro"
Cohesion: 0.15
Nodes (25): MOTES, collect(), escape(), initCounter(), initPage(), isDead(), itemsHtml(), lookup() (+17 more)

### Community 14 - "email.ts"
Cohesion: 0.11
Nodes (27): formatRupees(), PricedLine, deliver(), esc(), html(), label(), MailResult, nextUtcMidnight() (+19 more)

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
Cohesion: 0.22
Nodes (13): initShell(), adminBlob(), adminFetch(), AdminSession, clearSession(), getSession(), toLogin(), toPaise() (+5 more)

### Community 22 - "admin/merch.astro"
Cohesion: 0.12
Nodes (14): cacheProof(), confirmPayment(), confirmReject(), mailStopNotice(), openReject(), openShot(), paintMailBlock(), renderOrders() (+6 more)

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

### Community 39 - "initExpoAdmin"
Cohesion: 0.50
Nodes (5): onCatalogueChange(), initExpoAdmin(), boot(), initEvents(), refresh()

### Community 40 - "razorpay.ts"
Cohesion: 0.23
Nodes (11): createRazorpayOrder(), fetchPayment(), hmacHex(), PaymentEntity, RazorpayOrder, verifyCheckoutSignature(), verifyWebhookSignature(), WebhookEvent (+3 more)

### Community 41 - "SiteLayout.astro"
Cohesion: 0.08
Nodes (5): ../assets/anvesha-mark.svg?raw, card(), render(), setOpen(), show()

### Community 43 - "cart.ts"
Cohesion: 0.21
Nodes (13): CartLineInput, MAX_LINES, MAX_QTY_PER_LINE, MerchRow, parseCart(), priceCart(), PricedCart, Size (+5 more)

### Community 44 - "order.astro"
Cohesion: 0.32
Nodes (7): buildReceiptCard(), drawQR(), ReceiptData, receiptFilename(), rupees(), saveReceipt(), initOrder()

## Knowledge Gaps
- **220 isolated node(s):** `name`, `type`, `version`, `node`, `dev` (+215 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **7 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `renderTree()` connect `events.astro` to `worker-events/src/index.ts`?**
  _High betweenness centrality (0.117) - this node is a cross-community bridge._
- **Why does `scheduled()` connect `worker-events/src/index.ts` to `events.astro`?**
  _High betweenness centrality (0.115) - this node is a cross-community bridge._
- **Why does `text()` connect `email.ts` to `SiteLayout.astro`?**
  _High betweenness centrality (0.111) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `[]` (e.g. with `boot()` and `endDrag()`) actually correct?**
  _`[]` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `name`, `type`, `version` to the rest of the system?**
  _220 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.06896551724137931 - nodes in this community are weakly interconnected._
- **Should `src/admin.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.05125337806355419 - nodes in this community are weakly interconnected._