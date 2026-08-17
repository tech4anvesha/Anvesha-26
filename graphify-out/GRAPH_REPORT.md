# Graph Report - Anvesha-'26  (2026-08-18)

## Corpus Check
- 54 files · ~75,988 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 444 nodes · 860 edges · 30 communities (24 shown, 6 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 15 edges (avg confidence: 0.68)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `3dda07ca`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- tsconfig.json
- dependencies
- routes.ts
- cart.ts
- pages/merch.astro
- Astro Starter Kit: Basics
- CLAUDE.md
- scripts
- pages/events.astro
- []
- distribution.astro
- email.ts
- compilerOptions
- test/tsconfig.json
- Anvesha '26 — merch API
- sponsorships.astro
- smoke.mjs
- admin/merch.astro
- set-admin-password.mjs
- CatalogueHub
- ../assets/astro.svg
- ../assets/background.svg
- ../styles/theme.css

## God Nodes (most connected - your core abstractions)
1. `fetch()` - 31 edges
2. `json()` - 26 edges
3. `bad()` - 21 edges
4. `[]` - 20 edges
5. `requireAdmin()` - 15 edges
6. `collectItems()` - 12 edges
7. `directPay()` - 12 edges
8. `requireBudget()` - 12 edges
9. `randomId()` - 11 edges
10. `compilerOptions` - 11 edges

## Surprising Connections (you probably didn't know these)
- `renderShots()` --calls--> `escape()`  [INFERRED]
  src/pages/admin/merch.astro → src/pages/distribution.astro
- `renderPreview()` --calls--> `escape()`  [INFERRED]
  src/pages/admin/merch.astro → src/pages/distribution.astro
- `renderOrders()` --calls--> `escape()`  [INFERRED]
  src/pages/admin/merch.astro → src/pages/distribution.astro
- `openSlip()` --calls--> `escape()`  [INFERRED]
  src/pages/admin/merch.astro → src/pages/distribution.astro
- `OrderEmail` --references--> `PricedLine`  [EXTRACTED]
  worker/src/email.ts → worker/src/cart.ts

## Import Cycles
- None detected.

## Communities (30 total, 6 thin omitted)

### Community 0 - "tsconfig.json"
Cohesion: 0.25
Nodes (7): **/*, astro/tsconfigs/strict, .astro/types.d.ts, dist, exclude, extends, include

### Community 1 - "dependencies"
Cohesion: 0.08
Nodes (25): astro, lucide-static, dependencies, astro, gsap, jsqr, lucide-static, qrcode-generator (+17 more)

### Community 2 - "routes.ts"
Cohesion: 0.08
Nodes (77): adminCollect(), adminCreateMerch(), adminDeleteMerch(), adminDeleteOrder(), adminListMerch(), adminListOrders(), adminLogin(), adminLogout() (+69 more)

### Community 4 - "cart.ts"
Cohesion: 0.12
Nodes (17): CartLineInput, MAX_LINES, MAX_QTY_PER_LINE, MerchRow, parseCart(), priceCart(), PricedCart, PricedLine (+9 more)

### Community 6 - "pages/merch.astro"
Cohesion: 0.10
Nodes (26): addToBag(), animateSelect(), artHTML(), buildReceiptCard(), buildTree(), drawQR(), finishProgress(), goView() (+18 more)

### Community 7 - "Astro Starter Kit: Basics"
Cohesion: 0.40
Nodes (4): Astro Starter Kit: Basics, 🧞 Commands, 🚀 Project Structure, 👀 Want to learn more?

### Community 10 - "scripts"
Cohesion: 0.07
Nodes (26): @cloudflare/workers-types, @types/node, typescript, dependencies, qrcode-generator, devDependencies, @cloudflare/workers-types, @types/node (+18 more)

### Community 11 - "pages/events.astro"
Cohesion: 0.09
Nodes (10): ALL, applyRot(), dlDate, dlEdition, dlList, dlPos, endDrag(), pastTotal (+2 more)

### Community 12 - "[]"
Cohesion: 0.19
Nodes (3): ADMIN_NAV, [], hasTools

### Community 13 - "distribution.astro"
Cohesion: 0.19
Nodes (21): MOTES, collect(), escape(), initCounter(), initPage(), isDead(), itemsHtml(), lookup() (+13 more)

### Community 14 - "email.ts"
Cohesion: 0.21
Nodes (15): formatRupees(), esc(), html(), label(), sendOrderEmail(), text(), adler32(), chunk() (+7 more)

### Community 15 - "compilerOptions"
Cohesion: 0.12
Nodes (15): ES2022, compilerOptions, allowImportingTsExtensions, lib, module, moduleResolution, noEmit, noUnusedLocals (+7 more)

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
Cohesion: 0.07
Nodes (23): initShell(), adminFetch(), AdminSession, clearSession(), getSession(), onCatalogueChange(), toLogin(), toPaise() (+15 more)

### Community 23 - "set-admin-password.mjs"
Cohesion: 0.33
Nodes (5): args, derive(), hash, salt, verify()

## Knowledge Gaps
- **117 isolated node(s):** `name`, `type`, `version`, `node`, `dev` (+112 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **6 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `[]` connect `[]` to `pages/merch.astro`, `pages/events.astro`, `distribution.astro`, `expo.astro`, `outreach.astro`, `sponsorships.astro`, `admin/merch.astro`?**
  _High betweenness centrality (0.108) - this node is a cross-community bridge._
- **Why does `price()` connect `cart.ts` to `admin/merch.astro`?**
  _High betweenness centrality (0.093) - this node is a cross-community bridge._
- **Why does `text()` connect `email.ts` to `expo.astro`, `[]`?**
  _High betweenness centrality (0.083) - this node is a cross-community bridge._
- **What connects `name`, `type`, `version` to the rest of the system?**
  _117 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.07692307692307693 - nodes in this community are weakly interconnected._
- **Should `routes.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.08089887640449438 - nodes in this community are weakly interconnected._
- **Should `cart.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.1225296442687747 - nodes in this community are weakly interconnected._