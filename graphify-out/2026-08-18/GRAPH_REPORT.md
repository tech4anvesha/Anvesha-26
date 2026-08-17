# Graph Report - Anvesha-'26  (2026-08-18)

## Corpus Check
- 53 files · ~73,235 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 473 nodes · 935 edges · 30 communities (24 shown, 6 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 20 edges (avg confidence: 0.65)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `5dc2bb14`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- tsconfig.json
- dependencies
- routes.ts
- admin/merch.astro
- pages/merch.astro
- Astro Starter Kit: Basics
- CLAUDE.md
- scripts
- pages/events.astro
- []
- distribution.astro
- cart.ts
- compilerOptions
- test/tsconfig.json
- Anvesha '26 — merch API
- sponsorships.astro
- smoke.mjs
- lib/admin.ts
- set-admin-password.mjs
- CatalogueHub
- ../assets/astro.svg
- ../assets/background.svg
- ../styles/theme.css

## God Nodes (most connected - your core abstractions)
1. `fetch()` - 30 edges
2. `json()` - 25 edges
3. `[]` - 20 edges
4. `bad()` - 20 edges
5. `requireAdmin()` - 15 edges
6. `collectItems()` - 12 edges
7. `directPay()` - 12 edges
8. `randomId()` - 11 edges
9. `compilerOptions` - 11 edges
10. `initMerchAdmin()` - 10 edges

## Surprising Connections (you probably didn't know these)
- `showDate()` --calls--> `pad()`  [INFERRED]
  src/pages/events.astro → src/pages/admin/merch.astro
- `initMerchAdmin()` --calls--> `goView()`  [INFERRED]
  src/pages/admin/merch.astro → src/pages/merch.astro
- `confirmDelete()` --calls--> `adminFetch()`  [EXTRACTED]
  src/pages/admin/merch.astro → src/lib/admin.ts
- `endDistribution()` --calls--> `adminFetch()`  [EXTRACTED]
  src/pages/admin/merch.astro → src/lib/admin.ts
- `onDelete()` --calls--> `adminFetch()`  [EXTRACTED]
  src/pages/admin/merch.astro → src/lib/admin.ts

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
Cohesion: 0.07
Nodes (78): adminCollect(), adminCreateMerch(), adminDeleteMerch(), adminDeleteOrder(), adminListMerch(), adminListOrders(), adminLogin(), adminLogout() (+70 more)

### Community 4 - "admin/merch.astro"
Cohesion: 0.08
Nodes (47): onCatalogueChange(), toPaise(), toRupees(), addDraft(), asDate(), collections(), confirmDelete(), copyLink() (+39 more)

### Community 6 - "pages/merch.astro"
Cohesion: 0.09
Nodes (27): pad(), addToBag(), animateSelect(), artHTML(), buildReceiptCard(), buildTree(), drawQR(), finishProgress() (+19 more)

### Community 7 - "Astro Starter Kit: Basics"
Cohesion: 0.40
Nodes (4): Astro Starter Kit: Basics, 🧞 Commands, 🚀 Project Structure, 👀 Want to learn more?

### Community 10 - "scripts"
Cohesion: 0.07
Nodes (26): @cloudflare/workers-types, @types/node, typescript, dependencies, qrcode-generator, devDependencies, @cloudflare/workers-types, @types/node (+18 more)

### Community 11 - "pages/events.astro"
Cohesion: 0.08
Nodes (10): ALL, applyRot(), dlDate, dlEdition, dlList, dlPos, endDrag(), pastTotal (+2 more)

### Community 12 - "[]"
Cohesion: 0.19
Nodes (3): ADMIN_NAV, [], hasTools

### Community 13 - "distribution.astro"
Cohesion: 0.19
Nodes (19): MOTES, collect(), escape(), initCounter(), initPage(), isDead(), itemsHtml(), lookup() (+11 more)

### Community 14 - "cart.ts"
Cohesion: 0.11
Nodes (27): CartLineInput, formatRupees(), MAX_LINES, MAX_QTY_PER_LINE, MerchRow, PricedCart, PricedLine, Size (+19 more)

### Community 15 - "compilerOptions"
Cohesion: 0.12
Nodes (15): ES2022, compilerOptions, allowImportingTsExtensions, lib, module, moduleResolution, noEmit, noUnusedLocals (+7 more)

### Community 16 - "test/tsconfig.json"
Cohesion: 0.20
Nodes (9): node, **/*.ts, ../tsconfig.json, compilerOptions, types, extends, include, @cloudflare/workers-types (+1 more)

### Community 17 - "Anvesha '26 — merch API"
Cohesion: 0.14
Nodes (13): Admin panel, Anvesha '26 — merch API, Confirmation email, Decisions worth knowing, Deploying for real, Endpoints, Known gaps, Live catalogue updates (+5 more)

### Community 21 - "smoke.mjs"
Cohesion: 0.25
Nodes (6): AUTH, post(), req(), sized, unsized, vars

### Community 22 - "lib/admin.ts"
Cohesion: 0.21
Nodes (11): initShell(), adminFetch(), AdminSession, clearSession(), getSession(), toLogin(), API, SITE (+3 more)

### Community 23 - "set-admin-password.mjs"
Cohesion: 0.33
Nodes (5): args, derive(), hash, salt, verify()

## Knowledge Gaps
- **117 isolated node(s):** `name`, `type`, `version`, `node`, `dev` (+112 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **6 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `text()` connect `cart.ts` to `expo.astro`, `[]`?**
  _High betweenness centrality (0.174) - this node is a cross-community bridge._
- **Why does `[]` connect `[]` to `pages/merch.astro`, `pages/events.astro`, `distribution.astro`, `expo.astro`, `outreach.astro`, `sponsorships.astro`, `lib/admin.ts`?**
  _High betweenness centrality (0.134) - this node is a cross-community bridge._
- **Why does `label()` connect `cart.ts` to `expo.astro`, `outreach.astro`?**
  _High betweenness centrality (0.070) - this node is a cross-community bridge._
- **What connects `name`, `type`, `version` to the rest of the system?**
  _117 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.07692307692307693 - nodes in this community are weakly interconnected._
- **Should `routes.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.07301231802911534 - nodes in this community are weakly interconnected._
- **Should `admin/merch.astro` be split into smaller, more focused modules?**
  _Cohesion score 0.08051948051948052 - nodes in this community are weakly interconnected._