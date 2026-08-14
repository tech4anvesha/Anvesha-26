# Graph Report - Anvesha-'26  (2026-08-13)

## Corpus Check
- 30 files · ~26,430 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 274 nodes · 404 edges · 18 communities (16 shown, 2 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 2 edges (avg confidence: 0.5)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `ebc36fc4`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- tsconfig.json
- dependencies
- package.json
- Welcome.astro
- selectItem
- merch.astro
- Astro Starter Kit: Basics
- CLAUDE.md
- ../layouts/SiteLayout.astro
- events.astro
- outreach.astro
- addToBag
- renderMGrid
- compilerOptions
- tsconfig.json
- Anvesha '26 — merch API

## God Nodes (most connected - your core abstractions)
1. `../layouts/SiteLayout.astro` - 14 edges
2. `fetch()` - 11 edges
3. `compilerOptions` - 11 edges
4. `json()` - 10 edges
5. `bad()` - 9 edges
6. `selectItem()` - 8 edges
7. `scripts` - 8 edges
8. `checkout()` - 8 edges
9. `distributorScan()` - 8 edges
10. `distributorCollect()` - 8 edges

## Surprising Connections (you probably didn't know these)
- `parseCart()` --calls--> `bad()`  [EXTRACTED]
  worker/src/cart.ts → worker/src/util.ts
- `checkout()` --calls--> `parseCart()`  [EXTRACTED]
  worker/src/routes.ts → worker/src/cart.ts
- `parse()` --calls--> `parseCart()`  [EXTRACTED]
  worker/test/cart.test.ts → worker/src/cart.ts
- `priceCart()` --calls--> `bad()`  [EXTRACTED]
  worker/src/cart.ts → worker/src/util.ts
- `checkout()` --calls--> `priceCart()`  [EXTRACTED]
  worker/src/routes.ts → worker/src/cart.ts

## Import Cycles
- None detected.

## Communities (18 total, 2 thin omitted)

### Community 0 - "tsconfig.json"
Cohesion: 0.25
Nodes (7): **/*, astro/tsconfigs/strict, .astro/types.d.ts, dist, exclude, extends, include

### Community 1 - "dependencies"
Cohesion: 0.09
Nodes (21): astro, lucide-static, dependencies, astro, gsap, lucide-static, tailwindcss, @tailwindcss/vite (+13 more)

### Community 2 - "package.json"
Cohesion: 0.12
Nodes (40): CartLineInput, MerchRow, parseCart(), priceCart(), PricedCart, PricedLine, Size, SIZES (+32 more)

### Community 4 - "selectItem"
Cohesion: 0.23
Nodes (12): animateSelect(), buildTree(), goView(), renderHero(), renderSizes(), renderViews(), revealActiveItem(), scrollCentre() (+4 more)

### Community 6 - "merch.astro"
Cohesion: 0.05
Nodes (36): lucide-static/icons/award.svg?raw, lucide-static/icons/bookmark.svg?raw, lucide-static/icons/box.svg?raw, lucide-static/icons/circle-dot.svg?raw, lucide-static/icons/coffee.svg?raw, lucide-static/icons/droplets.svg?raw, lucide-static/icons/file-text.svg?raw, lucide-static/icons/flip-horizontal.svg?raw (+28 more)

### Community 7 - "Astro Starter Kit: Basics"
Cohesion: 0.40
Nodes (4): Astro Starter Kit: Basics, 🧞 Commands, 🚀 Project Structure, 👀 Want to learn more?

### Community 10 - "../layouts/SiteLayout.astro"
Cohesion: 0.09
Nodes (22): @cloudflare/workers-types, @types/node, typescript, devDependencies, @cloudflare/workers-types, @types/node, typescript, wrangler (+14 more)

### Community 11 - "events.astro"
Cohesion: 0.06
Nodes (35): lucide-static/icons/atom.svg?raw, lucide-static/icons/battery-charging.svg?raw, lucide-static/icons/bot.svg?raw, lucide-static/icons/brain.svg?raw, lucide-static/icons/chevron-left.svg?raw, lucide-static/icons/chevron-right.svg?raw, lucide-static/icons/clock.svg?raw, lucide-static/icons/code.svg?raw (+27 more)

### Community 12 - "outreach.astro"
Cohesion: 0.09
Nodes (24): lucide-static/icons/arrow-right.svg?raw, lucide-static/icons/book-open.svg?raw, lucide-static/icons/bus.svg?raw, lucide-static/icons/calendar-days.svg?raw, lucide-static/icons/camera.svg?raw, lucide-static/icons/check.svg?raw, lucide-static/icons/flask-conical.svg?raw, lucide-static/icons/globe.svg?raw (+16 more)

### Community 13 - "addToBag"
Cohesion: 0.67
Nodes (3): addToBag(), openCart(), renderCart()

### Community 14 - "renderMGrid"
Cohesion: 1.00
Nodes (3): openSheet(), renderMCats(), renderMGrid()

### Community 15 - "compilerOptions"
Cohesion: 0.12
Nodes (15): ES2022, compilerOptions, allowImportingTsExtensions, lib, module, moduleResolution, noEmit, noUnusedLocals (+7 more)

### Community 16 - "tsconfig.json"
Cohesion: 0.20
Nodes (9): node, **/*.ts, ../tsconfig.json, compilerOptions, types, extends, include, @cloudflare/workers-types (+1 more)

### Community 17 - "Anvesha '26 — merch API"
Cohesion: 0.25
Nodes (7): Anvesha '26 — merch API, Decisions worth knowing, Deploying for real, Endpoints, Known gaps, `POST /api/checkout`, `POST /api/distributor/scan`

## Knowledge Gaps
- **134 isolated node(s):** `name`, `type`, `version`, `node`, `dev` (+129 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `../layouts/SiteLayout.astro` connect `outreach.astro` to `events.astro`, `merch.astro`?**
  _High betweenness centrality (0.045) - this node is a cross-community bridge._
- **Why does `lucide-static/icons/arrow-right.svg?raw` connect `outreach.astro` to `events.astro`, `merch.astro`?**
  _High betweenness centrality (0.021) - this node is a cross-community bridge._
- **Why does `lucide-static/icons/flask-conical.svg?raw` connect `outreach.astro` to `events.astro`, `merch.astro`?**
  _High betweenness centrality (0.005) - this node is a cross-community bridge._
- **What connects `name`, `type`, `version` to the rest of the system?**
  _134 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.09090909090909091 - nodes in this community are weakly interconnected._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.11790780141843972 - nodes in this community are weakly interconnected._
- **Should `merch.astro` be split into smaller, more focused modules?**
  _Cohesion score 0.05 - nodes in this community are weakly interconnected._