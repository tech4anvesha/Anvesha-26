# Graph Report - worker  (2026-08-13)

## Corpus Check
- 13 files · ~7,104 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 117 nodes · 198 edges · 9 communities
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `ebc36fc4`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- routes.ts
- compilerOptions
- scripts
- cart.ts
- smoke.mjs
- razorpay.ts
- tsconfig.json
- devDependencies
- Anvesha '26 — merch API

## God Nodes (most connected - your core abstractions)
1. `fetch()` - 11 edges
2. `compilerOptions` - 11 edges
3. `json()` - 10 edges
4. `scripts` - 9 edges
5. `bad()` - 9 edges
6. `checkout()` - 8 edges
7. `distributorScan()` - 8 edges
8. `distributorCollect()` - 8 edges
9. `notFound()` - 8 edges
10. `razorpayWebhook()` - 7 edges

## Surprising Connections (you probably didn't know these)
- `parse()` --calls--> `parseCart()`  [EXTRACTED]
  test/cart.test.ts → src/cart.ts
- `price()` --calls--> `priceCart()`  [EXTRACTED]
  test/cart.test.ts → src/cart.ts
- `parseCart()` --calls--> `bad()`  [EXTRACTED]
  src/cart.ts → src/util.ts
- `checkout()` --calls--> `parseCart()`  [EXTRACTED]
  src/routes.ts → src/cart.ts
- `priceCart()` --calls--> `bad()`  [EXTRACTED]
  src/cart.ts → src/util.ts

## Import Cycles
- None detected.

## Communities (9 total, 0 thin omitted)

### Community 0 - "routes.ts"
Cohesion: 0.30
Nodes (20): fetch(), checkout(), Cors, distributorCollect(), distributorScan(), getOrder(), listMerch(), merchImage() (+12 more)

### Community 1 - "compilerOptions"
Cohesion: 0.12
Nodes (15): ES2022, compilerOptions, allowImportingTsExtensions, lib, module, moduleResolution, noEmit, noUnusedLocals (+7 more)

### Community 2 - "scripts"
Cohesion: 0.13
Nodes (14): engines, node, name, private, scripts, db:local, db:remote, db:seed (+6 more)

### Community 3 - "cart.ts"
Cohesion: 0.21
Nodes (11): CartLineInput, MerchRow, parseCart(), priceCart(), PricedCart, PricedLine, Size, SIZES (+3 more)

### Community 4 - "smoke.mjs"
Cohesion: 0.20
Nodes (7): AUTH, event, post(), req(), sized, unsized, vars

### Community 5 - "razorpay.ts"
Cohesion: 0.20
Nodes (9): createRazorpayOrder(), PaymentEntity, paymentFromEvent(), RazorpayOrder, verifyWebhookSignature(), WebhookEvent, ApiError, Env (+1 more)

### Community 6 - "tsconfig.json"
Cohesion: 0.20
Nodes (9): node, **/*.ts, ../tsconfig.json, compilerOptions, types, extends, include, @cloudflare/workers-types (+1 more)

### Community 7 - "devDependencies"
Cohesion: 0.22
Nodes (9): @cloudflare/workers-types, devDependencies, @cloudflare/workers-types, @types/node, typescript, wrangler, @types/node, typescript (+1 more)

### Community 8 - "Anvesha '26 — merch API"
Cohesion: 0.25
Nodes (7): Anvesha '26 — merch API, Decisions worth knowing, Deploying for real, Endpoints, Known gaps, `POST /api/checkout`, `POST /api/distributor/scan`

## Knowledge Gaps
- **51 isolated node(s):** `name`, `private`, `type`, `node`, `dev` (+46 more)
  These have ≤1 connection - possible missing edges or undocumented components.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `devDependencies` connect `devDependencies` to `scripts`?**
  _High betweenness centrality (0.022) - this node is a cross-community bridge._
- **What connects `name`, `private`, `type` to the rest of the system?**
  _51 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `compilerOptions` be split into smaller, more focused modules?**
  _Cohesion score 0.125 - nodes in this community are weakly interconnected._
- **Should `scripts` be split into smaller, more focused modules?**
  _Cohesion score 0.13333333333333333 - nodes in this community are weakly interconnected._