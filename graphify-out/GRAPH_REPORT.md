# Graph Report - Anvesha-'26  (2026-09-06)

## Corpus Check
- 71 files · ~122,423 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 622 nodes · 1151 edges · 36 communities (30 shown, 6 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 23 edges (avg confidence: 0.67)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `ca0f4e02`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- tsconfig.json
- dependencies
- routes.ts
- worker-events/src/index.ts
- pages/merch.astro
- Astro Starter Kit: Basics
- CLAUDE.md
- scripts
- []
- SiteLayout.astro
- distribution.astro
- cart.ts
- compilerOptions
- test/tsconfig.json
- Anvesha '26 — merch API
- smoke.mjs
- admin/merch.astro
- set-admin-password.mjs
- CatalogueHub
- events.astro
- ../assets/astro.svg
- ../assets/background.svg
- ../styles/theme.css
- scripts
- compilerOptions
- Anvesha '26 — events API

## God Nodes (most connected - your core abstractions)
1. `[]` - 53 edges
2. `fetch()` - 29 edges
3. `json()` - 26 edges
4. `bad()` - 21 edges
5. `fetch()` - 15 edges
6. `requireAdmin()` - 15 edges
7. `directPay()` - 12 edges
8. `requireBudget()` - 12 edges
9. `putPoster()` - 11 edges
10. `compilerOptions` - 11 edges

## Surprising Connections (you probably didn't know these)
- `renderTree()` --indirect_call--> `scheduled()`  [INFERRED]
  src/pages/admin/events.astro → worker-events/src/index.ts
- `renderShots()` --calls--> `escape()`  [INFERRED]
  src/pages/admin/merch.astro → src/pages/distribution.astro
- `renderPreview()` --calls--> `escape()`  [INFERRED]
  src/pages/admin/merch.astro → src/pages/distribution.astro
- `renderOrders()` --calls--> `escape()`  [INFERRED]
  src/pages/admin/merch.astro → src/pages/distribution.astro
- `openSlip()` --calls--> `escape()`  [INFERRED]
  src/pages/admin/merch.astro → src/pages/distribution.astro

## Import Cycles
- None detected.

## Communities (36 total, 6 thin omitted)

### Community 0 - "tsconfig.json"
Cohesion: 0.25
Nodes (7): **/*, astro/tsconfigs/strict, .astro/types.d.ts, dist, exclude, extends, include

### Community 1 - "dependencies"
Cohesion: 0.08
Nodes (25): astro, lucide-static, dependencies, astro, gsap, jsqr, lucide-static, qrcode-generator (+17 more)

### Community 2 - "routes.ts"
Cohesion: 0.07
Nodes (83): adminCollect(), adminCreateMerch(), adminDeleteMerch(), adminDeleteOrder(), adminListMerch(), adminListOrders(), adminLogin(), adminLogout() (+75 more)

### Community 4 - "worker-events/src/index.ts"
Cohesion: 0.11
Nodes (39): EventsHub, ApiError, bad(), broadcast(), Cors, corsHeaders(), createEvent(), deleteEvent() (+31 more)

### Community 6 - "pages/merch.astro"
Cohesion: 0.10
Nodes (27): addToBag(), animateSelect(), artHTML(), buildReceiptCard(), buildTree(), drawQR(), finishProgress(), flyToBag() (+19 more)

### Community 7 - "Astro Starter Kit: Basics"
Cohesion: 0.40
Nodes (4): Astro Starter Kit: Basics, 🧞 Commands, 🚀 Project Structure, 👀 Want to learn more?

### Community 10 - "scripts"
Cohesion: 0.07
Nodes (26): dependencies, qrcode-generator, devDependencies, @cloudflare/workers-types, @types/node, typescript, wrangler, engines (+18 more)

### Community 11 - "[]"
Cohesion: 0.05
Nodes (45): onCatalogueChange(), EVENT_TYPES, EventType, FALLBACK_ICON, TYPE_ICONS, [], applyRot(), boot() (+37 more)

### Community 13 - "distribution.astro"
Cohesion: 0.19
Nodes (21): MOTES, collect(), escape(), initCounter(), initPage(), isDead(), itemsHtml(), lookup() (+13 more)

### Community 14 - "cart.ts"
Cohesion: 0.09
Nodes (27): CartLineInput, formatRupees(), MAX_LINES, MAX_QTY_PER_LINE, MerchRow, PricedCart, PricedLine, Size (+19 more)

### Community 15 - "compilerOptions"
Cohesion: 0.12
Nodes (15): compilerOptions, allowImportingTsExtensions, lib, module, moduleResolution, noEmit, noUnusedLocals, skipLibCheck (+7 more)

### Community 16 - "test/tsconfig.json"
Cohesion: 0.20
Nodes (9): node, **/*.ts, ../tsconfig.json, compilerOptions, types, extends, include, @cloudflare/workers-types (+1 more)

### Community 17 - "Anvesha '26 — merch API"
Cohesion: 0.13
Nodes (14): Admin panel, Anvesha '26 — merch API, Confirmation email, Decisions worth knowing, Deploying for real, Endpoints, Known gaps, Live catalogue updates (+6 more)

### Community 21 - "smoke.mjs"
Cohesion: 0.25
Nodes (6): AUTH, post(), req(), sized, unsized, vars

### Community 22 - "admin/merch.astro"
Cohesion: 0.08
Nodes (23): initShell(), adminFetch(), AdminSession, clearSession(), getSession(), toLogin(), toPaise(), toRupees() (+15 more)

### Community 23 - "set-admin-password.mjs"
Cohesion: 0.33
Nodes (5): args, derive(), hash, salt, verify()

### Community 26 - "events.astro"
Cohesion: 0.10
Nodes (25): badLink(), badPoster(), delModal, disarmPosterDelete(), dparts(), esc(), initEventsAdmin(), MON (+17 more)

### Community 31 - "scripts"
Cohesion: 0.09
Nodes (22): devDependencies, @cloudflare/workers-types, @types/node, typescript, wrangler, engines, node, @cloudflare/workers-types (+14 more)

### Community 33 - "compilerOptions"
Cohesion: 0.12
Nodes (15): compilerOptions, allowImportingTsExtensions, lib, module, moduleResolution, noEmit, noUnusedLocals, skipLibCheck (+7 more)

### Community 34 - "Anvesha '26 — events API"
Cohesion: 0.29
Nodes (6): Anvesha '26 — events API, Deploy, Local, Routes, Tables, The sweep

## Knowledge Gaps
- **181 isolated node(s):** `name`, `type`, `version`, `node`, `dev` (+176 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **6 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `renderTree()` connect `events.astro` to `worker-events/src/index.ts`?**
  _High betweenness centrality (0.101) - this node is a cross-community bridge._
- **Why does `scheduled()` connect `worker-events/src/index.ts` to `events.astro`?**
  _High betweenness centrality (0.099) - this node is a cross-community bridge._
- **Why does `[]` connect `[]` to `outreach.astro`, `SiteLayout.astro`, `admin/merch.astro`?**
  _High betweenness centrality (0.098) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `[]` (e.g. with `boot()` and `endDrag()`) actually correct?**
  _`[]` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `name`, `type`, `version` to the rest of the system?**
  _181 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.07692307692307693 - nodes in this community are weakly interconnected._
- **Should `routes.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.0669772859638905 - nodes in this community are weakly interconnected._