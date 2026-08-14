# Graph Report - Anvesha-'26  (2026-08-13)

## Corpus Check
- 33 files · ~29,219 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 305 nodes · 445 edges · 25 communities (23 shown, 2 thin omitted)
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
- expo.astro
- outreach.astro
- sponsorships.astro
- smoke.mjs
- goView
- showDate

## God Nodes (most connected - your core abstractions)
1. `../layouts/SiteLayout.astro` - 14 edges
2. `fetch()` - 12 edges
3. `bad()` - 12 edges
4. `json()` - 11 edges
5. `compilerOptions` - 11 edges
6. `directPay()` - 10 edges
7. `scripts` - 9 edges
8. `notFound()` - 9 edges
9. `selectItem()` - 8 edges
10. `checkout()` - 8 edges

## Surprising Connections (you probably didn't know these)
- `parse()` --calls--> `parseCart()`  [EXTRACTED]
  worker/test/cart.test.ts → worker/src/cart.ts
- `price()` --calls--> `priceCart()`  [EXTRACTED]
  worker/test/cart.test.ts → worker/src/cart.ts
- `parseCart()` --calls--> `bad()`  [EXTRACTED]
  worker/src/cart.ts → worker/src/util.ts
- `checkout()` --calls--> `parseCart()`  [EXTRACTED]
  worker/src/routes.ts → worker/src/cart.ts
- `priceCart()` --calls--> `bad()`  [EXTRACTED]
  worker/src/cart.ts → worker/src/util.ts

## Import Cycles
- None detected.

## Communities (25 total, 2 thin omitted)

### Community 0 - "tsconfig.json"
Cohesion: 0.25
Nodes (7): **/*, astro/tsconfigs/strict, .astro/types.d.ts, dist, exclude, extends, include

### Community 1 - "dependencies"
Cohesion: 0.08
Nodes (23): astro, lucide-static, dependencies, astro, gsap, lucide-static, qrcode-generator, tailwindcss (+15 more)

### Community 2 - "package.json"
Cohesion: 0.15
Nodes (36): parseCart(), priceCart(), Customer, parseCustomer(), fetch(), createRazorpayOrder(), PaymentEntity, paymentFromEvent() (+28 more)

### Community 4 - "selectItem"
Cohesion: 0.28
Nodes (9): animateSelect(), buildTree(), openSheet(), renderMCats(), renderMGrid(), renderSizes(), selectItem(), setBranch() (+1 more)

### Community 6 - "merch.astro"
Cohesion: 0.04
Nodes (41): lucide-static/icons/minus.svg?raw, lucide-static/icons/notebook.svg?raw, lucide-static/icons/package.svg?raw, lucide-static/icons/plus.svg?raw, lucide-static/icons/shirt.svg?raw, lucide-static/icons/shopping-basket.svg?raw, lucide-static/icons/shopping-cart.svg?raw, cartCount2El (+33 more)

### Community 7 - "Astro Starter Kit: Basics"
Cohesion: 0.40
Nodes (4): Astro Starter Kit: Basics, 🧞 Commands, 🚀 Project Structure, 👀 Want to learn more?

### Community 10 - "../layouts/SiteLayout.astro"
Cohesion: 0.08
Nodes (23): @cloudflare/workers-types, @types/node, typescript, devDependencies, @cloudflare/workers-types, @types/node, typescript, wrangler (+15 more)

### Community 11 - "events.astro"
Cohesion: 0.08
Nodes (23): lucide-static/icons/brain.svg?raw, lucide-static/icons/chevron-left.svg?raw, lucide-static/icons/chevron-right.svg?raw, lucide-static/icons/code.svg?raw, lucide-static/icons/glass-water.svg?raw, lucide-static/icons/leaf.svg?raw, lucide-static/icons/mic-vocal.svg?raw, lucide-static/icons/microscope.svg?raw (+15 more)

### Community 12 - "outreach.astro"
Cohesion: 0.27
Nodes (9): lucide-static/icons/calendar-days.svg?raw, lucide-static/icons/flask-conical.svg?raw, lucide-static/icons/handshake.svg?raw, lucide-static/icons/house.svg?raw, lucide-static/icons/megaphone.svg?raw, lucide-static/icons/shopping-bag.svg?raw, ./Layout.astro, ../layouts/SiteLayout.astro (+1 more)

### Community 13 - "addToBag"
Cohesion: 0.40
Nodes (5): addToBag(), itemById(), openCart(), renderCart(), saveCart()

### Community 14 - "renderMGrid"
Cohesion: 0.20
Nodes (9): CartLineInput, MerchRow, PricedCart, PricedLine, Size, SIZES, CATALOGUE, parse() (+1 more)

### Community 15 - "compilerOptions"
Cohesion: 0.12
Nodes (15): ES2022, compilerOptions, allowImportingTsExtensions, lib, module, moduleResolution, noEmit, noUnusedLocals (+7 more)

### Community 16 - "tsconfig.json"
Cohesion: 0.20
Nodes (9): node, **/*.ts, ../tsconfig.json, compilerOptions, types, extends, include, @cloudflare/workers-types (+1 more)

### Community 17 - "Anvesha '26 — merch API"
Cohesion: 0.22
Nodes (8): Anvesha '26 — merch API, Decisions worth knowing, Deploying for real, Endpoints, Known gaps, Payment mode, `POST /api/checkout`, `POST /api/distributor/scan`

### Community 18 - "expo.astro"
Cohesion: 0.20
Nodes (9): lucide-static/icons/atom.svg?raw, lucide-static/icons/battery-charging.svg?raw, lucide-static/icons/bot.svg?raw, lucide-static/icons/clock.svg?raw, lucide-static/icons/cpu.svg?raw, lucide-static/icons/dna.svg?raw, lucide-static/icons/map-pin.svg?raw, lucide-static/icons/satellite.svg?raw (+1 more)

### Community 19 - "outreach.astro"
Cohesion: 0.22
Nodes (7): lucide-static/icons/arrow-right.svg?raw, lucide-static/icons/book-open.svg?raw, lucide-static/icons/bus.svg?raw, lucide-static/icons/graduation-cap.svg?raw, lucide-static/icons/hand-heart.svg?raw, lucide-static/icons/radio.svg?raw, lucide-static/icons/recycle.svg?raw

### Community 20 - "sponsorships.astro"
Cohesion: 0.22
Nodes (8): lucide-static/icons/camera.svg?raw, lucide-static/icons/check.svg?raw, lucide-static/icons/globe.svg?raw, lucide-static/icons/mail.svg?raw, lucide-static/icons/school.svg?raw, REACH, TIERS, lucide-static/icons/users.svg?raw

### Community 21 - "smoke.mjs"
Cohesion: 0.25
Nodes (6): AUTH, post(), req(), sized, unsized, vars

### Community 22 - "goView"
Cohesion: 0.33
Nodes (7): artHTML(), goView(), renderHero(), renderViews(), revealActiveItem(), scrollCentre(), syncViews()

### Community 23 - "showDate"
Cohesion: 0.67
Nodes (3): applyRot(), endDrag(), showDate()

## Knowledge Gaps
- **155 isolated node(s):** `name`, `type`, `version`, `node`, `dev` (+150 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `../layouts/SiteLayout.astro` connect `outreach.astro` to `merch.astro`, `events.astro`, `expo.astro`, `outreach.astro`, `sponsorships.astro`?**
  _High betweenness centrality (0.052) - this node is a cross-community bridge._
- **Why does `lucide-static/icons/arrow-right.svg?raw` connect `outreach.astro` to `merch.astro`, `events.astro`, `outreach.astro`, `expo.astro`, `sponsorships.astro`?**
  _High betweenness centrality (0.030) - this node is a cross-community bridge._
- **Why does `lucide-static/icons/x.svg?raw` connect `events.astro` to `merch.astro`?**
  _High betweenness centrality (0.009) - this node is a cross-community bridge._
- **What connects `name`, `type`, `version` to the rest of the system?**
  _155 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.08333333333333333 - nodes in this community are weakly interconnected._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.1461794019933555 - nodes in this community are weakly interconnected._
- **Should `merch.astro` be split into smaller, more focused modules?**
  _Cohesion score 0.0425531914893617 - nodes in this community are weakly interconnected._