# Graph Report - worker  (2026-08-14)

## Corpus Check
- 22 files · ~17,873 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 192 nodes · 408 edges · 11 communities (10 shown, 1 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `103e178d`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- admin.ts
- compilerOptions
- scripts
- cart.ts
- smoke.mjs
- routes.ts
- test/tsconfig.json
- email.ts
- Anvesha '26 — merch API
- set-admin-password.mjs
- CatalogueHub

## God Nodes (most connected - your core abstractions)
1. `fetch()` - 24 edges
2. `json()` - 20 edges
3. `bad()` - 19 edges
4. `directPay()` - 12 edges
5. `requireAdmin()` - 11 edges
6. `compilerOptions` - 11 edges
7. `adminLogin()` - 10 edges
8. `Anvesha '26 — merch API` - 10 edges
9. `scripts` - 9 edges
10. `checkout()` - 9 edges

## Surprising Connections (you probably didn't know these)
- `parse()` --calls--> `parseCart()`  [EXTRACTED]
  test/cart.test.ts → src/cart.ts
- `price()` --calls--> `priceCart()`  [EXTRACTED]
  test/cart.test.ts → src/cart.ts
- `adminLogin()` --calls--> `randomId()`  [EXTRACTED]
  src/admin.ts → src/util.ts
- `adminCreateMerch()` --calls--> `newMerchId()`  [EXTRACTED]
  src/admin.ts → src/util.ts
- `OrderEmail` --references--> `PricedLine`  [EXTRACTED]
  src/email.ts → src/cart.ts

## Import Cycles
- None detected.

## Communities (11 total, 1 thin omitted)

### Community 0 - "admin.ts"
Cohesion: 0.17
Nodes (37): adminCollect(), adminCreateMerch(), adminDeleteMerch(), adminDeleteOrder(), adminListMerch(), adminListOrders(), adminLogin(), adminLogout() (+29 more)

### Community 1 - "compilerOptions"
Cohesion: 0.12
Nodes (15): ES2022, compilerOptions, allowImportingTsExtensions, lib, module, moduleResolution, noEmit, noUnusedLocals (+7 more)

### Community 2 - "scripts"
Cohesion: 0.07
Nodes (26): @cloudflare/workers-types, dependencies, qrcode-generator, devDependencies, @cloudflare/workers-types, @types/node, typescript, wrangler (+18 more)

### Community 3 - "cart.ts"
Cohesion: 0.18
Nodes (15): CartLineInput, MAX_LINES, MAX_QTY_PER_LINE, MerchRow, parseCart(), priceCart(), PricedCart, Size (+7 more)

### Community 4 - "smoke.mjs"
Cohesion: 0.25
Nodes (6): AUTH, post(), req(), sized, unsized, vars

### Community 5 - "routes.ts"
Cohesion: 0.15
Nodes (21): Customer, parseCustomer(), PaymentEntity, paymentFromEvent(), RazorpayOrder, verifyWebhookSignature(), WebhookEvent, Cors (+13 more)

### Community 6 - "test/tsconfig.json"
Cohesion: 0.20
Nodes (9): node, **/*.ts, ../tsconfig.json, compilerOptions, types, extends, include, @cloudflare/workers-types (+1 more)

### Community 7 - "email.ts"
Cohesion: 0.19
Nodes (17): formatRupees(), PricedLine, esc(), html(), label(), OrderEmail, sendOrderEmail(), text() (+9 more)

### Community 8 - "Anvesha '26 — merch API"
Cohesion: 0.15
Nodes (12): Admin panel, Anvesha '26 — merch API, Confirmation email, Decisions worth knowing, Deploying for real, Endpoints, Known gaps, Live catalogue updates (+4 more)

### Community 9 - "set-admin-password.mjs"
Cohesion: 0.33
Nodes (5): args, derive(), hash, salt, verify()

## Knowledge Gaps
- **67 isolated node(s):** `name`, `private`, `type`, `node`, `dev` (+62 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **1 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `CatalogueHub` connect `CatalogueHub` to `admin.ts`?**
  _High betweenness centrality (0.023) - this node is a cross-community bridge._
- **Why does `bad()` connect `admin.ts` to `cart.ts`, `routes.ts`?**
  _High betweenness centrality (0.016) - this node is a cross-community bridge._
- **Why does `sendOrderEmail()` connect `email.ts` to `admin.ts`, `routes.ts`?**
  _High betweenness centrality (0.011) - this node is a cross-community bridge._
- **What connects `name`, `private`, `type` to the rest of the system?**
  _67 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `compilerOptions` be split into smaller, more focused modules?**
  _Cohesion score 0.125 - nodes in this community are weakly interconnected._
- **Should `scripts` be split into smaller, more focused modules?**
  _Cohesion score 0.07407407407407407 - nodes in this community are weakly interconnected._
- **Should `routes.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.1452991452991453 - nodes in this community are weakly interconnected._